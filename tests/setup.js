import { sequelize } from "../src/utilities/db.js";

before(async () => {
  // Test veritabanını oluştur
  await sequelize.query("CREATE DATABASE IF NOT EXISTS forum_test");
  // Migration'ları çalıştır
  await sequelize.sync({ force: true });
});
