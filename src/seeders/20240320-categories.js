"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Önce ana kategorileri ekle
    const mainCategories = await queryInterface.bulkInsert(
      "Categories",
      [
        {
          name: "Programlama",
          slug: "programlama",
          description: "Programlama ile ilgili konular",
          parent_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          name: "Web Geliştirme",
          slug: "web-gelistirme",
          description: "Web geliştirme ile ilgili konular",
          parent_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          name: "Genel Konular",
          description: "Genel tartışma konuları",
          slug: "genel-konular",
          parent_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      { returning: true }
    );

    // Ana kategoriler eklendikten sonra alt kategorileri ekle
    const [categories] = await queryInterface.sequelize.query(
      `SELECT id FROM Categories WHERE slug = 'programlama'`
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Categories", null, {});
  },
};
