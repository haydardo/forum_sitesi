export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("likes", {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    post_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "posts",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    created_at: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  });

  // Bir kullanıcı bir postu sadece bir kez beğenebilir
  await queryInterface.addConstraint("likes", {
    fields: ["user_id", "post_id"],
    type: "unique",
    name: "unique_like",
  });

  // İndeksler
  await queryInterface.addIndex("likes", ["user_id"]);
  await queryInterface.addIndex("likes", ["post_id"]);

  // Foreign key'i sonradan ekle
  try {
    await queryInterface.addConstraint("likes", {
      fields: ["user_id"],
      type: "foreign key",
      name: "likes_user_id_fk",
      references: {
        table: "users",
        field: "id",
      },
      onDelete: "CASCADE",
    });
  } catch (error) {
    console.warn(
      "users tablosu henüz oluşturulmamış olabilir. Foreign key daha sonra eklenecek."
    );
  }
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("likes");
}
