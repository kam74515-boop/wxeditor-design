exports.up = async function (knex) {
  await knex.raw("SET sql_require_primary_key = 0");

  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('username', 128).notNullable().unique();
    t.string('email', 255).notNullable().unique();
    t.string('password', 255).notNullable();
    t.string('nickname', 128).defaultTo('');
    t.text('avatar').defaultTo('');
    t.enum('role', ['user', 'vip', 'admin', 'superadmin']).defaultTo('user');
    t.enum('status', ['active', 'inactive', 'suspended', 'banned']).defaultTo('active');
    t.json('settings');
    t.integer('login_attempts').defaultTo(0);
    t.timestamp('lock_until').nullable();
    t.timestamp('password_changed_at').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('roles', (t) => {
    t.increments('id').primary();
    t.string('name', 64).notNullable().unique();
    t.string('description', 255);
    t.json('permissions').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('permissions', (t) => {
    t.increments('id').primary();
    t.string('resource', 64).notNullable();
    t.string('action', 32).notNullable();
    t.string('description', 255);
    t.unique(['resource', 'action']);
  });

  await knex.schema.createTable('user_roles', (t) => {
    t.integer('user_id').unsigned().notNullable();
    t.integer('role_id').unsigned().notNullable();
    t.primary(['user_id', 'role_id']);
    t.foreign('user_id').references('users.id').onDelete('CASCADE');
    t.foreign('role_id').references('roles.id').onDelete('CASCADE');
  });

  await knex.schema.createTable('documents', (t) => {
    t.string('id', 64).primary();
    t.string('title', 512).notNullable().defaultTo('未命名文档');
    t.text('content').defaultTo('');
    t.text('summary').defaultTo('');
    t.integer('author_id').unsigned();
    t.text('cover_image').defaultTo('');
    t.enum('status', ['draft', 'published', 'archived', 'deleted']).defaultTo('draft');
    t.enum('visibility', ['public', 'private', 'members_only', 'vip_only']).defaultTo('private');
    t.string('category', 255).defaultTo('');
    t.json('tags');
    t.integer('version').defaultTo(1);
    t.integer('word_count').defaultTo(0);
    t.string('wechat_media_id', 255).defaultTo('');
    t.text('wechat_url').defaultTo('');
    t.timestamp('wechat_synced_at').nullable();
    t.timestamp('published_at').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.foreign('author_id').references('users.id').onDelete('SET NULL');
    t.index('author_id');
    t.index(['status', 'visibility']);
    t.index('category');
  });

  await knex.schema.createTable('document_versions', (t) => {
    t.increments('id').primary();
    t.string('document_id', 64).notNullable();
    t.integer('version').notNullable();
    t.text('content').defaultTo('');
    t.integer('changed_by').unsigned();
    t.string('change_summary', 255).defaultTo('');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.foreign('document_id').references('documents.id').onDelete('CASCADE');
    t.foreign('changed_by').references('users.id').onDelete('SET NULL');
    t.index('document_id');
  });

  await knex.schema.createTable('collaborators', (t) => {
    t.increments('id').primary();
    t.string('document_id', 64).notNullable();
    t.integer('user_id').unsigned().notNullable();
    t.enum('role', ['viewer', 'editor', 'admin']).defaultTo('viewer');
    t.timestamp('added_at').defaultTo(knex.fn.now());
    t.foreign('document_id').references('documents.id').onDelete('CASCADE');
    t.foreign('user_id').references('users.id').onDelete('CASCADE');
    t.unique(['document_id', 'user_id']);
    t.index('user_id');
  });

  await knex.schema.createTable('ai_chats', (t) => {
    t.increments('id').primary();
    t.string('document_id', 64).nullable();
    t.integer('user_id').unsigned();
    t.enum('role', ['user', 'assistant', 'system']).notNullable();
    t.text('content').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.foreign('document_id').references('documents.id').onDelete('SET NULL');
    t.foreign('user_id').references('users.id').onDelete('SET NULL');
    t.index('document_id');
    t.index('user_id');
  });

  await knex.schema.createTable('templates', (t) => {
    t.increments('id').primary();
    t.string('name', 255).notNullable();
    t.text('description').defaultTo('');
    t.string('category', 255).defaultTo('general');
    t.text('content').notNullable();
    t.text('preview_image').defaultTo('');
    t.json('tags');
    t.boolean('is_public').defaultTo(false);
    t.integer('use_count').defaultTo(0);
    t.integer('author_id').unsigned();
    t.enum('status', ['active', 'inactive', 'deleted']).defaultTo('active');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.foreign('author_id').references('users.id').onDelete('SET NULL');
    t.index('author_id');
    t.index('status');
  });

  await knex.schema.createTable('materials', (t) => {
    t.increments('id').primary();
    t.string('filename', 255).notNullable();
    t.string('original_name', 255).notNullable();
    t.enum('file_type', ['image', 'video', 'audio', 'file']).notNullable();
    t.integer('file_size').defaultTo(0);
    t.text('file_path').notNullable();
    t.text('url').notNullable();
    t.string('mime_type', 255).defaultTo('');
    t.integer('width').defaultTo(0);
    t.integer('height').defaultTo(0);
    t.integer('duration').defaultTo(0);
    t.text('thumbnail').defaultTo('');
    t.integer('uploader_id').unsigned();
    t.integer('folder_id').unsigned().nullable();
    t.boolean('is_public').defaultTo(false);
    t.json('metadata');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.foreign('uploader_id').references('users.id').onDelete('SET NULL');
    t.index('uploader_id');
    t.index('folder_id');
  });

  await knex.schema.createTable('material_folders', (t) => {
    t.increments('id').primary();
    t.string('name', 255).notNullable();
    t.integer('parent_id').defaultTo(0);
    t.integer('user_id').unsigned().notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.foreign('user_id').references('users.id').onDelete('CASCADE');
    t.index('user_id');
  });

  await knex.schema.createTable('article_groups', (t) => {
    t.string('id', 255).primary();
    t.string('title', 255).notNullable().defaultTo('未命名图文');
    t.text('description').defaultTo('');
    t.text('cover_image').defaultTo('');
    t.integer('article_count').defaultTo(0);
    t.integer('author_id').unsigned();
    t.enum('status', ['draft', 'published', 'deleted']).defaultTo('draft');
    t.string('wechat_media_id', 255).defaultTo('');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.foreign('author_id').references('users.id').onDelete('SET NULL');
    t.index('author_id');
  });

  await knex.schema.createTable('group_articles', (t) => {
    t.increments('id').primary();
    t.string('group_id', 255).notNullable();
    t.string('document_id', 64).notNullable();
    t.integer('sort_order').defaultTo(0);
    t.timestamp('added_at').defaultTo(knex.fn.now());
    t.foreign('group_id').references('article_groups.id').onDelete('CASCADE');
    t.foreign('document_id').references('documents.id').onDelete('CASCADE');
    t.index('group_id');
  });

  await knex.schema.createTable('teams', (t) => {
    t.string('id', 64).primary();
    t.string('name', 255).notNullable();
    t.integer('owner_id').unsigned().notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.foreign('owner_id').references('users.id').onDelete('CASCADE');
    t.index('owner_id');
  });

  await knex.schema.createTable('team_members', (t) => {
    t.increments('id').primary();
    t.string('team_id', 64).notNullable();
    t.integer('user_id').unsigned().notNullable();
    t.enum('role', ['owner', 'admin', 'member']).defaultTo('member');
    t.timestamp('joined_at').defaultTo(knex.fn.now());
    t.foreign('team_id').references('teams.id').onDelete('CASCADE');
    t.foreign('user_id').references('users.id').onDelete('CASCADE');
    t.unique(['team_id', 'user_id']);
    t.index('user_id');
  });

  await knex.schema.createTable('team_invitations', (t) => {
    t.string('id', 255).primary();
    t.string('team_id', 64).notNullable();
    t.integer('inviter_id').unsigned().notNullable();
    t.string('email', 255).notNullable();
    t.enum('role', ['admin', 'member']).defaultTo('member');
    t.enum('status', ['pending', 'accepted', 'rejected', 'expired']).defaultTo('pending');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.foreign('team_id').references('teams.id').onDelete('CASCADE');
    t.foreign('inviter_id').references('users.id');
    t.unique(['team_id', 'email']);
  });

  await knex.schema.createTable('orders', (t) => {
    t.string('id', 64).primary();
    t.integer('user_id').unsigned().notNullable();
    t.enum('membership_type', ['basic', 'pro', 'enterprise']).notNullable();
    t.enum('period', ['monthly', 'quarterly', 'yearly']).notNullable();
    t.decimal('amount', 10, 2).notNullable();
    t.decimal('original_amount', 10, 2).notNullable();
    t.decimal('discount', 10, 2).defaultTo(0);
    t.string('discount_code', 64).nullable();
    t.enum('payment_method', ['alipay', 'wechat']).notNullable();
    t.enum('payment_status', ['pending', 'paid', 'failed', 'refunded']).defaultTo('pending');
    t.string('payment_transaction_id', 255).defaultTo('');
    t.timestamp('paid_at').nullable();
    t.text('failed_reason').defaultTo('');
    t.timestamp('refunded_at').nullable();
    t.decimal('refund_amount', 10, 2).defaultTo(0);
    t.text('refund_reason').defaultTo('');
    t.timestamp('membership_start_date').nullable();
    t.timestamp('membership_end_date').nullable();
    t.boolean('is_auto_renew').defaultTo(false);
    t.string('device_ip', 45).defaultTo('');
    t.text('device_user_agent').defaultTo('');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.foreign('user_id').references('users.id').onDelete('CASCADE');
    t.index('user_id');
    t.index('payment_status');
  });

  await knex.schema.createTable('activation_codes', (t) => {
    t.increments('id').primary();
    t.string('code', 64).notNullable().unique();
    t.enum('membership_type', ['basic', 'pro', 'enterprise']).notNullable();
    t.integer('days').notNullable();
    t.enum('status', ['active', 'used', 'expired']).defaultTo('active');
    t.integer('used_by').unsigned().nullable();
    t.timestamp('used_at').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.foreign('used_by').references('users.id').onDelete('SET NULL');
    t.index('code');
  });

  await knex.schema.createTable('ai_configs', (t) => {
    t.increments('id').primary();
    t.string('name', 255).notNullable();
    t.string('provider', 255).notNullable();
    t.text('api_key').notNullable();
    t.text('base_url').notNullable();
    t.string('model', 255).notNullable();
    t.decimal('temperature', 3, 2).defaultTo(0.7);
    t.integer('max_tokens').defaultTo(4096);
    t.decimal('top_p', 3, 2).defaultTo(0.95);
    t.boolean('is_active').defaultTo(false);
    t.enum('status', ['connected', 'standby', 'error']).defaultTo('standby');
    t.json('extra_params');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('system_settings', (t) => {
    t.increments('id').primary();
    t.string('key', 255).notNullable().unique();
    t.text('value').defaultTo('');
    t.string('group', 255).defaultTo('general');
    t.text('description').defaultTo('');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('analytics_events', (t) => {
    t.bigIncrements('id').primary();
    t.integer('user_id').unsigned().nullable();
    t.string('event_name', 128).notNullable();
    t.json('properties');
    t.string('page', 256);
    t.string('ip', 45);
    t.string('user_agent', 512);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.foreign('user_id').references('users.id').onDelete('SET NULL');
    t.index('user_id');
    t.index('event_name');
    t.index('created_at');
  });
};

exports.down = async function (knex) {
  const tables = [
    'analytics_events', 'system_settings', 'ai_configs', 'activation_codes',
    'orders', 'team_invitations', 'team_members', 'teams',
    'group_articles', 'article_groups', 'material_folders', 'materials',
    'templates', 'ai_chats', 'collaborators', 'document_versions',
    'documents', 'user_roles', 'permissions', 'roles', 'users'
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
