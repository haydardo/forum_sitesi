const jwt = require("jsonwebtoken");
const { User, sequelize } = require("../models");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");

async function authRoutes(req, res) {
  const method = req.method;
  const path = req.url;

  // Login işlemi
  if (path === "/api/auth/login" && method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const { username, password } = JSON.parse(body);
        const user = await User.findOne({ where: { username } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ message: "Geçersiz kullanıcı adı veya şifre" })
          );
          return;
        }

        const token = jwt.sign(
          { id: user.id, username: user.username },
          process.env.JWT_SECRET || "gizli_anahtar",
          { expiresIn: "24h" }
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ token, username: user.username }));
      } catch (error) {
        console.error("giriş hatası:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Giriş işlemi başarısız" }));
      }
    });
  }

  // Register işlemi
  else if (path === "/api/auth/register" && method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const { username, email, password } = JSON.parse(body);

        // Validasyon
        if (!username || !email || !password) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "Tüm alanlar zorunludur" }));
          return;
        }

        // Kullanıcı adı veya email kontrolü op ifadesi sequelize or koşulları için kullanılır
        const existingUser = await User.findOne({
          where: {
            [Op.or]: [{ username }, { email }],
          },
        });

        if (existingUser) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              message: "Bu kullanıcı adı veya email zaten kullanılıyor",
            })
          );
          return;
        }

        // Şifreyi hashle
        const hashedPassword = await bcrypt.hash(password, 10);

        // Kullanıcıyı oluştur
        const user = await User.create({
          username,
          email,
          password: hashedPassword,
        });

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Kayıt başarılı",
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
            },
          })
        );
      } catch (error) {
        console.error("Kayıt hatası:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Kayıt işlemi başarısız" }));
      }
    });
  }
}

module.exports = authRoutes;
