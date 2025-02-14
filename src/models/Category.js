"use strict";
import { sequelize } from "../utilities/db.js";

class Category {
  // Tablo oluşturma SQL'i
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        parent_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Foreign key kısıtlaması
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
        
        -- İndeksler
        FULLTEXT INDEX categories_fulltext_idx(name, description)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    try {
      await sequelize.query(sql);
      console.log("Categories tablosu başarıyla oluşturuldu");
    } catch (error) {
      console.error("Tablo oluşturma hatası:", error);
      throw error;
    }
  }

  // İlişkiler için SQL sorgular
  static async getSubCategories(categoryId) {
    const sql = `
      SELECT * FROM categories 
      WHERE parent_id = :categoryId
      ORDER BY created_at DESC
    `;

    try {
      return await sequelize.query(sql, {
        replacements: { categoryId },
        type: sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      console.error("Alt kategori getirme hatası:", error);
      throw error;
    }
  }

  static async getParentCategory(categoryId) {
    const sql = `
      SELECT * FROM categories 
      WHERE id = (
        SELECT parent_id FROM categories WHERE id = :categoryId -- Kategori id'sine göre parent id'yi getirir, idye göre getirir.
      )
    `;

    try {
      const [parent] = await sequelize.query(sql, {
        replacements: { categoryId },
        type: sequelize.QueryTypes.SELECT,
      });
      return parent;
    } catch (error) {
      console.error("Üst kategori getirme hatası:", error);
      throw error;
    }
  }

  static async getPosts(categoryId) {
    const sql = `
      SELECT p.*, u.username as author_username
      FROM posts p -- Post tablosunu p takma adıyla seç
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.category_id = :categoryId
      ORDER BY p.created_at DESC
    `;

    try {
      return await sequelize.query(sql, {
        replacements: { categoryId },
        type: sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      console.error("Kategori gönderileri getirme hatası:", error);
      throw error;
    }
  }

  static async getTopics(categoryId) {
    const sql = `
      SELECT t.*, u.username as author_username
      FROM topics t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.category_id = :categoryId
      ORDER BY t.created_at DESC
    `;

    try {
      return await sequelize.query(sql, {
        replacements: { categoryId },
        type: sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      console.error("Kategori konuları getirme hatası:", error);
      throw error;
    }
  }

  // CRUD işlemleri
  static async create({ name, slug, description, parent_id }) {
    const sql = `
      INSERT INTO categories (name, slug, description, parent_id)
      VALUES (:name, :slug, :description, :parent_id)
    `;

    try {
      const [result] = await sequelize.query(sql, {
        replacements: { name, slug, description, parent_id },
        type: sequelize.QueryTypes.INSERT,
      });
      return result;
    } catch (error) {
      console.error("Kategori oluşturma hatası:", error);
      throw error;
    }
  }

  static async findById(id) {
    const sql = `
      SELECT c.*, 
             p.id as parent_id, 
             p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = :id
    `;

    try {
      const [category] = await sequelize.query(sql, {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT,
      });
      return category;
    } catch (error) {
      console.error("Kategori bulma hatası:", error);
      throw error;
    }
  }

  static async findBySlug(slug) {
    const sql = `
      SELECT * FROM categories
      WHERE slug = :slug
    `;

    try {
      const [category] = await sequelize.query(sql, {
        replacements: { slug },
        type: sequelize.QueryTypes.SELECT,
      });
      return category;
    } catch (error) {
      console.error("Slug ile kategori bulma hatası:", error);
      throw error;
    }
  }

  static async update(id, { name, slug, description, parent_id }) {
    const sql = `
      UPDATE categories
      SET name = :name,
          slug = :slug,
          description = :description,
          parent_id = :parent_id,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `;

    try {
      await sequelize.query(sql, {
        replacements: { id, name, slug, description, parent_id },
        type: sequelize.QueryTypes.UPDATE,
      });
      return this.findById(id);
    } catch (error) {
      console.error("Kategori güncelleme hatası:", error);
      throw error;
    }
  }

  static async delete(id) {
    const sql = `
      DELETE FROM categories
      WHERE id = :id
    `;

    try {
      return await sequelize.query(sql, {
        replacements: { id },
        type: sequelize.QueryTypes.DELETE,
      });
    } catch (error) {
      console.error("Kategori silme hatası:", error);
      throw error;
    }
  }

  // FULLTEXT arama
  static async search(query) {
    const sql = `
      SELECT *, 
             MATCH(name, description) AGAINST(:query IN BOOLEAN MODE) as relevance -- Match hangi alanlara bakacağını seçiyor.
      FROM categories
      WHERE MATCH(name, description) AGAINST(:query IN BOOLEAN MODE)
      ORDER BY relevance DESC
    `;

    try {
      return await sequelize.query(sql, {
        replacements: { query },
        type: sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      console.error("Kategori arama hatası:", error);
      throw error;
    }
  }
}

export default Category;
