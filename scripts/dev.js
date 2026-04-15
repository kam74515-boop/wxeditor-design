const { spawn } = require('child_process');
const path = require('path');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const rootDir = path.resolve(__dirname, '..');

function prefixStream(stream, label) {
  let buffer = '';

  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line) continue;
      process.stdout.write(`[${label}] ${line}\n`);
    }
  });

  stream.on('end', () => {
    if (buffer) {
      process.stdout.write(`[${label}] ${buffer}\n`);
      buffer = '';
    }
  });
}

function startService(label, cwd) {
  const child = spawn(npmCmd, ['run', 'dev'], {
    cwd,
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  prefixStream(child.stdout, label);
  prefixStream(child.stderr, `${label}:err`);

  return child;
}

const services = [
  { label: 'server', cwd: path.join(rootDir, 'server') },
  { label: 'web', cwd: path.join(rootDir, 'web') },
];

const children = services.map(({ label, cwd }) => ({
  label,
  child: startService(label, cwd),
}));

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const { child } of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

for (const { label, child } of children) {
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;

    const detail = signal
      ? `${label} exited via signal ${signal}`
      : `${label} exited with code ${code}`;

    process.stderr.write(`[dev] ${detail}\n`);
    shutdown('SIGTERM');
    process.exitCode = code || 1;
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
