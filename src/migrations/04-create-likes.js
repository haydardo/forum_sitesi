"use strict";

export async function up(queryInterface, Sequelize) {
  // Likes tablosunu oluştur
  const createLikesTable = `
    CREATE TABLE IF NOT EXISTS likes (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      post_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      -- Foreign key kısıtlamaları
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      
      -- Benzersiz kısıtlama (bir kullanıcı bir postu bir kez beğenebilir)
      UNIQUE KEY unique_like (user_id, post_id),
      
      -- İndeksler
      INDEX idx_user_id (user_id),
      INDEX idx_post_id (post_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  // Users tablosu için foreign key
  const addUserForeignKey = `
    ALTER TABLE likes
    ADD CONSTRAINT likes_user_id_fk -- Key kısıtlaması ekleme
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE;
  `;

  try {
    // Tabloyu oluştur
    await queryInterface.sequelize.query(createLikesTable);

    // Users tablosu için foreign key'i ekle
    try {
      await queryInterface.sequelize.query(addUserForeignKey);
    } catch (error) {
      console.warn(
        "users tablosu henüz oluşturulmamış olabilir. Foreign key daha sonra eklenecek."
      );
    }

    console.log("Likes tablosu başarıyla oluşturuldu");
  } catch (error) {
    console.error("Tablo oluşturma hatası:", error);
    throw error;
  }
}

export async function down(queryInterface, Sequelize) {
  // Tabloyu sil
  const dropTable = `
    DROP TABLE IF EXISTS likes;
  `;

  try {
    await queryInterface.sequelize.query(dropTable);
    console.log("Likes tablosu başarıyla silindi");
  } catch (error) {
    console.error("Tablo silme hatası:", error);
    throw error;
  }
}
