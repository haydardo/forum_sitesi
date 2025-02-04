const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const config = require("../../config/config.json")["development"];
const db = {};
//Bütün modelleri burada toplayıp, ilişki kuruyoruz. Dairesel bağımlılık oluşturmamak için.
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

const userModelPath = path.join(__dirname, "User.js"); // __dirname: Mevcut dizinin yolu (src/models), User.js ile birleştiriyor.
const userModel = require(userModelPath)(sequelize, Sequelize.DataTypes);
db[userModel.name] = userModel;

// Diğer model dosyalarını otomatik yükle
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file !== path.basename(__filename) &&
      file !== "User.js" &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  })
  .forEach((file) => {
    const modelDefiner = require(path.join(__dirname, file));
    if (typeof modelDefiner === "function") {
      const model = modelDefiner(sequelize, Sequelize.DataTypes); // modelDefiner: Model tanımlayıcı fonksiyon
      db[model.name] = model;
    }
  });
// Model ilişkilerini kur
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize; // Veritabanı işlemleri için
db.Sequelize = Sequelize; // Veri tipleri ve operatörler için

module.exports = db;
