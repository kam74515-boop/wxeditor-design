/**
 * 初始数据库迁移 — 使用 hasTable 逐表检查，兼容已有数据库
 * 
 * 对于每张表，先检查是否已存在，只创建不存在的表。
 * 已存在的表不做任何修改，避免索引冲突。
 */
exports.up = async function (knex) {
  // 辅助函数：仅在表不存在时创建
  async function createIfNotExists(tableName, builder) {
    const exists = await knex.schema.hasTable(tableName);
    if (!exists) {
      await knex.schema.createTable(tableName, builder);
      console.log(`   ✅ 创建表: ${tableName}`);
    } else {
      console.log(`   ⏭️  跳过已有表: ${tableName}`);
    }
  }

  // 用户表
  await createIfNotExists('users', (t) => {
    t.increments('id').primary();
    t.string('username').unique().notNullable();
    t.string('email').unique().notNullable();
    t.string('password').notNullable();
    t.string('nickname').defaultTo('');
    t.string('avatar').defaultTo('');
    t.enum('role', ['user', 'vip', 'admin', 'superadmin']).defaultTo('user');
    t.enum('status', ['active', 'inactive', 'suspended', 'banned']).defaultTo('active');
    t.json('settings').defaultTo('{}');
    t.timestamps(true, true);
  });

  // 文档表
  await createIfNotExists('documents', (t) => {
    t.string('id').primary();
    t.string('title').notNullable().defaultTo('未命名文档');
    t.text('content').defaultTo('');
    t.text('summary').defaultTo('');
    t.integer('author_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    t.string('cover_image').defaultTo('');
    t.enum('status', ['draft', 'published', 'archived', 'deleted']).defaultTo('draft');
    t.string('category').defaultTo('');
    t.json('tags').defaultTo('[]');
    t.integer('version').defaultTo(1);
    t.integer('word_count').defaultTo(0);
    t.string('wechat_media_id').defaultTo('');
    t.string('wechat_url').defaultTo('');
    t.timestamp('wechat_synced_at').nullable();
    t.timestamps(true, true);
  });

  // 文档版本历史表
  await createIfNotExists('document_versions', (t) => {
    t.increments('id').primary();
    t.string('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
    t.integer('version').notNullable();
    t.text('content').defaultTo('');
    t.integer('changed_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    t.string('change_summary').defaultTo('');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 协作者表
  await createIfNotExists('collaborators', (t) => {
    t.increments('id').primary();
    t.string('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enum('role', ['viewer', 'editor', 'admin']).defaultTo('viewer');
    t.timestamp('added_at').defaultTo(knex.fn.now());
    t.unique(['document_id', 'user_id']);
  });

  // AI 聊天记录表
  await createIfNotExists('ai_chats', (t) => {
    t.increments('id').primary();
    t.string('document_id').nullable();
    t.integer('user_id').unsigned().nullable();
    t.enum('role', ['user', 'assistant', 'system']).notNullable();
    t.text('content').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 模板表
  await createIfNotExists('templates', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.text('description').defaultTo('');
    t.string('category').defaultTo('general');
    t.text('content').notNullable();
    t.string('preview_image').defaultTo('');
    t.json('tags').defaultTo('[]');
    t.boolean('is_public').defaultTo(false);
    t.integer('use_count').defaultTo(0);
    t.integer('author_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    t.enum('status', ['active', 'inactive', 'deleted']).defaultTo('active');
    t.timestamps(true, true);
  });

  // 素材表
  await createIfNotExists('materials', (t) => {
    t.increments('id').primary();
    t.string('filename').notNullable();
    t.string('original_name').notNullable();
    t.enum('file_type', ['image', 'video', 'audio', 'file']).notNullable();
    t.integer('file_size').defaultTo(0);
    t.string('file_path').notNullable();
    t.string('url').notNullable();
    t.string('mime_type').defaultTo('');
    t.integer('width').defaultTo(0);
    t.integer('height').defaultTo(0);
    t.integer('duration').defaultTo(0);
    t.string('thumbnail').defaultTo('');
    t.integer('uploader_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    t.integer('folder_id').unsigned().nullable();
    t.boolean('is_public').defaultTo(false);
    t.json('metadata').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 素材文件夹表
  await createIfNotExists('material_folders', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.integer('parent_id').defaultTo(0);
    t.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 图文消息组表
  await createIfNotExists('article_groups', (t) => {
    t.string('id').primary();
    t.string('title').notNullable().defaultTo('未命名图文');
    t.text('description').defaultTo('');
    t.string('cover_image').defaultTo('');
    t.integer('article_count').defaultTo(0);
    t.integer('author_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    t.enum('status', ['draft', 'published', 'deleted']).defaultTo('draft');
    t.string('wechat_media_id').defaultTo('');
    t.timestamps(true, true);
  });

  // 图文-文章关联表
  await createIfNotExists('group_articles', (t) => {
    t.increments('id').primary();
    t.string('group_id').notNullable().references('id').inTable('article_groups').onDelete('CASCADE');
    t.string('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
    t.integer('sort_order').defaultTo(0);
    t.timestamp('added_at').defaultTo(knex.fn.now());
  });

  // 团队表
  await createIfNotExists('teams', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.text('description').defaultTo('');
    t.string('avatar').defaultTo('');
    t.integer('owner_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('max_members').defaultTo(10);
    t.timestamps(true, true);
  });

  // 团队成员表
  await createIfNotExists('team_members', (t) => {
    t.increments('id').primary();
    t.integer('team_id').unsigned().notNullable().references('id').inTable('teams').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enum('role', ['owner', 'admin', 'member']).defaultTo('member');
    t.timestamp('joined_at').defaultTo(knex.fn.now());
    t.unique(['team_id', 'user_id']);
  });

  // 团队邀请表
  await createIfNotExists('team_invitations', (t) => {
    t.increments('id').primary();
    t.integer('team_id').unsigned().notNullable().references('id').inTable('teams').onDelete('CASCADE');
    t.integer('inviter_id').unsigned().notNullable().references('id').inTable('users');
    t.string('invitee_email').notNullable();
    t.integer('invitee_id').unsigned().nullable().references('id').inTable('users');
    t.enum('status', ['pending', 'accepted', 'rejected', 'expired']).defaultTo('pending');
    t.string('token').unique();
    t.timestamp('expires_at').nullable();
    t.timestamps(true, true);
  });

  // 会员订单表
  await createIfNotExists('orders', (t) => {
    t.string('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('plan').notNullable();
    t.string('billing_cycle').defaultTo('monthly');
    t.decimal('amount', 10, 2).notNullable();
    t.decimal('discount', 10, 2).defaultTo(0);
    t.decimal('paid_amount', 10, 2).notNullable();
    t.string('payment_method').defaultTo('');
    t.string('payment_id').defaultTo('');
    t.enum('status', ['pending', 'paid', 'cancelled', 'refunded']).defaultTo('pending');
    t.timestamp('paid_at').nullable();
    t.timestamp('expires_at').nullable();
    t.timestamps(true, true);
  });

  // AI API 配置表（新增）
  await createIfNotExists('ai_configs', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('provider').notNullable();
    t.string('api_key').notNullable();
    t.string('base_url').notNullable();
    t.string('model').notNullable();
    t.decimal('temperature', 3, 2).defaultTo(0.7);
    t.integer('max_tokens').defaultTo(4096);
    t.decimal('top_p', 3, 2).defaultTo(0.95);
    t.boolean('is_active').defaultTo(false);
    t.enum('status', ['connected', 'standby', 'error']).defaultTo('standby');
    t.json('extra_params').defaultTo('{}');
    t.timestamps(true, true);
  });

  // 系统设置表（新增）
  await createIfNotExists('system_settings', (t) => {
    t.increments('id').primary();
    t.string('key').unique().notNullable();
    t.text('value').defaultTo('');
    t.string('group').defaultTo('general');
    t.text('description').defaultTo('');
    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('system_settings')
    .dropTableIfExists('ai_configs')
    .dropTableIfExists('orders')
    .dropTableIfExists('team_invitations')
    .dropTableIfExists('team_members')
    .dropTableIfExists('teams')
    .dropTableIfExists('group_articles')
    .dropTableIfExists('article_groups')
    .dropTableIfExists('material_folders')
    .dropTableIfExists('materials')
    .dropTableIfExists('templates')
    .dropTableIfExists('ai_chats')
    .dropTableIfExists('collaborators')
    .dropTableIfExists('document_versions')
    .dropTableIfExists('documents')
    .dropTableIfExists('users');
};
