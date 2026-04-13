exports.up = async function (knex) {
  // 多公众号管理表
  await knex.schema.createTable('wechat_accounts', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable();
    t.string('app_id', 128).notNullable();
    t.string('app_secret', 256).notNullable();
    t.string('nickname', 128).defaultTo('');
    t.text('avatar').defaultTo('');
    t.text('qrcode_url').defaultTo('');
    t.boolean('verified').defaultTo(false);
    t.enum('status', ['active', 'inactive', 'expired']).defaultTo('active');
    t.json('token_info').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.foreign('user_id').references('users.id').onDelete('CASCADE');
    t.index('user_id');
    t.index('app_id');
  });

  // 定时发布任务表
  await knex.schema.createTable('scheduled_posts', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable();
    t.integer('account_id').unsigned().notNullable();
    t.string('title', 512).notNullable();
    t.json('content').nullable();
    t.text('cover_image').defaultTo('');
    t.string('digest', 512).defaultTo('');
    t.timestamp('publish_at').notNullable();
    t.enum('status', ['pending', 'published', 'failed', 'cancelled']).defaultTo('pending');
    t.string('wechat_media_id', 255).defaultTo('');
    t.text('error_msg').defaultTo('');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.foreign('user_id').references('users.id').onDelete('CASCADE');
    t.foreign('account_id').references('wechat_accounts.id').onDelete('CASCADE');
    t.index('user_id');
    t.index('account_id');
    t.index('publish_at');
    t.index('status');
  });

  // 评论批注表
  await knex.schema.createTable('comments', (t) => {
    t.increments('id').primary();
    t.string('document_id', 64).notNullable();
    t.integer('user_id').unsigned().notNullable();
    t.integer('parent_id').unsigned().nullable();
    t.text('content').notNullable();
    t.enum('status', ['active', 'hidden', 'deleted']).defaultTo('active');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.foreign('document_id').references('documents.id').onDelete('CASCADE');
    t.foreign('user_id').references('users.id').onDelete('CASCADE');
    t.foreign('parent_id').references('comments.id').onDelete('CASCADE');
    t.index('document_id');
    t.index('user_id');
    t.index('parent_id');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('comments');
  await knex.schema.dropTableIfExists('scheduled_posts');
  await knex.schema.dropTableIfExists('wechat_accounts');
};
