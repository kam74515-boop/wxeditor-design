exports.up = async function(knex) {
  // 图文批次表
  await knex.schema.createTable('article_batches', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable();
    t.integer('account_id').unsigned().nullable(); // 关联公众号
    t.string('title', 512).notNullable();
    t.enum('status', ['draft', 'ready', 'published', 'failed']).defaultTo('draft');
    t.timestamp('published_at').nullable();
    t.string('wechat_media_id', 255).defaultTo('');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.foreign('user_id').references('users.id').onDelete('CASCADE');
    t.foreign('account_id').references('wechat_accounts.id').onDelete('SET NULL');
  });

  // 批次内文章表
  await knex.schema.createTable('batch_articles', (t) => {
    t.increments('id').primary();
    t.integer('batch_id').unsigned().notNullable();
    t.integer('position').notNullable(); // 排序位置, 1=头条
    t.string('title', 512).notNullable();
    t.text('content').nullable();
    t.text('cover_image').defaultTo('');
    t.string('digest', 512).defaultTo('');
    t.string('author', 128).defaultTo('');
    t.integer('word_count').defaultTo(0);
    t.string('content_source_url', 512).defaultTo('');
    t.boolean('show_cover_pic').defaultTo(true);
    t.boolean('need_open_comment').defaultTo(false);
    t.boolean('only_fans_can_comment').defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.foreign('batch_id').references('article_batches.id').onDelete('CASCADE');
    t.index('batch_id');
    t.index('position');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('batch_articles');
  await knex.schema.dropTableIfExists('article_batches');
};
