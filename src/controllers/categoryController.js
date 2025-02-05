const { Category, Post, User } = require("../models");
const url = require("url");

const categoryController = {
  // Tüm kategorileri getir
  async getAllCategories(req, res, redisClient) {
    try {
      // Redis önbellek kontrolü
      if (redisClient?.isOpen) {
        const cachedData = await redisClient.get("categories");
        if (cachedData) {
          console.log("Kategoriler önbellekten alındı");
          const categories = JSON.parse(cachedData);
          return sendResponse(res, 200, categories);
        }
      }

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
            separate: true,
          },
        ],
        where: {
          parent_id: null,
        },
        attributes: ["id", "name", "slug", "description"],
      });

      // Redis önbelleğe kaydet
      if (redisClient?.isOpen) {
        await redisClient.setEx("categories", 3600, JSON.stringify(categories));
        console.log("Kategoriler önbelleğe kaydedildi");
      }

      // İstek tipine göre yanıt
      if (req.headers.accept?.includes("application/json")) {
        return sendResponse(res, 200, categories);
      }

      // HTML template render
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

      sendHTMLResponse(res, html);
    } catch (error) {
      console.error("Kategori getirme hatası:", error);
      handleError(res, error);
    }
  },

  // ID'ye göre kategori getir
  async getCategoryById(req, res, id) {
    try {
      const category = await Category.findByPk(id, {
        include: [
          {
            model: Post,
            attributes: ["id", "title"],
          },
        ],
      });

      if (!category) {
        return sendResponse(res, 404, { message: "Kategori bulunamadı" });
      }

      sendResponse(res, 200, category);
    } catch (error) {
      handleError(res, error);
    }
  },

  // Yeni kategori oluştur
  async createCategory(req, res) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const { name, description } = JSON.parse(body);
        const slug = name.toLowerCase().replace(/ /g, "-");

        const category = await Category.create({ name, slug, description });
        sendResponse(res, 201, category);
      } catch (error) {
        handleError(res, error);
      }
    });
  },

  // Kategori güncelle
  async updateCategory(req, res, id) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const { name, description } = JSON.parse(body);
        const slug = name.toLowerCase().replace(/ /g, "-");

        const category = await Category.findByPk(id);
        if (!category) {
          return sendResponse(res, 404, { message: "Kategori bulunamadı" });
        }

        const updatedCategory = await category.update({
          name,
          slug,
          description,
        });
        sendResponse(res, 200, updatedCategory);
      } catch (error) {
        handleError(res, error);
      }
    });
  },

  // Kategori sil
  async deleteCategory(req, res, id) {
    try {
      const category = await Category.findByPk(id);
      if (!category) {
        return sendResponse(res, 404, { message: "Kategori bulunamadı" });
      }

      await category.destroy();
      sendResponse(res, 200, { message: "Kategori başarıyla silindi" });
    } catch (error) {
      handleError(res, error);
    }
  },
};

// Yardımcı fonksiyonlar
function sendResponse(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

function sendHTMLResponse(res, html) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function handleError(res, error) {
  console.error("Kategori işlem hatası:", error);
  const statusCode =
    error.name === "SequelizeUniqueConstraintError" ? 400 : 500;
  const message =
    statusCode === 400 ? "Bu kategori adı zaten kullanılıyor" : "Sunucu hatası";
  sendResponse(res, statusCode, { message });
}

module.exports = categoryController;
