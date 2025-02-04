"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      // Alt kategoriler için self-referential ilişki
      Category.hasMany(models.Category, {
        //Bir kategorinin birden fazla alt kategorisi olabilir.
        as: "subCategories",
        foreignKey: "parent_id",
        useJunctionTable: false,
      });
      Category.hasMany(models.Post, {
        foreignKey: "category_id",
        as: "Posts",
      });

      Category.belongsTo(models.Category, {
        as: "parent",
        foreignKey: "parent_id",
        useJunctionTable: false, //Çoka çok ilişki için kullanılır.
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
      tableName: "Categories",
      underscored: true,
      timestamps: true,
    }
  );

  return Category;
};
