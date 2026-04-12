/**
 * 数据库配置 — Knex.js 适配层
 *
 * 同时导出:
 * - knex: Knex 查询构造器实例（新代码使用）
 * - db: better-sqlite3 原始连接（兼容旧代码）
 */
const knexLib = require('knex');
const path = require('path');
const fs = require('fs');

const env = process.env.NODE_ENV || 'development';
const knexConfig = require('./knexfile');
const config = knexConfig[env] || knexConfig.development;

// 确保 data 目录存在（SQLite 模式）
if (config.client === 'better-sqlite3' && config.connection?.filename) {
  const dataDir = path.dirname(config.connection.filename);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// 创建 Knex 实例
const knex = knexLib(config);

// 兼容旧代码：如果是 SQLite，同时导出原始 better-sqlite3 连接
let db = null;
if (config.client === 'better-sqlite3') {
  try {
    const Database = require('better-sqlite3');
    const dbPath = config.connection?.filename || path.join(__dirname, '..', 'data', 'wxeditor.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = OFF'); // 关闭外键约束，因为我们现在使用了 MongoDB 存储用户，author_id 是一个不存在于 SQLite users 表的字符串
  } catch (err) {
    console.warn('⚠️ better-sqlite3 初始化失败，旧接口不可用:', err.message);
  }
}

/**
 * 运行数据库迁移
 */
async function runMigrations() {
  try {
    // 强制释放可能残留的迁移锁
    try {
      await knex.migrate.forceFreeMigrationsLock();
    } catch (_) {
      // 忽略 — 锁表可能不存在
    }
    const [batch, log] = await knex.migrate.latest();
    if (log.length > 0) {
      console.log(`✅ 数据库迁移完成 (batch ${batch}):`);
      log.forEach((f) => console.log(`   - ${path.basename(f)}`));
    } else {
      console.log('✅ 数据库已是最新状态');
    }
  } catch (err) {
    console.error('❌ 数据库迁移失败:', err.message);
    // 如果迁移失败（表已存在等），使用旧的 initDB 作为 fallback
    if (db) {
      console.log('🔄 使用旧的 SQLite 初始化作为 fallback...');
      initDBLegacy();
    }
  }
}

/**
 * 旧的 SQLite 初始化（兼容 fallback）
 */
function initDBLegacy() {
  if (!db) return;

  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      role TEXT DEFAULT 'user' CHECK(role IN ('user','vip','admin','superadmin')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','suspended','banned')),
      settings TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 文档表
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '未命名文档',
      content TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      author_id INTEGER,
      cover_image TEXT DEFAULT '',
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','published','archived','deleted')),
      category TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      version INTEGER DEFAULT 1,
      word_count INTEGER DEFAULT 0,
      wechat_media_id TEXT DEFAULT '',
      wechat_url TEXT DEFAULT '',
      wechat_synced_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  // AI 配置表（新增）
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      api_key TEXT NOT NULL,
      base_url TEXT NOT NULL,
      model TEXT NOT NULL,
      temperature REAL DEFAULT 0.7,
      max_tokens INTEGER DEFAULT 4096,
      top_p REAL DEFAULT 0.95,
      is_active INTEGER DEFAULT 0,
      status TEXT DEFAULT 'standby' CHECK(status IN ('connected','standby','error')),
      extra_params TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 系统设置表（新增）
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT DEFAULT '',
      "group" TEXT DEFAULT 'general',
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ SQLite 数据库初始化完成 (legacy)');
}

// 创建默认管理员账号（如果不存在）
async function seedDefaultAdmin() {
  try {
    const bcrypt = require('bcryptjs');
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    if (!existing) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('123456', salt);
      db.prepare(`
        INSERT INTO users (username, email, password, nickname, role, status, settings)
        VALUES (?, ?, ?, ?, 'admin', 'active', '{}')
      `).run('admin', 'admin@wxeditor.com', hashedPassword, '管理员');
      console.log('✅ 默认管理员账号已创建 (admin / 123456)');
    }
  } catch (err) {
    console.warn('⚠️ 创建默认管理员失败:', err.message);
  }
}

// 启动时运行迁移 + 种子
runMigrations().then(() => seedDefaultAdmin());

module.exports = db;
module.exports.db = db;
module.exports.knex = knex;
module.exports.runMigrations = runMigrations;
