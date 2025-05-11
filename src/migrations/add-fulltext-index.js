export async function up(queryInterface, Sequelize) {
  await queryInterface.sequelize.query(
    ` ALTER TABLE categories ADD FULLTEXT INDEX categories_fulltext_idx(name, description);`
  );
}
export async function down(queryInterface, Sequelize) {
  //migration'ı geri almak için kullanılır.
  await queryInterface.sequelize.query(
    ` ALTER TABLE categories DROP INDEX categories_fulltext_idx;`
  );
}
