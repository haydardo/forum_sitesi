import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
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
      Post.hasMany(models.Comment, {
        foreignKey: "post_id",
        as: "comments",
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
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      category_id: {
        type: DataTypes.INTEGER,
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
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "Post",
      tableName: "posts",
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
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

  const attributes = Post.getAttributes();
  delete attributes.created_at;
  delete attributes.updated_at;

  return Post;
};
