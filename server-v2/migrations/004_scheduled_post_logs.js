exports.up = async function (knex) {
  // Add repeat_type and 'scheduled' status support to scheduled_posts
  await knex.schema.alterTable('scheduled_posts', (t) => {
    t.enum('repeat_type', ['once', 'daily', 'weekly']).defaultTo('once');
  });

  // Update existing status enum to include 'scheduled' and 'publishing'
  // Note: MySQL ENUM alteration is complex; we handle this via raw query
  await knex.raw(`
    ALTER TABLE scheduled_posts
    MODIFY COLUMN status ENUM('pending','scheduled','publishing','published','failed','cancelled')
    NOT NULL DEFAULT 'pending'
  `);

  // 定时发布执行日志表
  await knex.schema.createTable('scheduled_post_logs', (t) => {
    t.increments('id').primary();
    t.integer('post_id').unsigned().notNullable();
    t.enum('status', ['publishing', 'published', 'failed']).notNullable();
    t.text('wechat_response').nullable();
    t.integer('duration_ms').nullable();
    t.text('error_message').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.foreign('post_id').references('scheduled_posts.id').onDelete('CASCADE');
    t.index('post_id');
    t.index('status');
    t.index('created_at');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('scheduled_post_logs');

  await knex.raw(`
    ALTER TABLE scheduled_posts
    MODIFY COLUMN status ENUM('pending','published','failed','cancelled')
    NOT NULL DEFAULT 'pending'
  `);

  await knex.schema.alterTable('scheduled_posts', (t) => {
    t.dropColumn('repeat_type');
  });
};
