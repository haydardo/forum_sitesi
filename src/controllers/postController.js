import jwt from "jsonwebtoken";
import { sequelize } from "../utilities/db.js";
import { spawn } from "child_process";
import { Post } from "../models/Post.js";

class PostController {
  async getAllPosts(req, res) {
    try {
      const sql = `
        SELECT p.*, 
               u.username as author_username,
               c.name as category_name,
               c.description as category_description,
               t.title as topic_title
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN topics t ON p.topic_id = t.id
        ORDER BY p.created_at DESC
      `;

      const posts = await sequelize.query(sql, {
        type: sequelize.QueryTypes.SELECT,
      });

      const formattedPosts = posts.map((post) => ({
        ...post,
        created_at: post.created_at
          ? new Date(post.created_at).toISOString()
          : null,
        updated_at: post.updated_at
          ? new Date(post.updated_at).toISOString()
          : null,
      }));

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(formattedPosts));
    } catch (error) {
      console.error("Gönderiler alınırken hata:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Gönderiler alınamadı" }));
    }
  }

  async createPost(req, res) {
    try {
      const { title, content, categoryId } = req.body;

      // Authorization header'ı kontrol et
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: "Yetkilendirme gerekli",
        });
      }

      // Token'ı al ve doğrula
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "gizli_anahtar"
      );
      const userId = decoded.id;

      if (!title || !content || !categoryId) {
        return res.status(400).json({
          success: false,
          message: "Başlık, içerik ve kategori alanları zorunludur",
        });
      }

      const post = await Post.create({
        title,
        content,
        categoryId,
        userId: userId, // req.user.id yerine decoded token'dan alınan userId kullanılıyor
      });

      res.status(201).json({
        success: true,
        data: post,
      });
    } catch (error) {
      console.error("Post oluşturma hatası:", error);

      // JWT doğrulama hatası kontrolü
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Geçersiz token",
        });
      }

      res.status(400).json({
        success: false,
        message: error.message || "İçerik oluşturulurken bir hata oluştu",
      });
    }
  }

  async getPostById(req, res) {
    try {
      const postId = req.params.id;

      const sql = `
        SELECT p.*, 
               u.username as author_username,
               c.name as category_name,
               c.description as category_description,
               t.title as topic_title,
               (
                 SELECT GROUP_CONCAT(
                   JSON_OBJECT(
                     'id', cm.id,
                     'content', cm.content,
                     'created_at', cm.created_at,
                     'author_username', cu.username
                   )
                 )
                 FROM comments cm
                 LEFT JOIN users cu ON cm.user_id = cu.id
                 WHERE cm.post_id = p.id
               ) as comments
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN topics t ON p.topic_id = t.id
        WHERE p.id = :postId
      `;

      const [post] = await sequelize.query(sql, {
        replacements: { postId },
        type: sequelize.QueryTypes.SELECT,
      });

      if (!post) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Gönderi bulunamadı" }));
        return;
      }

      // comments alanını parse et
      post.comments = post.comments
        ? post.comments.split(",").map((comment) => JSON.parse(comment))
        : [];

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(post));
    } catch (error) {
      console.error("Gönderi detayı alınırken hata:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Gönderi detayı alınamadı" }));
    }
  }

  async analyzeContent(content) {
    return new Promise((resolve, reject) => {
      const python = spawn("python", ["python_scripts/content_analyzer.py"]);
      let result = "";
      let errorOutput = "";

      python.stdin.write(JSON.stringify({ content: content || "" }));
      python.stdin.end();

      python.stdout.on("data", (data) => {
        result += data.toString();
      });

      python.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      python.on("close", (code) => {
        try {
          const analysis = JSON.parse(result);
          resolve(analysis);
        } catch (error) {
          reject(
            new Error(`Python analiz hatası: ${errorOutput || error.message}`)
          );
        }
      });
    });
  }

  async likePost(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Yetkilendirme gerekli" }));
        return;
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "gizli_anahtar"
      );
      const userId = decoded.id;
      const postId = req.params.id;

      // 1. Önce mevcut beğeni durumunu ve sayısını kontrol et
      const [[existingLike], [currentPost]] = await Promise.all([
        sequelize.query(
          `SELECT * FROM likes WHERE user_id = :userId AND post_id = :postId`,
          {
            replacements: { userId, postId },
            type: sequelize.QueryTypes.SELECT,
            transaction,
          }
        ),
        sequelize.query(`SELECT like_count FROM posts WHERE id = :postId`, {
          replacements: { postId },
          type: sequelize.QueryTypes.SELECT,
          transaction,
        }),
      ]);

      let newLikeCount = currentPost.like_count;

      if (existingLike) {
        // 2. Beğeni varsa kaldır ve sayıyı azalt
        await Promise.all([
          sequelize.query(
            `DELETE FROM likes WHERE user_id = :userId AND post_id = :postId`,
            {
              replacements: { userId, postId },
              type: sequelize.QueryTypes.DELETE,
              transaction,
            }
          ),
          sequelize.query(
            `UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = :postId`,
            {
              replacements: { postId },
              type: sequelize.QueryTypes.UPDATE,
              transaction,
            }
          ),
        ]);
        newLikeCount = Math.max(newLikeCount - 1, 0);
      } else {
        // 3. Beğeni yoksa ekle ve sayıyı artır
        await Promise.all([
          sequelize.query(
            `INSERT INTO likes (user_id, post_id) VALUES (:userId, :postId)`,
            {
              replacements: { userId, postId },
              type: sequelize.QueryTypes.INSERT,
              transaction,
            }
          ),
          sequelize.query(
            `UPDATE posts SET like_count = like_count + 1 WHERE id = :postId`,
            {
              replacements: { postId },
              type: sequelize.QueryTypes.UPDATE,
              transaction,
            }
          ),
        ]);
        newLikeCount = newLikeCount + 1;
      }

      await transaction.commit();

      // 4. Güncel durumu client'a gönder
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: existingLike ? "Beğeni kaldırıldı" : "Gönderi beğenildi",
          liked: !existingLike,
          likeCount: newLikeCount,
        })
      );
    } catch (error) {
      await transaction.rollback();
      console.error("Beğeni hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Beğeni işlemi başarısız" }));
    }
  }

  async addComment(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Yetkilendirme gerekli" }));
      return;
    }

    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "gizli_anahtar"
      );
      const userId = decoded.id;
      const postId = req.params.id;
      const { content } = req.body;

      const contentAnalysis = await this.analyzeContent(content);
      if (!contentAnalysis.is_appropriate) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Yorum uygunsuz içerik içeriyor",
          })
        );
        return;
      }

      const createCommentSql = `
        INSERT INTO comments (content, user_id, post_id)
        VALUES (:content, :userId, :postId)
      `;

      const [commentId] = await sequelize.query(createCommentSql, {
        replacements: { content, userId, postId },
        type: sequelize.QueryTypes.INSERT,
      });

      const getCommentSql = `
        SELECT c.*, u.username as author_username
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = :commentId
      `;

      const [comment] = await sequelize.query(getCommentSql, {
        replacements: { commentId },
        type: sequelize.QueryTypes.SELECT,
      });

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(comment));
    } catch (error) {
      console.error("Yorum ekleme hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Yorum eklenemedi" }));
    }
  }

  async getComments(req, res) {
    try {
      const postId = req.params.id;
      const sql = `
        SELECT c.*, u.username as author_username
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.post_id = :postId
        ORDER BY c.created_at DESC
      `;

      const comments = await sequelize.query(sql, {
        replacements: { postId },
        type: sequelize.QueryTypes.SELECT,
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(comments));
    } catch (error) {
      console.error("Yorumlar alınırken hata:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Yorumlar alınamadı" }));
    }
  }
}

export default new PostController();
