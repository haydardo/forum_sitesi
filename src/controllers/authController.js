import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { sequelize } from "../utilities/db.js";
import { z } from "zod";

// Kullanıcı doğrulama şeması
const userSchema = z.object({
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalıdır."),
  email: z.string().email("Geçerli bir e-posta adresi girin."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır."),
});

class AuthController {
  async register(req, res) {
    try {
      // Gelen veriyi doğrula
      const validatedData = userSchema.parse(req.body);

      // Kullanıcı kontrolü
      const checkUserSql = `
        SELECT * FROM users 
        WHERE username = :username OR email = :email
      `;

      const [existingUser] = await sequelize.query(checkUserSql, {
        replacements: {
          username: validatedData.username,
          email: validatedData.email,
        },
        type: sequelize.QueryTypes.SELECT,
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
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Kullanıcı oluşturma
      const insertUserSql = `
        INSERT INTO users (username, email, password)
        VALUES (:username, :email, :password)
      `;

      const [result] = await sequelize.query(insertUserSql, {
        replacements: {
          username: validatedData.username,
          email: validatedData.email,
          password: hashedPassword,
        },
        type: sequelize.QueryTypes.INSERT,
      });

      // Token oluşturma
      const token = jwt.sign(
        { id: result, username: validatedData.username },
        process.env.JWT_SECRET || "gizli_anahtar",
        { expiresIn: "24h" }
      );

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "Kayıt başarılı",
          token,
          username: validatedData.username,
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
    try {
      const { username, password } = req.body;

      // Kullanıcıyı bul
      const findUserSql = `
        SELECT * FROM users
        WHERE username = :username
      `;

      const [user] = await sequelize.query(findUserSql, {
        replacements: { username },
        type: sequelize.QueryTypes.SELECT,
      });

      if (!user) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ message: "Geçersiz kullanıcı adı veya şifre" })
        );
        return;
      }

      // Şifre kontrolü
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ message: "Geçersiz kullanıcı adı veya şifre" })
        );
        return;
      }

      // Token oluştur
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET || "gizli_anahtar",
        { expiresIn: "24h" }
      );

      // CORS başlıkları
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "Giriş başarılı",
          token,
          username: user.username,
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
      // JWT token'ı blacklist'e eklenebilir
      // veya client tarafında token silinebilir
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Başarıyla çıkış yapıldı" }));
    } catch (error) {
      console.error("Çıkış hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Çıkış işlemi başarısız" }));
    }
  }

  async verifyToken(req, res) {
    try {
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Token bulunamadı" }));
        return;
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "gizli_anahtar"
      );

      // Kullanıcıyı kontrol et
      const findUserSql = `
        SELECT id, username, email FROM users
        WHERE id = :userId
      `;

      const [user] = await sequelize.query(findUserSql, {
        replacements: { userId: decoded.id },
        type: sequelize.QueryTypes.SELECT,
      });

      if (!user) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Geçersiz token" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "Token geçerli",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        })
      );
    } catch (error) {
      console.error("Token doğrulama hatası:", error);
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Geçersiz token" }));
    }
  }
}

const authController = new AuthController();
export default authController;
