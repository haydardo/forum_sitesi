import jwt from "jsonwebtoken";
import { sequelize } from "../utilities/db.js";
import { spawn } from "child_process";
import Post from "../models/Post.js";
import redisClient from "../config/redis.js";
async function analyzeContent(content) {
  return new Promise((resolve, reject) => {
    const python = spawn("python", ["python_scripts/content_analyzer.py"]);
    let result = "";
    let errorOutput = "";

    python.stdout.on("data", (data) => {
      result += data.toString();
    });

    python.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    python.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python hatası: ${errorOutput}`));
        return;
      }
      try {
        resolve(JSON.parse(result));
      } catch (error) {
        reject(new Error("Python çıktısı JSON formatında değil"));
      }
    });

    python.stdin.write(JSON.stringify({ content }));
    python.stdin.end();
  });
}

async function handlePostRequest(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Yetkilendirme gerekli" }));
      return;
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "gizli_anahtar");
    } catch (error) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Geçersiz token" }));
      return;
    }

    const { title, content, categoryId } = req.body;
    const contentAnalysis = await analyzeContent(content);
    console.log("İçerik analizi sonucu:", contentAnalysis);
    if (!title || !content || !categoryId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "Başlık, içerik ve kategori alanları zorunludur",
        })
      );
      return;
    }

    const post = await Post.create({
      title,
      content,
      categoryId,
      userId: decoded.id,
      topicId: null,
    });

    if (redisClient.isReady) {
      await redisClient.del("all_posts");
      await redisClient.del("categories");
    }

    if (!res.headersSent) {
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          data: post,
        })
      );
    }

    // Yeni kategori verilerini al ve Redis'e kaydet
    const sqlQuery = `
    SELECT 
      c.*,
      (SELECT COUNT(*) FROM posts WHERE category_id = c.id) as post_count,
      COALESCE(
        (
          SELECT CONCAT('[', 
            GROUP_CONCAT(
              JSON_OBJECT(
                'id', p.id,
                'title', p.title,
                'content', SUBSTRING(p.content, 1, 100),
                'created_at', p.created_at,
                'author_username', COALESCE(u.username, 'Anonim')
              )
            ),
          ']')
          FROM posts p
          LEFT JOIN users u ON p.user_id = u.id
          WHERE p.category_id = c.id
          GROUP BY p.category_id
          ORDER BY p.created_at DESC
          LIMIT 5
        ),
        '[]'
      ) as recent_posts
    FROM categories c
    WHERE c.parent_id IS NULL
    ORDER BY c.created_at DESC
  `;
    const categories = await sequelize.query(sqlQuery, {
      type: sequelize.QueryTypes.SELECT,
    });

    if (categories) {
      await redisClient.setEx("categories", 3600, JSON.stringify(categories));
    }

    if (!res.headersSent) {
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          data: post,
        })
      );
    }
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "Post oluşturulurken bir hata oluştu",
          error: error.message,
        })
      );
    }
  }
}

async function handleGetRequest(req, res) {
  try {
    const sql = `
      SELECT 
        p.*, 
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
      ORDER BY p.created_at DESC, p.id DESC
    `;

    const posts = await sequelize.query(sql, {
      type: sequelize.QueryTypes.SELECT,
    });

    const formattedPosts = posts.map((post) => {
      try {
        return {
          id: post.id,
          title: post.title,
          content: post.content,
          author_username: post.author_username || "Anonim",
          category_name: post.category_name,
          topic_title: post.topic_title,
          created_at: post.created_at
            ? new Date(post.created_at).toISOString()
            : null,
          updated_at: post.updated_at
            ? new Date(post.updated_at).toISOString()
            : null,
          comments: post.comments ? JSON.parse(post.comments) : [],
        };
      } catch (error) {
        return {
          ...post,
          comments: [],
          created_at: post.created_at
            ? new Date(post.created_at).toISOString()
            : null,
          updated_at: post.updated_at
            ? new Date(post.updated_at).toISOString()
            : null,
        };
      }
    });

    if (!res.headersSent) {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(formattedPosts));
    }
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "Gönderiler listelenirken bir hata oluştu",
          error: error.message,
        })
      );
    }
  }
}

async function handleLikeRequest(req, res) {
  try {
    const postId = req.params.id;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Yetkilendirme gerekli" }));
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "gizli_anahtar"
    );
    const userId = decoded.id;

    const checkLikeSql = `
      SELECT * FROM likes 
      WHERE post_id = :postId AND user_id = :userId
    `;

    const [existingLike] = await sequelize.query(checkLikeSql, {
      replacements: { postId, userId },
      type: sequelize.QueryTypes.SELECT,
    });

    if (existingLike) {
      await sequelize.query(
        `DELETE FROM likes WHERE post_id = :postId AND user_id = :userId`,
        {
          replacements: { postId, userId },
        }
      );

      await sequelize.query(
        `UPDATE posts SET like_count = like_count - 1 WHERE id = :postId`,
        {
          replacements: { postId },
        }
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Beğeni kaldırıldı" }));
    } else {
      await sequelize.query(
        `INSERT INTO likes (post_id, user_id) VALUES (:postId, :userId)`,
        {
          replacements: { postId, userId },
        }
      );

      await sequelize.query(
        `UPDATE posts SET like_count = like_count + 1 WHERE id = :postId`,
        {
          replacements: { postId },
        }
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Gönderi beğenildi" }));
    }
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Beğeni işlemi başarısız" }));
  }
}

async function HandleCommentRequest(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Yetkilendirme gerekli" }));
      return;
    }
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "gizli_anahtar"
    );
    const postId = req.params.id;
    const { content } = req.body;
    const userId = decoded.id;
    const createCommentSql = `
      INSERT INTO comments (post_id, user_id, content)
      VALUES (:postId, :userId, :content)
    `;
    const [commentId] = await sequelize.query(createCommentSql, {
      replacements: {
        content,
        userId: decoded.id,
        postId,
      },
      type: sequelize.QueryTypes.INSERT,
    });

    const [comment] = await sequelize.query(
      `SELECT c.*, u.username as author_username 
       FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.id = :commentId`,
      {
        replacements: { commentId },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify(comment));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Yorum eklenemedi" }));
  }
}

export const postRoutes = async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/posts") {
      await handlePostRequest(req, res);
    } else if (req.method === "GET" && req.url === "/api/posts") {
      await handleGetRequest(req, res);
    } else if (req.method === "GET" && req.url.match(/^\/api\/posts\/\d+$/)) {
      const postId = req.url.split("/")[3];
      req.params = { id: postId };
      await handleGetRequest(req, res);
    } else if (
      req.method === "POST" &&
      req.url.match(/\/api\/posts\/\d+\/like/)
    ) {
      const postId = req.url.split("/")[3];
      req.params = { id: postId };
      await handleLikeRequest(req, res);
    } else if (
      req.method === "POST" &&
      req.url.match(/\/api\/posts\/\d+\/comments/)
    ) {
      const postId = req.url.split("/")[3];
      req.params = { id: postId };
      await HandleCommentRequest(req, res);
    } else if (
      req.method === "GET" &&
      req.url.startsWith("/api/posts/search")
    ) {
      const searchQuery = new URL(
        req.url,
        `http://${req.headers.host}`
      ).searchParams.get("q");

      if (!searchQuery) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Arama terimi gerekli" }));
        return;
      }

      try {
        const results = await Post.search(searchQuery);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(results));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ message: "Arama yapılırken bir hata oluştu" })
        );
      }
    } else if (req.method === "OPTIONS") {
      res.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      });
      res.end();
    } else {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Method not allowed" }));
    }
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Sunucu hatası" }));
  }
};

export default postRoutes;
