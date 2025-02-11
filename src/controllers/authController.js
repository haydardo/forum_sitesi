import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import db from "../models/index.js";
import { Op } from "sequelize";
import { z } from "zod";
const { User } = db;

class AuthController {
  async register(req, res) {
    const schema = z.object({
      username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalıdır."),
      email: z.string().email("Geçerli bir e-posta adresi girin."),
      password: z.string().min(6, "Şifre en az 6 karakter olmalıdır."),
    });

    try {
      schema.parse(req.body);
      const { username, email, password } = req.body;

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
      if (error instanceof z.ZodError) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: error.errors[0].message }));
        return;
      }
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Kayıt işlemi başarısız" }));
    }
  }

  async login(req, res) {
    const schema = z.object({
      username: z.string().nonempty("Kullanıcı adı zorunludur."),
      password: z.string().nonempty("Şifre zorunludur."),
    });

    try {
      // CORS başlıkları ekle
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      // Validasyon
      schema.parse(req.body);
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
      if (error instanceof z.ZodError) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: error.errors[0].message }));
        return;
      }
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
