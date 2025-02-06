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
          separate: true,
        },
      ],
      where: {
        parent_id: null,
      },
      attributes: ["id", "name", "slug", "description"],
    });

    // Tarih alanlarını düzenle
    const formattedCategories = categories.map((category) => {
      const posts = category.posts.map((post) => ({
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
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    switch (method) {
      case "GET":
        if (pathname === "/api/categories") {
          await categoryController.getAllCategories(req, res, redisClient);
        } else if (pathname.match(/^\/api\/categories\/\d+$/)) {
          const id = pathname.split("/")[3];
          await categoryController.getCategoryById(req, res, id);
        }
        break;

      case "POST":
        if (pathname === "/api/categories") {
          await categoryController.createCategory(req, res);
        }
        break;

      case "PUT":
        if (pathname.match(/^\/api\/categories\/\d+$/)) {
          const id = pathname.split("/")[3];
          await categoryController.updateCategory(req, res, id);
        }
        break;

      case "DELETE":
        if (pathname.match(/^\/api\/categories\/\d+$/)) {
          const id = pathname.split("/")[3];
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
    res.end(JSON.stringify({ message: "Sunucu hatası", error: error.message }));
  }
}

module.exports = categoryRoutes;
