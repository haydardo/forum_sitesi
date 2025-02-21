import categoryController from "../controllers/categoryController.js";
import { sequelize } from "../utilities/db.js";

// SQL sorgusu
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

// Kategorileri önbellekten veya veritabanından getir
export async function getCategoriesWithCache(redisClient) {
  try {
    // Redis bağlantı kontrolü
    if (!redisClient) {
      console.error("Redis client tanımlı değil");
      return null;
    }

    console.log("Redis bağlantı durumu:", redisClient.status);

    // Önbellekten veri okuma denemesi
    try {
      const cachedData = await redisClient.get("categories");
      console.log("Önbellekten alınan veri:", cachedData);

      if (cachedData) {
        console.log("Kategoriler önbellekten alındı");
        return JSON.parse(cachedData);
      }
    } catch (error) {
      console.error("Redis okuma hatası:", error);
    }

    // Veritabanından kategorileri al
    const categories = await sequelize.query(sqlQuery, {
      type: sequelize.QueryTypes.SELECT,
    });

    // Kategorileri işle
    const processedCategories = categories.map((category) => ({
      ...category,
      recent_posts: category.recent_posts
        ? JSON.parse(category.recent_posts)
        : [],
    }));

    // Redis'e kaydetme denemesi
    // Redis'e kaydetme denemesi
    try {
      if (redisClient.status === "ready") {
        await redisClient.set(
          "categories",
          JSON.stringify(processedCategories),
          "EX",
          3600
        );
        console.log("Kategoriler Redis'e kaydedildi");
      }
    } catch (error) {
      console.error("Redis yazma hatası:", error);
    }

    return processedCategories;
  } catch (error) {
    console.error("Kategori getirme hatası:", error);
    return null;
  }
}

// Ana route handler
export const categoryRoutes = async (req, res, redisClient) => {
  const method = req.method;
  const pathname = req.url;

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
};

export default categoryRoutes;
