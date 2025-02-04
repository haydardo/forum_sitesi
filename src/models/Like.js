const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Like extends Model {
    static associate(models) {
      // Mesaj ile ilişki
      Like.belongsTo(models.Post, {
        foreignKey: "post_id",
        as: "post",
      });

      // Kullanıcı ile ilişki (Kullanıcı yönetim sisteminden)
      Like.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
  }

  Like.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      post_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Like",
      tableName: "likes",
      underscored: true,
      timestamps: true,
      updatedAt: false,
      hooks: {
        afterCreate: async (like) => {
          // Mesajın beğeni sayısını artır
          await sequelize.models.Post.increment("like_count", {
            where: { id: like.post_id },
          });
        },
        afterDestroy: async (like) => {
          // Mesajın beğeni sayısını azalt
          await sequelize.models.Post.decrement("like_count", {
            where: { id: like.post_id },
          });
        },
      },
    }
  );

  return Like;
};
