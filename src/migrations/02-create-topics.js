module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("topics", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "categories",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      view_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      is_pinned: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_locked: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      last_post_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
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
    await queryInterface.addIndex("topics", ["user_id"]);
    await queryInterface.addIndex("topics", ["category_id"]);
    await queryInterface.addIndex("topics", ["created_at"]);

    // Foreign key'i sonradan ekle
    try {
      await queryInterface.addConstraint("topics", {
        fields: ["user_id"],
        type: "foreign key",
        name: "topics_user_id_fk",
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("topics");
  },
};
