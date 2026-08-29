"use strict";

export async function up(queryInterface, Sequelize) {
  const createCommentsTable = `
    CREATE TABLE IF NOT EXISTS comments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      content TEXT NOT NULL,
      user_id INT NOT NULL,
      post_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      -- Foreign key kısıtlamaları
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (post_id) REFERENCES posts(id),

      INDEX idx_post_id (post_id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await queryInterface.sequelize.query(createCommentsTable);
    console.log("Comments tablosu başarıyla oluşturuldu");
  } catch (error) {
    console.error("Tablo oluşturma hatası:", error);
    throw error;
  }
}

export async function down(queryInterface, Sequelize) {
  const dropTable = `
    DROP TABLE IF EXISTS comments;
  `;

  try {
    await queryInterface.sequelize.query(dropTable);
    console.log("Comments tablosu başarıyla silindi");
  } catch (error) {
    console.error("Tablo silme hatası:", error);
    throw error;
  }
}
