export async function up(queryInterface, Sequelize) {
  await queryInterface.sequelize.query(
    `ALTER TABLE posts ADD FULLTEXT INDEX posts_fulltext_idx(title, content);`
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.sequelize.query(
    `ALTER TABLE posts DROP INDEX posts_fulltext_idx;`
  );
}
