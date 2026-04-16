exports.up = async function (knex) {
  await knex.raw("SET sql_require_primary_key = 0");

  await knex.schema.createTable('ai_models', (t) => {
    t.increments('id').primary();
    t.string('model_id', 128).notNullable().comment('模型标识，如 qwen3.5-plus');
    t.string('display_name', 128).notNullable().comment('前端显示名称');
    t.integer('supplier_id').unsigned().notNullable().comment('关联的供应商 ID');
    t.boolean('visible').defaultTo(false).comment('是否在前端显示');
    t.decimal('temperature', 3, 2).defaultTo(0.7);
    t.decimal('top_p', 3, 2).defaultTo(0.95);
    t.integer('max_tokens').nullable();
    t.integer('sort_order').defaultTo(0).comment('排序序号');
    t.integer('fallback_model_id').unsigned().nullable().comment('降级模型 ID');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.unique(['model_id', 'supplier_id']);
    t.foreign('supplier_id').references('ai_configs.id').onDelete('CASCADE');
    t.foreign('fallback_model_id').references('ai_models.id').onDelete('SET NULL');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('ai_models');
};
