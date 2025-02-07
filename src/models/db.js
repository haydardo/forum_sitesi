const { Sequelize } = require("sequelize");
const config = require("../../config/config.json")["development"];
const { Category } = require("./index");

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    port: config.port,
    timezone: config.timezone,
    logging: false,
  }
);

const initDb = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log("Veritabanı bağlantısı ve senkronizasyonu başarılı");
  } catch (error) {
    console.error("Veritabanı başlatma hatası:", error);
    throw error;
  }
};

const seedDb = async () => {
  try {
    const { User } = require("./index");
    const bcrypt = require("bcrypt");

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

module.exports = {
  sequelize,
  initDb,
  seedDb,
};
