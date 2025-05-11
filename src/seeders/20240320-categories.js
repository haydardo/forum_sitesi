"use strict";

import { sequelize } from "../utilities/db.js";

async function seedCategories() {
  try {
    const categories = [
      {
        name: "Genel Konular",
        description: "Genel tartışma konuları",
        slug: "genel-konular",
      },
      {
        name: "Programlama",
        description: "Programlama ile ilgili konular",
        slug: "programlama",
      },
      {
        name: "Web Geliştirme",
        description: "Web geliştirme konuları",
        slug: "web-gelistirme",
      },
    ];

    for (const category of categories) {
      await sequelize.query(
        `INSERT INTO categories (name, description, slug, parent_id, created_at, updated_at)
         VALUES (:name, :description, :slug, :parent_id, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
         description = :description`,
        {
          replacements: {
            name: category.name,
            description: category.description,
            slug: category.slug,
            parent_id: category.parent_id || null,
          },
        }
      );
    }

    console.log("Örnek kategoriler başarıyla eklendi");
  } catch (error) {
    console.error("Kategori eklenirken hata:", error);
  }
}

export default seedCategories;
