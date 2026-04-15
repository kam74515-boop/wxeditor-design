module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  // Run tests serially to avoid token collision from change-password test
  maxWorkers: 1,
};
