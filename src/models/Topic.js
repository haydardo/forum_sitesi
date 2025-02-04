const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Topic extends Model {
    static associate(models) {
      // Kategori ile ilişki
      Topic.belongsTo(models.Category, {
        foreignKey: "category_id",
        as: "category",
      });

      // Kullanıcı ile ilişki (Kullanıcı yönetim sisteminden)
      Topic.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "author",
      });

      // Mesajlar ile ilişki
      Topic.hasMany(models.Post, {
        foreignKey: "topic_id",
        as: "posts",
      });
    }
  }

  Topic.init(
    {
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(200),
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      view_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      is_pinned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_locked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      last_post_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "Topic",
      tableName: "topics",
      underscored: true,
      hooks: {
        beforeCreate: async (topic) => {
          // Son mesaj tarihi oluşturma tarihi ile aynı olsun
          topic.last_post_at = topic.created_at;
        },
      },
    }
  );

  return Topic;
};
