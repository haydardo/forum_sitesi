import http from "http";
import { Redis } from "ioredis";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import url from "url";
import { sequelize } from "./utilities/db.js";
import { authRoutes } from "./routes/authRoutes.js";
import { postRoutes } from "./routes/postRoutes.js";
import { categoryRoutes } from "./routes/categoryRoutes.js";
import seedCategories from "./seeders/20240320-categories.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Redis bağlantısı
const redisClient = new Redis({
  host: "localhost",
  port: 6379,
  enableOfflineQueue: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redisClient.on("connect", () => {
  console.log("Redis bağlantısı başarılı");
});

redisClient.on("error", (err) => {
  console.log("Redis bağlantı hatası:", err);
});
//Redis bağlantısını bekle
await redisClient.connect().catch((error) => {
  console.error("Bağlantı hatası", error);
});
try {
  await redisClient.ping();
  console.log("Redis ping başarılı");
} catch (error) {
  console.error("Redis ping hatası", error);
}
// Statik dosya sunucusu
const serveStaticFile = async (req, res) => {
  console.log("İstenen URL:", req.url);

  let filePath;
  // URL yönlendirmelerini düzenle
  if (req.url === "/") {
    filePath = path.join(__dirname, "../public/index.html");
  } else if (req.url === "/login" || req.url === "/giris") {
    filePath = path.join(__dirname, "../public/login.html");
  } else if (req.url === "/register" || req.url === "/kayit") {
    filePath = path.join(__dirname, "../public/register.html");
  } else if (req.url.startsWith("/api/")) {
    return false; // API isteklerini işleme
  } else if (req.url.match(/^\/posts\/\d+$/)) {
    filePath = path.join(__dirname, "../public/post.html");
  } else {
    filePath = path.join(__dirname, "../public", req.url);
  }

  console.log("Dosya yolu:", filePath);

  const contentType = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
  };

  try {
    // Favicon isteğini kontrol et
    if (filePath.endsWith("favicon.ico")) {
      res.writeHead(204); // No Content
      res.end();
      return;
    }
    const content = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": contentType[ext] || "text/plain" });
    res.end(content);
    return true;
  } catch (error) {
    console.error("Dosya okuma hatası:", error);
    if (error.code === "ENOENT") {
      if (req.url.startsWith("/api/")) return false;
      // Ana sayfaya yönlendir
      const indexContent = await fs.promises.readFile(
        path.join(__dirname, "../public/index.html")
      );
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(indexContent);
    } else {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Sunucu Hatasi");
    }
    return true;
  }
};

// Veritabanını başlat
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: false }); // Mevcut verileri koruyoruz

    // Sadece kategorileri seed et
    await seedCategories();

    console.log("Veritabanı başarıyla başlatıldı");
  } catch (error) {
    console.error("Veritabanı başlatılırken hata:", error);
  }
}

// Server oluşturma fonksiyonu
export function createServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const clientIp =
        req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      req.clientIp = clientIp;

      // CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );

      // OPTIONS isteklerini yanıtla
      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      // POST istekleri için body parsing
      if (req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        await new Promise((resolve, reject) => {
          req.on("end", () => {
            try {
              if (body) {
                req.body = JSON.parse(body);
                console.log("Gelen veri:", req.body); // Debug için
              }
              resolve();
            } catch (error) {
              console.error("Body parsing hatası:", error); // Debug için
              reject(error);
            }
          });
          req.on("error", reject);
        });
      }

      // Statik dosya kontrolü
      const isStaticFile = await serveStaticFile(req, res);
      if (isStaticFile) return;

      const parsedUrl = url.parse(req.url, true);
      console.log("Gelen istek:", parsedUrl.pathname);

      // API routes
      if (parsedUrl.pathname.startsWith("/api/auth/")) {
        await authRoutes(req, res);
        return;
      }

      if (parsedUrl.pathname.startsWith("/api/posts")) {
        await postRoutes(req, res);
        return;
      }

      if (parsedUrl.pathname.startsWith("/api/categories")) {
        console.log("Redis client durum:", redisClient.status);
        console.log("Redis bağlantısı açık mı:", redisClient.isOpen);
        await categoryRoutes(req, res, redisClient);
        return;
      }

      // API endpoint'i bulunamadı
      if (parsedUrl.pathname.startsWith("/api/")) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "API endpoint'i bulunamadi" }));
        return;
      }
    } catch (error) {
      console.error("Sunucu hatasi:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Sunucu hatasi" }));
    }
  });
  return server;
}

// Server başlatma fonksiyonu
export async function startServer(port = process.env.PORT || 3001) {
  const server = createServer();
  await sequelize.sync({ alter: true });
  server.listen(port, () => {
    console.log(`Sunucu ${port} portunda çalışıyor`);
  });
  return server;
}

// Ana uygulama başlatma fonksiyonu
async function startApp() {
  try {
    await initializeDatabase();
    await startServer();
  } catch (error) {
    console.error("Uygulama başlatılırken hata:", error);
    process.exit(1);
  }
}
// Ana uygulama sadece direkt çalıştırıldığında başlasın
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startApp();
}
