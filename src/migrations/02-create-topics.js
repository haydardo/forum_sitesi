"use strict";

export async function up(queryInterface, Sequelize) {
  // Topics tablosunu oluştur
  const createTopicsTable = `
    CREATE TABLE IF NOT EXISTS topics (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(200) NOT NULL,
      content TEXT NOT NULL,
      slug VARCHAR(200) NOT NULL UNIQUE,
      user_id INT NOT NULL,
      category_id INT NOT NULL,
      view_count INT DEFAULT 0,
      is_pinned BOOLEAN DEFAULT FALSE,
      is_locked BOOLEAN DEFAULT FALSE,
      last_post_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      -- Foreign key kısıtlaması
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      
      -- İndeksler
      INDEX idx_user_id (user_id),
      INDEX idx_category_id (category_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  // Users tablosu için foreign key
  const addUserForeignKey = `
    ALTER TABLE topics
    ADD CONSTRAINT topics_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE;
  `;

  try {
    // Tabloyu oluştur
    await queryInterface.sequelize.query(createTopicsTable);

    // Users tablosu için foreign key'i ekle
    try {
      await queryInterface.sequelize.query(addUserForeignKey);
    } catch (error) {
      console.warn(
        "users tablosu henüz oluşturulmamış olabilir. Foreign key daha sonra eklenecek."
      );
    }

    console.log("Topics tablosu başarıyla oluşturuldu");
  } catch (error) {
    console.error("Tablo oluşturma hatası:", error);
    throw error;
  }
}

export async function down(queryInterface, Sequelize) {
  // Tabloyu sil
  const dropTable = `
    DROP TABLE IF EXISTS topics;
  `;

  try {
    await queryInterface.sequelize.query(dropTable);
    console.log("Topics tablosu başarıyla silindi");
  } catch (error) {
    console.error("Tablo silme hatası:", error);
    throw error;
  }
}
