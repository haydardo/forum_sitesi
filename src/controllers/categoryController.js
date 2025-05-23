import { sequelize } from "../utilities/db.js";
import { getCategoriesWithCache } from "../routes/categoryRoutes.js";

class CategoryController {
  // Kategorileri ve son gönderileri al
  async getAllCategories(req, res, redisClient) {
    try {
      // SQL sorgusunu tanımla
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
                    'title', REGEXP_REPLACE(p.title, '[\\n\\r\\t]', ' '),
                    'content', REGEXP_REPLACE(SUBSTRING(p.content, 1, 100), '[\\n\\r\\t]', ' '),
                    'created_at', DATE_FORMAT(p.created_at, '%Y-%m-%dT%H:%i:%s.000Z'),
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
                  .category-card {
                      transition: transform 0.2s;
                      margin-bottom: 20px;
                      height: calc(100vh - 250px);
                      display: flex;
                      flex-direction: column;
                  }
                  .category-card:hover {
                      transform: translateY(-5px);
                  }
                  .category-card .card-body {
                      display: flex;
                      flex-direction: column;
                      height: 100%;
                      overflow: hidden;
                  }
                  .category-header {
                      margin-bottom: 1rem;
                  }
                  .posts-container {
                      flex: 1;
                      overflow-y: auto;
                      padding-right: 8px;
                  }
                  .list-group {
                      margin-bottom: 0;
                  }
                  .posts-container::-webkit-scrollbar {
                      width: 8px;
                  }
                  .posts-container::-webkit-scrollbar-track {
                      background: #f1f1f1;
                      border-radius: 4px;
                  }
                  .posts-container::-webkit-scrollbar-thumb {
                      background: #888;
                      border-radius: 4px;
                  }
                  .posts-container::-webkit-scrollbar-thumb:hover {
                      background: #555;
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
                  <h1 class="text-center mb-4">Forum Kategorileri</h1>
                  <div class="row">
                      ${processedCategories
                        .map(
                          (category) => `
                          <div class="col-md-6">
                              <div class="card category-card shadow-sm">
                                  <div class="card-body">
                                      <div class="category-header">
                                          <h2 class="card-title h4">${
                                            category.name
                                          }</h2>
                                          <p class="card-text text-muted">${
                                            category.description
                                          }</p>
                                      </div>
                                      ${
                                        category.recent_posts &&
                                        category.recent_posts.length > 0
                                          ? `
                                          <div class="posts-container">
                                              <h3 class="h5 text-primary">Son Gönderiler</h3>
                                              <div class="list-group">
                                                  ${category.recent_posts
                                                    .map(
                                                      (post) => `
                                                      <div class="list-group-item">
                                                          <h4 class="h6 mb-1">${
                                                            post.title
                                                          }</h4>
                                                          <p class="text-muted mb-1">${
                                                            post.content
                                                          }</p>
                                                          <small class="text-muted">
                                                              Yazar: ${
                                                                post.author_username
                                                              } | 
                                                              Tarih: ${new Date(
                                                                post.created_at
                                                              ).toLocaleString(
                                                                "tr-TR"
                                                              )}
                                                          </small>
                                                      </div>
                                                  `
                                                    )
                                                    .join("")}
                                              </div>
                                          </div>
                                          `
                                          : '<p class="text-muted">Bu kategoride henüz gönderi bulunmuyor.</p>'
                                      }
                                  </div>
                              </div>
                          </div>
                      `
                        )
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
               p.name as parent_name,
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
                   ORDER BY p.created_at DESC
                   LIMIT 5
                 ),
                 '[]'
               ) as recent_posts
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
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
