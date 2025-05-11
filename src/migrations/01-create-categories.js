"use strict";

export async function up(queryInterface, Sequelize) {
  // Categories tablosunu oluştur
  const createCategoriesTable = `
    CREATE TABLE IF NOT EXISTS categories (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      parent_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      -- Foreign key kısıtlaması (self-referential)
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
      
      -- İndeksler
      INDEX idx_parent_id (parent_id),
      INDEX idx_slug (slug),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await queryInterface.sequelize.query(createCategoriesTable);
    console.log("Categories tablosu başarıyla oluşturuldu");
  } catch (error) {
    console.error("Tablo oluşturma hatası:", error);
    throw error;
  }
}

export async function down(queryInterface, Sequelize) {
  // Tabloyu sil
  const dropTable = `
    DROP TABLE IF EXISTS categories;
  `;

  try {
    await queryInterface.sequelize.query(dropTable);
    console.log("Categories tablosu başarıyla silindi");
  } catch (error) {
    console.error("Tablo silme hatası:", error);
    throw error;
  }
}
