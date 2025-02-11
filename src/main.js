import http from "http";
import { Redis } from "ioredis";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import url from "url";
import { initDb, seedDb } from "./utilities/db.js";
import { authRoutes } from "./routes/authRoutes.js";
import { postRoutes } from "./routes/postRoutes.js";
import { categoryRoutes } from "./routes/categoryRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Redis bağlantısı
const redisClient = new Redis();

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
const initializeDatabase = async () => {
  try {
    await initDb();
    await seedDb();
    console.log("Veritabanı başarıyla başlatıldı");
  } catch (error) {
    console.error("Veritabanı başlatma hatası:", error);
    process.exit(1);
  }
};

// Uygulamayı başlat
const startApp = async () => {
  try {
    await initializeDatabase();

    // HTTP sunucusunu oluştur
    const server = http.createServer(async (req, res) => {
      setIpMiddleware(req, res, async () => {
        try {
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
    });

    // Sunucuyu dinle
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Sunucu ${PORT} portunda çalışıyor`);
    });
  } catch (error) {
    console.error("Uygulama başlatma hatası:", error);
    process.exit(1);
  }
};

// Uygulamayı başlat
startApp();
