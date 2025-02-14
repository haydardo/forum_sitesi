import { Sequelize } from "sequelize";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Göreceli yolları kullan
const configPath = path.join(__dirname, "..", "..", "config", "config.json");

// Config dosyasını oku
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
    // Önce kategori var mı kontrol et
    const checkSql = `
      SELECT * FROM categories 
      WHERE slug IN ('genel-konular', 'programlama', 'web-gelistirme')
    `;

    const [existingCategories] = await sequelize.query(checkSql);

    if (existingCategories.length === 0) {
      // Kategoriler yoksa ekle
      const insertSql = `
        INSERT INTO categories (name, slug, description, parent_id)
        VALUES 
          ('Genel Konular', 'genel-konular', 'Genel tartışma konuları', NULL),
          ('Programlama', 'programlama', 'Programlama ile ilgili konular', NULL)
      `;

      await sequelize.query(insertSql);

      // Programlama kategorisinin ID'sini al
      const [programmingCategory] = await sequelize.query(`
        SELECT id FROM categories WHERE slug = 'programlama'
      `);

      // Alt kategoriyi ekle
      if (programmingCategory.length > 0) {
        await sequelize.query(
          `
          INSERT INTO categories (name, slug, description, parent_id)
          VALUES ('Web Geliştirme', 'web-gelistirme', 'Web geliştirme konuları', :parentId)
        `,
          {
            replacements: { parentId: programmingCategory[0].id },
          }
        );
      }
    }
    console.log("Örnek kategoriler başarıyla eklendi");
  } catch (error) {
    console.error("Test verisi ekleme hatası:", error);
    throw error;
  }
};

export { sequelize };
