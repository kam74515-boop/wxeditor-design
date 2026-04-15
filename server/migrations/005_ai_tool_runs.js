exports.up = async function up(knex) {
  await knex.schema.createTable('ai_tool_runs', (t) => {
    t.increments('id').primary();
    t.string('document_id', 64).nullable();
    t.integer('user_id').unsigned().nullable();
    t.string('tool_call_id', 128).nullable();
    t.string('tool_name', 64).notNullable();
    t.text('raw_args').notNullable();
    t.text('normalized_args').notNullable();
    t.text('reply').nullable();
    t.string('model', 255).nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.foreign('document_id').references('documents.id').onDelete('SET NULL');
    t.foreign('user_id').references('users.id').onDelete('SET NULL');
    t.index('document_id');
    t.index('user_id');
    t.index('tool_name');
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('ai_tool_runs');
};
