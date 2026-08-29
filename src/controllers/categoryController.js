import { sequelize } from "../utilities/db.js";
import { getCategoriesWithCache } from "../routes/categoryRoutes.js";

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[ch])
  );

class CategoryController {
  // Kategorileri ve son gönderileri al
  async getAllCategories(req, res, redisClient) {
    try {
      // SQL sorgusunu tanımla
      const sqlQuery = `
        SELECT
          c.*,
          (
            SELECT COUNT(*)
            FROM posts pc
            JOIN topics tc ON pc.topic_id = tc.id
            WHERE tc.category_id = c.id
          ) as post_count,
          COALESCE(
            (
              SELECT CONCAT('[',
                GROUP_CONCAT(
                  JSON_OBJECT(
                    'id', p.id,
                    'title', REGEXP_REPLACE(p.title, '[\\n\\r\\t]', ' '),
                    'content', REGEXP_REPLACE(SUBSTRING(p.content, 1, 100), '[\\n\\r\\t]', ' '),
                    'created_at', DATE_FORMAT(p.created_at, '%Y-%m-%dT%H:%i:%s.000Z'),
                    'author_username', COALESCE(u.username, 'Anonim')
                  )
                ),
              ']')
              FROM posts p
              JOIN topics t ON p.topic_id = t.id
              LEFT JOIN users u ON p.user_id = u.id
              WHERE t.category_id = c.id
              GROUP BY t.category_id
              ORDER BY p.created_at DESC
              LIMIT 5
            ),
            '[]'
          ) as recent_posts
        FROM categories c
        WHERE c.parent_id IS NULL
        ORDER BY c.created_at DESC
      `;
      if (redisClient?.isOpen) {
        try {
          const cleanData = JSON.stringify(
            processedCategories,
            (key, value) => {
              if (typeof value === "string") {
                return value.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
              }
              return value;
            }
          );
          try {
            const cachedData = await redisClient.get("categories");

            if (cachedData) {
              console.log("Kategoriler önbellekten alındı");
              return JSON.parse(cachedData);
            }
          } catch (error) {
            console.error("Redis okuma hatası:", error);
          }
          await redisClient.setEx("categories", 3600, cleanData);
          console.log("Kategoriler Redis'e kaydedildi");
        } catch (error) {
          console.error("Redis işlem hatası:", error);
        }
      }
      // Veritabanından kategorileri al
      const categories = await sequelize.query(sqlQuery, {
        type: sequelize.QueryTypes.SELECT,
      });

      // Kategorileri işle
      const processedCategories = categories.map((category) => {
        try {
          let recent_posts = [];
          if (category.recent_posts && category.recent_posts !== "[]") {
            // JSON parse işleminden önce string temizleme
            const cleanJson = category.recent_posts
              .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
              .replace(/\\/g, "\\\\");
            recent_posts = JSON.parse(cleanJson);
          }
          return {
            ...category,
            recent_posts,
          };
        } catch (error) {
          console.error("JSON parse hatası:", error);
          return {
            ...category,
            recent_posts: [],
          };
        }
      });

      // İstemci HTML istiyorsa HTML formatında yanıt ver
      if (req.headers.accept?.includes("text/html")) {
        const html = `
          <!DOCTYPE html>
          <html lang="tr">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Forum Kategorileri</title>
              <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
              <style>
                  body {
                      background-color: #f8f9fa;
                  }
                  .categories-grid {
                      display: grid;
                      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                      gap: 1.5rem;
                  }
                  .category-card {
                      background: #fff;
                      border: 1px solid #e9ecef;
                      border-radius: 12px;
                      padding: 1.5rem;
                      transition: transform 0.15s ease, box-shadow 0.15s ease;
                  }
                  .category-card:hover {
                      transform: translateY(-3px);
                      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
                  }
                  .category-card-header {
                      display: flex;
                      justify-content: space-between;
                      align-items: flex-start;
                      gap: 0.75rem;
                      margin-bottom: 0.35rem;
                  }
                  .post-count-badge {
                      flex-shrink: 0;
                      background: #eef2ff;
                      color: #4338ca;
                      font-size: 0.75rem;
                      font-weight: 600;
                      padding: 0.25rem 0.65rem;
                      border-radius: 999px;
                      white-space: nowrap;
                  }
                  .category-description {
                      margin-bottom: 1.1rem;
                  }
                  .recent-posts-label {
                      font-size: 0.75rem;
                      font-weight: 700;
                      text-transform: uppercase;
                      letter-spacing: 0.04em;
                      color: #6366f1;
                      margin-bottom: 0.75rem;
                  }
                  .posts-list {
                      display: flex;
                      flex-direction: column;
                      gap: 0.6rem;
                      max-height: 320px;
                      overflow-y: auto;
                      padding-right: 6px;
                      margin: 0;
                  }
                  .post-item {
                      border: 1px solid #eef0f2;
                      border-radius: 8px;
                      padding: 0.7rem 0.9rem;
                      background: #fafbfc;
                  }
                  .post-item h4 {
                      font-size: 0.95rem;
                      margin-bottom: 0.25rem;
                  }
                  .post-item p {
                      font-size: 0.85rem;
                      margin-bottom: 0.4rem;
                  }
                  .post-meta {
                      font-size: 0.75rem;
                  }
                  .empty-state {
                      text-align: center;
                      color: #adb5bd;
                      font-size: 0.9rem;
                      padding: 1.25rem 0 0.25rem;
                  }
                  .posts-list::-webkit-scrollbar {
                      width: 8px;
                  }
                  .posts-list::-webkit-scrollbar-track {
                      background: #f1f1f1;
                      border-radius: 4px;
                  }
                  .posts-list::-webkit-scrollbar-thumb {
                      background: #ced4da;
                      border-radius: 4px;
                  }
                  .posts-list::-webkit-scrollbar-thumb:hover {
                      background: #adb5bd;
                  }
              </style>
          </head>
          <body>
              <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
                  <div class="container">
                      <a class="navbar-brand" href="/">Forum Sistemi</a>
                      <a href="/" class="btn btn-outline-light">Ana Sayfa</a>
                  </div>
              </nav>
              <div class="container py-5">
                  <h1 class="text-center mb-5">Forum Kategorileri</h1>
                  <div class="categories-grid">
                      ${processedCategories
                        .map((category) => {
                          const postCount = Number(category.post_count) || 0;
                          const recentPosts = category.recent_posts || [];
                          return `
                          <div class="category-card">
                              <div class="category-card-header">
                                  <h2 class="h4 mb-0">${escapeHtml(
                                    category.name
                                  )}</h2>
                                  <span class="post-count-badge">${postCount} gönderi</span>
                              </div>
                              <p class="category-description text-muted">${escapeHtml(
                                category.description
                              )}</p>
                              ${
                                recentPosts.length > 0
                                  ? `
                                  <div class="recent-posts-label">Son Gönderiler</div>
                                  <div class="posts-list">
                                      ${recentPosts
                                        .map(
                                          (post) => `
                                          <div class="post-item">
                                              <h4>${escapeHtml(post.title)}</h4>
                                              <p class="text-muted">${escapeHtml(
                                                post.content
                                              )}</p>
                                              <div class="post-meta text-muted">
                                                  Yazar: ${escapeHtml(
                                                    post.author_username
                                                  )} &middot;
                                                  ${new Date(
                                                    post.created_at
                                                  ).toLocaleString("tr-TR")}
                                              </div>
                                          </div>
                                      `
                                        )
                                        .join("")}
                                  </div>
                                  `
                                  : '<p class="empty-state mb-0">Bu kategoride henüz gönderi bulunmuyor.</p>'
                              }
                          </div>
                      `;
                        })
                        .join("")}
                  </div>
              </div>
          </body>
          </html>`;

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(processedCategories));
      }
    } catch (error) {
      console.error("Kategori getirme hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Kategoriler alınamadı" }));
    }
  }

  // ID ile kategori al
  async getCategoryById(req, res) {
    try {
      const categoryId = req.params.id;
      const sql = `
        SELECT c.*,
               parent.name as parent_name,
               (
                 SELECT COUNT(*)
                 FROM posts pc
                 JOIN topics tc ON pc.topic_id = tc.id
                 WHERE tc.category_id = c.id
               ) as post_count,
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
                   JOIN topics t ON p.topic_id = t.id
                   LEFT JOIN users u ON p.user_id = u.id
                   WHERE t.category_id = c.id
                   ORDER BY p.created_at DESC
                   LIMIT 5
                 ),
                 '[]'
               ) as recent_posts
        FROM categories c
        LEFT JOIN categories parent ON c.parent_id = parent.id
        WHERE c.id = :categoryId
      `;

      const [category] = await sequelize.query(sql, {
        replacements: { categoryId },
        type: sequelize.QueryTypes.SELECT,
      });

      if (!category) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Kategori bulunamadı" }));
        return;
      }

      category.recent_posts = category.recent_posts
        ? JSON.parse(category.recent_posts)
        : [];

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(category));
    } catch (error) {
      console.error("Kategori getirme hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Kategori alınamadı" }));
    }
  }

  // Kategori oluştur
  async createCategory(req, res) {
    try {
      const { name, description, parent_id } = req.body;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      const sql = `
        INSERT INTO categories (name, slug, description, parent_id)
        VALUES (:name, :slug, :description, :parent_id)
      `;

      const [result] = await sequelize.query(sql, {
        replacements: { name, slug, description, parent_id },
        type: sequelize.QueryTypes.INSERT,
      });
      // Yeni kategori eklendikten sonra Redis'i güncelle
      const categories = await getCategoriesWithCache(redisClient);

      // Redis'e kaydetme
      await redisClient.set(
        "categories",
        JSON.stringify(categories),
        "EX",
        3600
      );
      console.log("Kategoriler Redist'e güncellendi");
      const [newCategory] = await sequelize.query(
        "SELECT * FROM categories WHERE id = :id",
        {
          replacements: { id: result },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      // Redis önbelleğini temizle
      if (redisClient?.isOpen) {
        await redisClient.del("categories");
        await redisClient.del("all_posts");
        console.log("Yeni kategori oluşturuldu, Redis önbelleği temizlendi");
      }

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(newCategory));
    } catch (error) {
      console.error("Kategori oluşturma hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Kategori oluşturulamadı" }));
    }
  }

  // Kategori güncelle
  async updateCategory(req, res) {
    try {
      const categoryId = req.params.id;
      const { name, description, parent_id } = req.body;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      const sql = `
        UPDATE categories
        SET name = :name,
            slug = :slug,
            description = :description,
            parent_id = :parent_id,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :categoryId
      `;

      await sequelize.query(sql, {
        replacements: { categoryId, name, slug, description, parent_id },
        type: sequelize.QueryTypes.UPDATE,
      });

      const [updatedCategory] = await sequelize.query(
        "SELECT * FROM categories WHERE id = :id",
        {
          replacements: { id: categoryId },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      // Redis önbelleğini temizle
      if (redisClient?.isOpen) {
        await redisClient.del("categories");
        await redisClient.del("all_posts");
        console.log("Kategori güncellemesi sonrası Redis önbelleği temizlendi");
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(updatedCategory));
    } catch (error) {
      console.error("Kategori güncelleme hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Kategori güncellenemedi" }));
    }
  }

  // Kategori sil
  async deleteCategory(req, res) {
    try {
      const categoryId = req.params.id;
      const sql = `DELETE FROM categories WHERE id = :categoryId`;

      await sequelize.query(sql, {
        replacements: { categoryId },
        type: sequelize.QueryTypes.DELETE,
      });

      // Redis önbelleğini temizle
      if (redisClient?.isOpen) {
        await redisClient.del("categories");
        await redisClient.del("all_posts");
        console.log("Kategori silindi, Redis önbelleği temizlendi");
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Kategori başarıyla silindi" }));
    } catch (error) {
      console.error("Kategori silme hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Kategori silinemedi" }));
    }
  }
}

const categoryController = new CategoryController();
export default categoryController;
