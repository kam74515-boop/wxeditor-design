/**
 * Seed: 超级管理员账户
 * Email: admin@wxeditor.com
 * Password: admin123
 */

const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  // 检查是否已存在
  const existing = await knex('users').where({ email: 'admin@wxeditor.com' }).first();
  if (existing) {
    console.log('Admin user already exists, skipping...');
    return;
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);

  await knex('users').insert({
    username: 'admin',
    email: 'admin@wxeditor.com',
    password: hashedPassword,
    nickname: '超级管理员',
    role: 'superadmin',
    status: 'active',
    avatar: '',
    settings: JSON.stringify({
      membership: { type: 'enterprise', isActive: true },
    }),
  });

  console.log('Admin user created: admin@wxeditor.com / admin123');
};
