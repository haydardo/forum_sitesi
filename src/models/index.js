import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Sequelize from "sequelize";
import { readFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JSON dosyasını oku
const configPath = path.resolve(__dirname, "../../config/config.json");
const configJson = JSON.parse(await readFile(configPath, "utf8"));
const development = configJson.development;

const db = {};

//Bütün modelleri burada toplayıp, ilişki kuruyoruz. Dairesel bağımlılık oluşturmamak için.
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

// Model yükleme kısmı - User modelini doğrudan db'ye ekle
const userModelPath = path.join(__dirname, "User.js");
const { default: userModel } = await import(userModelPath);
db.User = userModel(sequelize, Sequelize.DataTypes);

// Tüm modelleri dinamik olarak yükle
const files = fs.readdirSync(__dirname);
for (const file of files) {
  if (
    file.indexOf(".") !== 0 &&
    file !== path.basename(__filename) &&
    file !== "User.js" &&
    file.slice(-3) === ".js" &&
    file.indexOf(".test.js") === -1
  ) {
    const modelPath = path.join(__dirname, file);
    const { default: modelDefiner } = await import(modelPath);
    if (typeof modelDefiner === "function") {
      const model = modelDefiner(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
    }
  }
}

// Model ilişkilerini kur
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize; // Veritabanı işlemleri için
db.Sequelize = Sequelize; // Veri tipleri ve operatörler için

// Tüm modelleri export et
export const { User, Category, Post, Topic, Comment, Like } = db;
// Tüm db nesnesini default export et
export default db;
