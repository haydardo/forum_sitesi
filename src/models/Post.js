const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Post extends Model {
    static associate(models) {
      // Konu ile ilişki
      Post.belongsTo(models.Topic, {
        foreignKey: "topic_id",
        as: "topic",
      });

      // Kullanıcı ile ilişki
      Post.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "author",
      });

      // Alt mesajlar için self-referential ilişki
      Post.hasMany(models.Post, {
        foreignKey: "parent_id",
        as: "replies",
      });
      Post.belongsTo(models.Post, {
        foreignKey: "parent_id",
        as: "parent",
      });
      Post.belongsTo(models.Category, {
        foreignKey: "category_id",
        as: "category",
      });

      // Beğeniler ile ilişki
      Post.hasMany(models.Like, {
        foreignKey: "post_id",
        as: "likes",
      });
    }
  }

  Post.init(
    {
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      topic_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      parent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_solution: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      like_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Post",
      tableName: "posts",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
      hooks: {
        afterCreate: async (post) => {
          await sequelize.models.Topic.update(
            { last_post_at: post.created_at },
            { where: { id: post.topic_id } }
          );
        },
      },
    }
  );
  return Post;
};
