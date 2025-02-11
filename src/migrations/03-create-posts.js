export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("posts", {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    topic_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "topics",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    parent_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "posts",
        key: "id",
      },
      onDelete: "SET NULL",
    },
    is_solution: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    like_count: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    created_at: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal(
        "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      ),
    },
  });

  // İndeksler
  await queryInterface.addIndex("posts", ["user_id"]);
  await queryInterface.addIndex("posts", ["topic_id"]);
  await queryInterface.addIndex("posts", ["created_at"]);

  // Foreign key'i sonradan ekle
  try {
    await queryInterface.addConstraint("posts", {
      fields: ["user_id"],
      type: "foreign key",
      name: "posts_user_id_fk",
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
  await queryInterface.dropTable("posts");
}
