const { Category, Post, User } = require("../models");
const categoryController = require("../controllers/categoryController");
const path = require("path");
const fs = require("fs").promises;

// Kategorileri önbellekten veya veritabanından getir
async function getCategoriesWithCache(redisClient) {
  try {
    // Redis bağlantısı varsa önbellekten kontrol et
    if (redisClient?.isOpen) {
      const cachedData = await redisClient.get("categories");
      if (cachedData) {
        console.log("Kategoriler önbellekten alındı");
        return JSON.parse(cachedData);
      }
    }

    // Veritabanından getir
    const categories = await Category.findAll({
      include: [
        {
          model: Post,
          as: "Posts",
          attributes: [
            "id",
            "title",
            "content",
            ["created_at", "createdAt"],
            "category_id",
          ],
          include: [
            {
              model: User,
              as: "author",
              attributes: ["id", "username"],
            },
          ],
          order: [["created_at", "DESC"]],
        },
      ],
      order: [
        ["created_at", "DESC"],
        [{ model: Post, as: "Posts" }, "created_at", "DESC"],
      ],
      raw: false,
      nest: true,
    });

    // Tarih alanlarını düzenle
    const formattedCategories = categories.map((category) => {
      const posts = category.Posts.map((post) => ({
        ...post.get(),
        createdAt: post.created_at,
        updatedAt: post.updated_at,
      }));
      return {
        ...category.get(),
        posts: posts,
      };
    });

    // Redis bağlantısı varsa önbelleğe kaydet
    if (redisClient?.isOpen) {
      await redisClient.setEx(
        "categories",
        3600,
        JSON.stringify(formattedCategories)
      );
      console.log("Kategoriler önbelleğe kaydedildi");
    }

    return formattedCategories;
  } catch (error) {
    console.error("Kategori getirme hatası:", error);
    throw error;
  }
}

async function categoryRoutes(req, res, redisClient) {
  const method = req.method;
  const url = req.url;

  try {
    if (method === "GET" && url === "/api/categories") {
      const categories = await getCategoriesWithCache(redisClient);

      // API isteği için JSON yanıt
      if (req.headers.accept?.includes("application/json")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(categories));
      }

      // HTML yanıt için template oluştur
      let html = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Forum Kategorileri</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Inter', sans-serif;
              line-height: 1.6;
              color: #1a1a1a;
              background-color: #f0f2f5;
              min-height: 100vh;
              padding: 2rem;
            }

            .container {
              max-width: 1400px;
              margin: 0 auto;
            }

            .header {
              background: #fff;
              padding: 2rem;
              border-radius: 12px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              margin-bottom: 2rem;
              text-align: center;
            }

            h1 {
              color: #1a1a1a;
              font-size: 2rem;
              font-weight: 600;
              margin-bottom: 0.5rem;
            }

            .header-subtitle {
              color: #666;
              font-size: 1.1rem;
            }

            .categories-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 2rem;
              margin-bottom: 2rem;
            }

            .category {
              background: #fff;
              border-radius: 12px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              overflow: hidden;
              display: flex;
              flex-direction: column;
              height: calc(100vh - 200px);
            }

            .category-header {
              padding: 1.5rem;
              background: #f8f9fa;
              border-bottom: 1px solid #e9ecef;
            }

            .category h2 {
              color: #1a1a1a;
              font-size: 1.25rem;
              font-weight: 600;
              margin-bottom: 0.5rem;
            }

            .category-description {
              color: #666;
              font-size: 0.9rem;
            }

            .posts {
              padding: 1.5rem;
              overflow-y: auto;
              flex-grow: 1;
            }

            .post {
              background: #f8f9fa;
              border-radius: 8px;
              padding: 1.25rem;
              margin-bottom: 1rem;
              border: 1px solid #e9ecef;
              transition: all 0.2s ease;
            }

            .post:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }

            .post:last-child {
              margin-bottom: 0;
            }

            .post-title {
              color: #1a1a1a;
              font-size: 1.1rem;
              font-weight: 600;
              margin-bottom: 0.75rem;
            }

            .post-content {
              color: #444;
              font-size: 0.9rem;
              margin-bottom: 1rem;
              line-height: 1.6;
              display: -webkit-box;
              -webkit-line-clamp: 3;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }

            .post-meta {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-top: 0.75rem;
              border-top: 1px solid #e9ecef;
              font-size: 0.85rem;
            }

            .post-author {
              color: #2563eb;
              display: flex;
              align-items: center;
              gap: 0.5rem;
            }

            .post-date {
              color: #666;
            }

            .empty-posts {
              text-align: center;
              padding: 2rem;
              color: #666;
              font-style: italic;
              background: #f8f9fa;
              border-radius: 8px;
            }

            @media (max-width: 1200px) {
              .categories-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }

            @media (max-width: 768px) {
              body {
                padding: 1rem;
              }

              .categories-grid {
                grid-template-columns: 1fr;
              }

              .category {
                height: auto;
                max-height: 500px;
              }

              .header {
                padding: 1.5rem;
              }

              .category-header,
              .posts,
              .post {
                padding: 1rem;
              }

              h1 {
                font-size: 1.75rem;
              }

              .category h2 {
                font-size: 1.2rem;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Forum Kategorileri</h1>
              <div class="header-subtitle">Tüm kategoriler ve son gönderiler</div>
            </div>
            <div class="categories-grid">
      `;

      categories.forEach((category) => {
        html += `
          <div class="category">
            <div class="category-header">
              <h2>${category.name}</h2>
              <div class="category-description">
                ${
                  category.description ||
                  "Bu kategori için henüz açıklama eklenmemiş."
                }
              </div>
            </div>
            <div class="posts">
        `;

        if (category.posts && category.posts.length > 0) {
          category.posts.forEach((post) => {
            html += `
              <div class="post">
                <div class="post-title">${post.title}</div>
                <div class="post-content">${post.content}</div>
                <div class="post-meta">
                  <span class="post-author">
                    <i class="fas fa-user"></i>
                    ${post.author?.username || "Anonim"}
                  </span>
                  <span class="post-date">
                    ${new Date(post.createdAt).toLocaleString("tr-TR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            `;
          });
        } else {
          html += `
            <div class="empty-posts">
              <i class="fas fa-inbox"></i>
              Bu kategoride henüz gönderi bulunmuyor.
            </div>
          `;
        }

        html += `
            </div>
          </div>
        `;
      });

      html += `
            </div>
          </div>
        </body>
        </html>
      `;

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(html);
    }

    switch (method) {
      case "GET":
        await categoryController.getAllCategories(req, res, redisClient);
        break;
      case "POST":
        await categoryController.createCategory(req, res);
        break;
      case "PUT":
        if (url.match(/^\/api\/categories\/\d+$/)) {
          const id = url.split("/")[3];
          await categoryController.updateCategory(req, res, id);
        }
        break;
      case "DELETE":
        if (url.match(/^\/api\/categories\/\d+$/)) {
          const id = url.split("/")[3];
          await categoryController.deleteCategory(req, res, id);
        }
        break;
      default:
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Method not allowed" }));
    }
  } catch (error) {
    console.error("Category route hatası:", error);
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <html>
        <body>
          <h1>Hata Oluştu</h1>
          <p>Üzgünüz, bir hata oluştu: ${error.message}</p>
          <a href="/">Ana Sayfaya Dön</a>
        </body>
      </html>
    `);
  }
}

module.exports = categoryRoutes;
