"use strict";

export async function up(queryInterface, Sequelize) {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(100) NOT NULL,
      role VARCHAR(20) DEFAULT 'user',
      account_status VARCHAR(20) DEFAULT 'active',
      first_name VARCHAR(50),
      last_name VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      -- İndeksler
      INDEX idx_username (username),
      INDEX idx_email (email),
      INDEX idx_role (role),
      INDEX idx_account_status (account_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await queryInterface.sequelize.query(createUsersTable);
    console.log("Users tablosu başarıyla oluşturuldu");
  } catch (error) {
    console.error("Tablo oluşturma hatası:", error);
    throw error;
  }
}

export async function down(queryInterface, Sequelize) {
  const dropTable = `
    DROP TABLE IF EXISTS users;
  `;

  try {
    await queryInterface.sequelize.query(dropTable);
    console.log("Users tablosu başarıyla silindi");
  } catch (error) {
    console.error("Tablo silme hatası:", error);
    throw error;
  }
}
