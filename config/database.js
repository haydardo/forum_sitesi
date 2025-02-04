require("dotenv").config();

module.exports = {
  development: {
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "kullanici_yonetim_sistemi",
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
    timezone: "+03:00",
  },
  test: {
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME_TEST || "kullanici_yonetim_sistemi_test",
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
    timezone: "+03:00",
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
    timezone: "+03:00",
  },
};
