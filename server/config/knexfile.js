/**
 * Knex.js 多环境数据库配置
 * 
 * 开发环境使用 SQLite（零配置），生产环境支持 PostgreSQL / MySQL
 * 通过 DB_CLIENT 环境变量切换：sqlite3 | pg | mysql2
 */
const path = require('path');

module.exports = {
  // 开发环境 — SQLite（默认）
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: path.join(__dirname, '..', 'data', 'wxeditor.db'),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, '..', 'migrations'),
    },
    pool: {
      afterCreate: (conn, cb) => {
        conn.pragma('journal_mode = WAL');
        conn.pragma('foreign_keys = ON');
        cb();
      },
    },
  },

  // 生产环境 — PostgreSQL（推荐）
  production: {
    client: process.env.DB_CLIENT || 'pg',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'wxeditor',
      user: process.env.DB_USER || 'wxeditor',
      password: process.env.DB_PASSWORD || '',
      // MySQL 需要 charset
      ...(process.env.DB_CLIENT === 'mysql2' ? { charset: 'utf8mb4' } : {}),
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: path.join(__dirname, '..', 'migrations'),
    },
  },

  // 测试环境 — SQLite 内存数据库
  test: {
    client: 'better-sqlite3',
    connection: ':memory:',
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, '..', 'migrations'),
    },
  },
};
