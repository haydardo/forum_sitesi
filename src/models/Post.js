"use strict";
import { sequelize } from "../utilities/db.js";

class Post {
  // Post oluşturma
  static async create(postData) {
    const sql = `
      INSERT INTO posts (
        title, 
        content, 
        category_id, 
        user_id, 
        topic_id, 
        parent_id, 
        is_solution,
        created_at,
        updated_at
      ) VALUES (
        :title, 
        :content, 
        :categoryId, 
        :userId, 
        :topicId, 
        :parentId, 
        :isSolution,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `;

    try {
      const [result] = await sequelize.query(sql, {
        replacements: {
          title: postData.title,
          content: postData.content,
          categoryId: postData.categoryId,
          userId: postData.userId,
          topicId: postData.topicId || null,
          parentId: postData.parentId || null,
          isSolution: postData.isSolution || false,
        },
        type: sequelize.QueryTypes.INSERT,
      });

      return this.findById(result);
    } catch (error) {
      throw error;
    }
  }

  // ID'ye göre post getirme
  static async findById(id) {
    const sql = `
      SELECT p.*, 
             u.username as author_username,
             c.name as category_name,
             c.description as category_description,
             t.title as topic_title,
             COALESCE(
               (
                 SELECT CONCAT('[', 
                   GROUP_CONCAT(
                     CONCAT(
                       '{"id":', cm.id,
                       ',"content":"', REPLACE(cm.content, '"', '\\"'), 
                       '","created_at":"', DATE_FORMAT(cm.created_at, '%Y-%m-%dT%H:%i:%s.000Z'),
                       '","author_username":"', COALESCE(cu.username, 'Anonim'), 
                       '"}'
                     )
                   ),
                 ']')
                 FROM comments cm
                 LEFT JOIN users cu ON cm.user_id = cu.id
                 WHERE cm.post_id = p.id
                 GROUP BY cm.post_id
               ),
               '[]'
             ) as comments
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN topics t ON p.topic_id = t.id
      WHERE p.id = :id
    `;

    try {
      const [post] = await sequelize.query(sql, {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT,
      });
      return post;
    } catch (error) {
      throw error;
    }
  }

  // Tüm postları getirme
  static async findAll() {
    const sql = `
      SELECT p.*, 
             u.username as author_username,
             c.name as category_name,
             t.title as topic_title
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN topics t ON p.topic_id = t.id
      ORDER BY p.created_at DESC
    `;

    try {
      return await sequelize.query(sql, {
        type: sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      throw error;
    }
  }

  // Post güncelleme
  static async update(id, updateData) {
    const sql = `
      UPDATE posts
      SET 
        title = :title,
        content = :content,
        is_solution = :isSolution,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `;

    try {
      await sequelize.query(sql, {
        replacements: {
          id,
          title: updateData.title,
          content: updateData.content,
          isSolution: updateData.isSolution || false,
        },
        type: sequelize.QueryTypes.UPDATE,
      });
      return this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  // Post silme
  static async delete(id) {
    const sql = `DELETE FROM posts WHERE id = :id`;

    try {
      return await sequelize.query(sql, {
        replacements: { id },
        type: sequelize.QueryTypes.DELETE,
      });
    } catch (error) {
      throw error;
    }
  }

  // Yanıtları getirme
  static async getReplies(postId) {
    const sql = `
      SELECT p.*, 
             u.username as author_username
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.parent_id = :postId
      ORDER BY p.created_at ASC
    `;

    try {
      return await sequelize.query(sql, {
        replacements: { postId },
        type: sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      throw error;
    }
  }

  // Beğeni sayısını güncelleme
  static async updateLikeCount(postId) {
    const sql = `
      UPDATE posts
      SET like_count = (
        SELECT COUNT(*) 
        FROM likes 
        WHERE post_id = :postId
      )
      WHERE id = :postId
    `;

    try {
      await sequelize.query(sql, {
        replacements: { postId },
        type: sequelize.QueryTypes.UPDATE,
      });
      return this.findById(postId);
    } catch (error) {
      throw error;
    }
  }

  // Post.js'e search metodu ekleyelim
  static async search(query) {
    const sql = `
      SELECT p.*, 
             u.username as author_username,
             c.name as category_name,
             t.title as topic_title
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN topics t ON p.topic_id = t.id
      WHERE MATCH(p.title, p.content) AGAINST(:query IN BOOLEAN MODE)
      ORDER BY p.created_at DESC
    `;

    try {
      return await sequelize.query(sql, {
        replacements: { query: `*${query}*` },
        type: sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      throw error;
    }
  }
}

export default Post;
