import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import db from "../models/index.js";
import { Op } from "sequelize";

const { User } = db;

class AuthController {
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // Validasyon
      if (!username || !password || !email) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Kullanıcı adı, email ve şifre zorunludur",
          })
        );
        return;
      }

      // Kullanıcı kontrolü
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

      // Şifre hashleme
      const hashedPassword = await bcrypt.hash(password, 10);

      // Kullanıcı oluşturma
      const user = await User.create({
        username,
        email,
        password: hashedPassword,
      });

      // Token oluştur
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET || "gizli_anahtar",
        { expiresIn: "24h" }
      );

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "Kayıt başarılı",
          token,
          username: user.username,
        })
      );
    } catch (error) {
      console.error("Kayıt hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Kayıt işlemi başarısız" }));
    }
  }

  async login(req, res) {
    try {
      // CORS başlıkları ekle
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      const { username, password } = req.body;

      // Kullanıcıyı bul
      const user = await User.findOne({ where: { username } });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ message: "Geçersiz kullanıcı adı veya şifre" })
        );
        return;
      }

      // JWT token oluştur
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET || "gizli_anahtar",
        { expiresIn: "24h" }
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "Giriş başarılı",
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        })
      );
    } catch (error) {
      console.error("Giriş hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Giriş işlemi başarısız" }));
    }
  }

  async logout(req, res) {
    try {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Başarıyla çıkış yapıldı" }));
    } catch (error) {
      console.error("Çıkış hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Çıkış işlemi başarısız" }));
    }
  }
}

const authController = new AuthController();
export default authController;
