import db from "../models/index.js";
import generateFakeData from "../utilities/generateFakeData.js";

const seedUsers = async () => {
  const BATCH_SIZE = 100;
  const TOTAL_USERS = 100000;

  try {
    console.log("Kullanıcı ekleme işlemi başladı...");

    for (let i = 0; i < TOTAL_USERS; i += BATCH_SIZE) {
      const fakeUsers = generateFakeData(BATCH_SIZE);
      console.log(`${i}. batch için veri oluşturuldu, ekleniyor...`);

      // Kullanıcı verilerini SQL formatına çevir
      const values = fakeUsers
        //.map() metodu, bir dizi içindeki her elemanı belirli bir işlemeden geçirip yeni bir dizi oluşturur.
        .map((user) => `('${user.name}', '${user.email}', '${user.password}')`) //.map() burada her kullanıcıyı SQL formatına çeviriyor.
        .join(",");

      const sql = `
        INSERT INTO Users (name, email, password)
        VALUES ${values};
      `;

      // Transaction içinde SQL sorgusunu çalıştır
      await db.sequelize.transaction(async (t) => {
        await db.sequelize.query(sql, { transaction: t });
      });

      console.log(`Batch tamamlandı: ${i + BATCH_SIZE} kullanıcı eklendi.`);
    }

    console.log("Tüm kullanıcılar başarıyla veritabanına eklendi.");
    process.exit(0); // İşlem bitince programı sonlandır
  } catch (error) {
    console.error("Kullanıcı ekleme hatası:", error);
    process.exit(1); // Hata durumunda programı sonlandır
  }
};

try {
  console.log("Kullanıcı güncelleme işlemi başladı...");

  for (let i = 0; i < TOTAL_USERS; i += BATCH_SIZE) {
    const updateValues = Array(BATCH_SIZE)
      .fill() // dizinin tüm elemanlarını belirli bir değerle değiştirir.
      .map((_, index) => {//.map dizinin her elemanı üzerinde işlem yaparak yeni bir dizi oluştur
        const userId = i + index + 1; // Kullanıcı ID'si, i (0,100,200) index (0,99)
        return `WHEN ${userId} THEN '${faker.internet.password()}'`; // Her kullanıcı için rastgele yeni bir şifre oluştur
      })
      .join(" ");

    const sql = `
        UPDATE Users 
        SET password = CASE id 
          ${updateValues}
        END
        WHERE id BETWEEN ${batchStartId} AND ${batchEndId};
      `;

    // Transaction içinde SQL sorgusunu çalıştır
    await db.sequelize.transaction(async (t) => {
      await db.sequelize.query(sql, { transaction: t });
    });

    console.log(`Batch tamamlandı: ${i + BATCH_SIZE} kullanıcı güncellendi.`);
  }

  console.log("Tüm kullanıcılar başarıyla güncellendi.");
} catch (error) {
  console.error("Kullanıcı güncelleme hatası:", error);
}

// Fonksiyonu çağır
console.log("Seeder başlatılıyor...");
seedUsers();
