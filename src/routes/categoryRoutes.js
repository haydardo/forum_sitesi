const { Category, Post, User } = require("../models/index");
const categoryController = require("../controllers/categoryController");

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
          model: Category,
          as: "subCategories",
          attributes: ["id", "name", "description"],
        },
        {
          model: Post,
          as: "Posts",
          attributes: ["id", "title", "content", "createdAt"],
          include: [
            {
              model: User,
              as: "author",
              attributes: ["username"],
            },
          ],
          order: [["createdAt", "DESC"]],
          separate: true, // kategori ve postları ayrı ayrı getir
        },
      ],
      where: {
        parent_id: null,
      },
      attributes: ["id", "name", "slug", "description"],
    });

    // Redis bağlantısı varsa önbelleğe kaydet
    if (redisClient?.isOpen) {
      await redisClient.setEx("categories", 3600, JSON.stringify(categories)); // 1 saat
      console.log("Kategoriler önbelleğe kaydedildi");
    }

    return categories;
  } catch (error) {
    console.error("Kategori getirme hatası:", error);
    throw error;
  }
}

async function categoryRoutes(req, res, redisClient) {
  if (req.method === "GET") {
    try {
      console.log("Kategori isteği alındı");
      const categories = await getCategoriesWithCache(redisClient);
      console.log("Bulunan kategoriler:", categories);

      // İstek header'larını kontrol et
      const acceptHeader = req.headers.accept || "";

      // Eğer API isteği ise JSON döndür
      if (acceptHeader.includes("application/json")) {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        return res.end(JSON.stringify(categories));
      }

      // HTML template oluştur
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
              }
              .category-card:hover {
                  transform: translateY(-5px);
              }
              .subcategory {
                  margin-left: 20px;
                  border-left: 3px solid #e9ecef;
                  padding-left: 20px;
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
                  ${categories
                    .map(
                      (category) => `
                      <div class="col-md-6">
                          <div class="card category-card shadow-sm">
                              <div class="card-body">
                                  <h2 class="card-title h4">${
                                    category.name
                                  }</h2>
                                  <p class="card-text text-muted">${
                                    category.description
                                  }</p>
                                  ${
                                    category.Posts && category.Posts.length > 0
                                      ? `
                                      <div class="mt-3">
                                          <h3 class="h5 text-primary">Son Gönderiler</h3>
                                          <div class="list-group">
                                              ${category.Posts.slice(0, 3)
                                                .map(
                                                  (post) => `
                                                  <div class="list-group-item">
                                                      <h4 class="h6 mb-1">${
                                                        post.title
                                                      }</h4>
                                                      <p class="text-muted mb-1">${post.content.substring(
                                                        0,
                                                        100
                                                      )}...</p>
                                                      <small class="text-muted">Yazar: ${
                                                        post.author
                                                          ? post.author.username
                                                          : "Anonim"
                                                      }</small>
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
    } catch (error) {
      console.error("Kategori hatası:", error);
      handleError(res, error);
    }
  }

  // Diğer HTTP metodları için controller fonksiyonlarını kullan
  try {
    switch (req.method) {
      case "POST":
        await categoryController.createCategory(req, res);
        break;
      case "PUT":
        if (req.url.match(/^\/api\/categories\/\d+$/)) {
          const id = req.url.split("/")[3];
          await categoryController.updateCategory(req, res, id);
        }
        break;
      case "DELETE":
        if (req.url.match(/^\/api\/categories\/\d+$/)) {
          const id = req.url.split("/")[3];
          await categoryController.deleteCategory(req, res, id);
        }
        break;
    }
  } catch (error) {
    console.error("Kategori route hatası:", error);
    handleError(res, error);
  }
}

function handleError(res, error) {
  const statusCode =
    error.name === "SequelizeUniqueConstraintError" ? 400 : 500;
  const message =
    statusCode === 400 ? "Bu kategori adı zaten kullanılıyor" : "Sunucu hatası";

  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message }));
}

module.exports = categoryRoutes;
