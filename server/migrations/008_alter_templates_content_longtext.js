exports.up = async function up(knex) {
  await knex.raw('ALTER TABLE templates MODIFY COLUMN content LONGTEXT NOT NULL');
};

exports.down = async function down(knex) {
  await knex.raw('ALTER TABLE templates MODIFY COLUMN content TEXT NOT NULL');
};
