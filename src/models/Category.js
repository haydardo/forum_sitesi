"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      // Alt kategoriler için self-referential ilişki
      Category.hasMany(Category, {
        foreignKey: "parent_id",
        as: "subCategories",
      });

      Category.belongsTo(Category, {
        foreignKey: "parent_id",
        as: "parentCategory",
      });

      // Post ile ilişki - burada alias'ı "posts" olarak değiştiriyoruz
      Category.hasMany(models.Post, {
        foreignKey: "category_id",
        as: "posts",
      });

      // Konular ile ilişki
      Category.hasMany(models.Topic, {
        foreignKey: "category_id",
        as: "topics",
      });
    }
  }

  Category.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      parent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Categories",
          key: "id",
        },
      },
    },
    {
      sequelize,
      modelName: "Category",
      tableName: "categories",
      timestamps: true,
      underscored: true,
    }
  );

  return Category;
};
