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
      const html = generateCategoryHTML(categories);
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
