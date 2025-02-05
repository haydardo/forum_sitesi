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
  const method = req.method;
  const url = req.url;

  try {
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
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Sunucu hatası" }));
  }
}

module.exports = categoryRoutes;
