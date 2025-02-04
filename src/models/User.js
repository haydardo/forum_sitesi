const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Konular ile ilişki
      User.hasMany(models.Topic, {
        foreignKey: "user_id",
        as: "topics",
      });

      // Mesajlar ile ilişki
      User.hasMany(models.Post, {
        foreignKey: "user_id",
        as: "posts",
      });

      // Beğeniler ile ilişki
      User.hasMany(models.Like, {
        foreignKey: "user_id",
        as: "likes",
      });
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      username: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING(20),
        defaultValue: "user",
      },
      account_status: {
        type: DataTypes.STRING(20),
        defaultValue: "active",
      },
      first_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      last_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      underscored: true,
    }
  );

  return User;
};
