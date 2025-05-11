"use strict";

export async function up(queryInterface, Sequelize) {
  // Posts tablosunu oluştur
  const createPostsTable = `
    CREATE TABLE IF NOT EXISTS posts (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      user_id INT NOT NULL,
      topic_id INT NOT NULL,
      parent_id INT,
      is_solution BOOLEAN DEFAULT FALSE,
      like_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      -- Foreign key kısıtlamaları
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES posts(id) ON DELETE SET NULL,
      
      -- İndeksler
      INDEX idx_user_id (user_id),
      INDEX idx_topic_id (topic_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  // Users tablosu için foreign key
  const addUserForeignKey = `
    ALTER TABLE posts
    ADD CONSTRAINT posts_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE;
  `;

  try {
    // Tabloyu oluştur
    await queryInterface.sequelize.query(createPostsTable);

    // Users tablosu için foreign key'i ekle
    try {
      await queryInterface.sequelize.query(addUserForeignKey);
    } catch (error) {
      console.warn(
        "users tablosu henüz oluşturulmamış olabilir. Foreign key daha sonra eklenecek."
      );
    }

    console.log("Posts tablosu başarıyla oluşturuldu");
  } catch (error) {
    console.error("Tablo oluşturma hatası:", error);
    throw error;
  }
}

export async function down(queryInterface, Sequelize) {
  // Tabloyu sil
  const dropTable = `
    DROP TABLE IF EXISTS posts;
  `;

  try {
    await queryInterface.sequelize.query(dropTable);
    console.log("Posts tablosu başarıyla silindi");
  } catch (error) {
    console.error("Tablo silme hatası:", error);
    throw error;
  }
}
