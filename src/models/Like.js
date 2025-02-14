"use strict";
import { sequelize } from "../utilities/db.js";

class Like {
  // Tablo oluşturma
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS likes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        post_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Foreign key kısıtlamaları
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        
        -- Benzersiz kısıtlama (bir kullanıcı bir postu bir kez beğenebilir)
        UNIQUE KEY unique_like (user_id, post_id),
        
        -- İndeksler
        INDEX idx_user_id (user_id),
        INDEX idx_post_id (post_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    try {
      await sequelize.query(sql);
      console.log("Likes tablosu başarıyla oluşturuldu");
    } catch (error) {
      console.error("Tablo oluşturma hatası:", error);
      throw error;
    }
  }

  // Beğeni oluşturma
  static async create({ user_id, post_id }) {
    const sql = `
      INSERT INTO likes (user_id, post_id)
      VALUES (:user_id, :post_id)
    `;

    try {
      const [result] = await sequelize.query(sql, {
        replacements: { user_id, post_id },
        type: sequelize.QueryTypes.INSERT,
      });

      // Post'un beğeni sayısını güncelle
      await sequelize.query(
        `
        UPDATE posts 
        SET like_count = like_count + 1
        WHERE id = :post_id
      `,
        {
          replacements: { post_id },
        }
      );

      return result;
    } catch (error) {
      console.error("Beğeni oluşturma hatası:", error);
      throw error;
    }
  }

  // Beğeni kontrolü
  static async exists({ user_id, post_id }) {
    const sql = `
      SELECT COUNT(*) as count
      FROM likes
      WHERE user_id = :user_id AND post_id = :post_id
    `;

    try {
      const [result] = await sequelize.query(sql, {
        replacements: { user_id, post_id },
        type: sequelize.QueryTypes.SELECT,
      });
      return result.count > 0;
    } catch (error) {
      console.error("Beğeni kontrol hatası:", error);
      throw error;
    }
  }

  // Post'un beğenilerini getirme
  static async findByPostId(post_id) {
    const sql = `
      SELECT l.*, 
             u.username as user_username
      FROM likes l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.post_id = :post_id
      ORDER BY l.created_at DESC
    `;

    try {
      return await sequelize.query(sql, {
        replacements: { post_id },
        type: sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      console.error("Post beğenileri getirme hatası:", error);
      throw error;
    }
  }

  // Kullanıcının beğenilerini getirme
  static async findByUserId(user_id) {
    const sql = `
      SELECT l.*, 
             p.title as post_title,
             u.username as post_author
      FROM likes l
      LEFT JOIN posts p ON l.post_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE l.user_id = :user_id
      ORDER BY l.created_at DESC
    `;

    try {
      return await sequelize.query(sql, {
        replacements: { user_id },
        type: sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      console.error("Kullanıcı beğenileri getirme hatası:", error);
      throw error;
    }
  }

  // Beğeni silme
  static async delete({ user_id, post_id }) {
    const sql = `
      DELETE FROM likes
      WHERE user_id = :user_id AND post_id = :post_id
    `;

    try {
      await sequelize.query(sql, {
        replacements: { user_id, post_id },
        type: sequelize.QueryTypes.DELETE,
      });

      // Post'un beğeni sayısını güncelle
      await sequelize.query(
        `
        UPDATE posts 
        SET like_count = like_count - 1
        WHERE id = :post_id
      `,
        {
          replacements: { post_id },
        }
      );

      return true;
    } catch (error) {
      console.error("Beğeni silme hatası:", error);
      throw error;
    }
  }
}

export default Like;
