"use strict";
import { sequelize } from "../utilities/db.js";
import bcrypt from "bcrypt";

class User {
  // Tablo oluşturma
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        account_status VARCHAR(20) DEFAULT 'active',
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- İndeksler
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_account_status (account_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    try {
      await sequelize.query(sql);
      console.log("Users tablosu başarıyla oluşturuldu");
    } catch (error) {
      console.error("Tablo oluşturma hatası:", error);
      throw error;
    }
  }

  // Kullanıcı oluşturma
  static async create(userData) {
    const { password, ...otherData } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (username, email, password, role, account_status, first_name, last_name)
      VALUES (:username, :email, :password, :role, :account_status, :first_name, :last_name)
    `;

    try {
      const [result] = await sequelize.query(sql, {
        replacements: { ...otherData, password: hashedPassword },
        type: sequelize.QueryTypes.INSERT,
      });
      return this.findById(result);
    } catch (error) {
      console.error("Kullanıcı oluşturma hatası:", error);
      throw error;
    }
  }

  // ID'ye göre kullanıcı getirme
  static async findById(id) {
    const sql = `
      SELECT id, username, email, role, account_status, first_name, last_name, created_at, updated_at
      FROM users
      WHERE id = :id
    `;

    try {
      const [user] = await sequelize.query(sql, {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT,
      });
      return user;
    } catch (error) {
      console.error("Kullanıcı bulma hatası:", error);
      throw error;
    }
  }

  // Email'e göre kullanıcı getirme
  static async findByEmail(email) {
    const sql = `
      SELECT *
      FROM users
      WHERE email = :email
    `;

    try {
      const [user] = await sequelize.query(sql, {
        replacements: { email },
        type: sequelize.QueryTypes.SELECT,
      });
      return user;
    } catch (error) {
      console.error("Kullanıcı bulma hatası:", error);
      throw error;
    }
  }

  // Kullanıcının konularını getirme
  static async getTopics(userId) {
    const sql = `
      SELECT t.*, 
             c.name as category_name,
             u.username as author_username,
             (SELECT COUNT(*) FROM posts WHERE topic_id = t.id) as post_count
      FROM topics t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.user_id = :userId
      ORDER BY t.created_at DESC
    `;

    try {
      return await sequelize.query(sql, {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      console.error("Konuları getirme hatası:", error);
      throw error;
    }
  }

  // Kullanıcının gönderilerini getirme
  static async getPosts(userId) {
    const sql = `
      SELECT p.*, 
             t.title as topic_title,
             c.name as category_name
      FROM posts p
      LEFT JOIN topics t ON p.topic_id = t.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.user_id = :userId
      ORDER BY p.created_at DESC
    `;

    try {
      return await sequelize.query(sql, {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      console.error("Gönderileri getirme hatası:", error);
      throw error;
    }
  }

  // Kullanıcının beğenilerini getirme
  static async getLikes(userId) {
    const sql = `
      SELECT l.*, 
             p.title as post_title,
             p.content as post_content,
             u.username as post_author
      FROM likes l
      LEFT JOIN posts p ON l.post_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE l.user_id = :userId
      ORDER BY l.created_at DESC
    `;

    try {
      return await sequelize.query(sql, {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      console.error("Beğenileri getirme hatası:", error);
      throw error;
    }
  }

  // Kullanıcı güncelleme
  static async update(id, updateData) {
    let sql = `
      UPDATE users
      SET username = :username,
          email = :email,
          role = :role,
          account_status = :account_status,
          first_name = :first_name,
          last_name = :last_name
    `;

    if (updateData.password) {
      const hashedPassword = await bcrypt.hash(updateData.password, 10);
      sql += `, password = '${hashedPassword}'`;
    }

    sql += ` WHERE id = :id`;

    try {
      await sequelize.query(sql, {
        replacements: { ...updateData, id },
        type: sequelize.QueryTypes.UPDATE,
      });
      return this.findById(id);
    } catch (error) {
      console.error("Kullanıcı güncelleme hatası:", error);
      throw error;
    }
  }

  // Kullanıcı silme
  static async delete(id) {
    const sql = `
      DELETE FROM users
      WHERE id = :id
    `;

    try {
      return await sequelize.query(sql, {
        replacements: { id },
        type: sequelize.QueryTypes.DELETE,
      });
    } catch (error) {
      console.error("Kullanıcı silme hatası:", error);
      throw error;
    }
  }
}

export default User;
