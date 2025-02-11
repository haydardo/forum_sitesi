import { Category, Post, User } from "../models/index.js";

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
            as: "posts",
            attributes: ["id", "title", "content", "created_at"],
            include: [
              {
                model: User,
                as: "author",
                attributes: ["username"],
              },
            ],
            order: [["created_at", "DESC"]],
            separate: true, // Önce postları getirir sonra ona ait kategorileri getirir.
          },
        ],
        where: {
          parent_id: null,
        },
        attributes: ["id", "name", "slug", "description"],
      });

      // Tarihleri formatla
      const formattedCategories = categories.map((category) => {
        //elemanları tek tek işler ve yeni bir dizi oluşturur.
        const categoryJson = category.toJSON();
        return {
          ...categoryJson,
          posts: categoryJson.posts?.map((post) => ({
            ...post,
            created_at: post.created_at
              ? new Date(post.created_at).toISOString()
              : null,
          })),
        };
      });

      // Redis önbelleğe kaydet
      if (redisClient?.isOpen) {
        await redisClient.setEx(
          "categories",
          3600,
          JSON.stringify(formattedCategories)
        );
        console.log("Kategoriler önbelleğe kaydedildi");
      }

      // İstek tipine göre yanıt
      if (req.headers.accept?.includes("application/json")) {
        return sendResponse(res, 200, formattedCategories);
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
                  height: calc(100vh - 250px); /* Sabit yükseklik */
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
              /* Scroll bar stilleri */
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
                  ${formattedCategories
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
                                    category.posts && category.posts.length > 0
                                      ? `
                                      <div class="posts-container">
                                          <h3 class="h5 text-primary">Son Gönderiler</h3>
                                          <div class="list-group">
                                              ${category.posts
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
                                                      <small class="text-muted">
                                                          Yazar: ${
                                                            post.author
                                                              ? post.author
                                                                  .username
                                                              : "Anonim"
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

  async getCategoryPosts(req, res) {
    try {
      const categoryId = req.params.id;
      const category = await Category.findByPk(categoryId, {
        include: [
          {
            model: Post,
            as: "posts",
            include: [
              {
                model: User,
                as: "author",
                attributes: ["username"],
              },
            ],
            order: [["created_at", "DESC"]],
            attributes: {
              include: [
                "id",
                "title",
                "content",
                "created_at",
                "updated_at",
                "like_count",
              ],
            },
          },
        ],
      });

      if (!category) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Kategori bulunamadı" }));
        return;
      }

      // Gönderilerin tarihlerini formatla
      const formattedCategory = {
        ...category.toJSON(),
        posts: category.posts.map((post) => ({
          ...post,
          created_at: post.created_at
            ? new Date(post.created_at).toISOString()
            : null,
          updated_at: post.updated_at
            ? new Date(post.updated_at).toISOString()
            : null,
        })),
      };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(formattedCategory));
    } catch (error) {
      console.error("Kategori gönderileri alınırken hata:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Kategori gönderileri alınamadı" }));
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

export default categoryController;
