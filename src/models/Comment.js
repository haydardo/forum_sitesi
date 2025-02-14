"use strict";
import { sequelize } from "../utilities/db.js";

class Comment {
  // Tablo oluşturma
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS comments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        content TEXT NOT NULL,
        user_id INT NOT NULL,
        post_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Foreign key kısıtlamaları
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (post_id) REFERENCES posts(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    try {
      await sequelize.query(sql);
      console.log("Comments tablosu başarıyla oluşturuldu");
    } catch (error) {
      console.error("Tablo oluşturma hatası:", error);
      throw error;
    }
  }

  // İlişkiler için SQL sorgular
  static async getAuthor(commentId) {
    const sql = `
      SELECT u.* 
      FROM users u
      JOIN comments c ON u.id = c.user_id
      WHERE c.id = :commentId
    `;

    try {
      const [author] = await sequelize.query(sql, {
        replacements: { commentId },
        type: sequelize.QueryTypes.SELECT,
      });
      return author;
    } catch (error) {
      console.error("Yazar getirme hatası:", error);
      throw error;
    }
  }

  static async getPost(commentId) {
    const sql = `
      SELECT p.* 
      FROM posts p
      JOIN comments c ON p.id = c.post_id
      WHERE c.id = :commentId
    `;

    try {
      const [post] = await sequelize.query(sql, {
        replacements: { commentId },
        type: sequelize.QueryTypes.SELECT,
      });
      return post;
    } catch (error) {
      console.error("Post getirme hatası:", error);
      throw error;
    }
  }
}

export default Comment;
