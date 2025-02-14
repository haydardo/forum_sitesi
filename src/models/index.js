import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Sequelize from "sequelize";
import { readFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = {};

// Config ve bağlantı kurulumu için async fonksiyon
async function initializeDB() {
  const configPath = path.resolve(__dirname, "../../config/config.json");
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

  // Tüm modelleri yükle
  const modelFiles = fs
    .readdirSync(__dirname)
    .filter(
      (file) =>
        file.indexOf(".") !== 0 &&
        file !== "index.js" &&
        file.slice(-3) === ".js"
    );

  for (const file of modelFiles) {
    const modelPath = new URL(`./${file}`, import.meta.url);
    const { default: model } = await import(modelPath);
    const modelName = file.split(".")[0];
    db[modelName] = model;
  }

  // İlişkileri kur
  Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
      db[modelName].associate(db);
    }
  });

  db.sequelize = sequelize;
  db.Sequelize = Sequelize;

  return db;
}

// DB'yi başlat
let database = null;

export async function getDB() {
  if (!database) {
    database = await initializeDB();
  }
  return database;
}

// Sadece getDB fonksiyonunu export et
export default { getDB };
