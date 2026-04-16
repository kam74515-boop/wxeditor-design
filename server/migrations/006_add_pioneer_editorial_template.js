const { TEMPLATE_NAME, createTemplateDefinition } = require('../src/templates/pioneerEditorialTemplate');

exports.up = async function up(knex) {
  const exists = await knex('templates')
    .where({ name: TEMPLATE_NAME, status: 'active' })
    .first();

  if (exists) return;

  await knex('templates').insert(createTemplateDefinition());
};

exports.down = async function down(knex) {
  await knex('templates')
    .where({ name: TEMPLATE_NAME, category: 'editorial' })
    .del();
};
