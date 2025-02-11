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

      await db.sequelize.transaction(async (t) => {
        await db.User.bulkCreate(fakeUsers, { transaction: t });
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

// Fonksiyonu çağır
console.log("Seeder başlatılıyor...");
seedUsers();
