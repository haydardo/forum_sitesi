import { Sequelize } from "sequelize";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import db from "../src/models/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JSON dosyasını oku
const configPath = path.resolve(__dirname, "../config/config.json");
const configJson = JSON.parse(await readFile(configPath, "utf8"));
const development = configJson.development;

const sequelize = new Sequelize(
  development.database,
  development.username,
  development.password,
  {
    host: development.host,
    dialect: development.dialect,
    port: development.port,
    timezone: development.timezone,
    logging: false,
  }
);

export const initDb = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log("Veritabanı bağlantısı ve senkronizasyonu başarılı");
  } catch (error) {
    console.error("Veritabanı başlatma hatası:", error);
    throw error;
  }
};

export const seedDb = async () => {
  try {
    //const { User } = require("./index");
    //const bcrypt = require("bcrypt");

    // Category'yi db'den alıyoruz
    const Category = db.Category;

    // Ana kategorileri ekle
    const [generalCategory] = await Category.findOrCreate({
      where: { slug: "genel-konular" },
      defaults: {
        name: "Genel Konular",
        description: "Genel tartışma konuları",
      },
    });

    const [programmingCategory] = await Category.findOrCreate({
      where: { slug: "programlama" },
      defaults: {
        name: "Programlama",
        description: "Programlama ile ilgili konular",
      },
    });

    // Alt kategorileri ekle
    await Category.findOrCreate({
      where: { slug: "web-gelistirme" },
      defaults: {
        name: "Web Geliştirme",
        description: "Web geliştirme konuları",
        parent_id: programmingCategory.id,
      },
    });
    console.log("Örnek kategoriler başarıyla eklendi");
  } catch (error) {
    console.error("Test verisi ekleme hatası:", error);
    throw error;
  }
};

export default sequelize;
