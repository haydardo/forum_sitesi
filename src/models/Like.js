import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class Like extends Model {
    static associate(models) {
      Like.belongsTo(models.Post, {
        foreignKey: "post_id",
        as: "post",
      });

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
    }
  );

  return Like;
};
