import { expect } from "chai";
import request from "supertest";
import { sequelize } from "../src/utilities/db.js";
import Post from "../src/models/Post.js";

describe("Post Tests", () => {
  // Her testten önce
  //beforeEach(async () => {
  // Test veritabanını temizle
  //await sequelize.query("DELETE FROM posts");
  //});

  // Testler bittikten sonra
  after(async () => {
    await sequelize.close();
  });

  describe("Post Creation", () => {
    it("should create a new post", async () => {
      const testPost = {
        title: "Test Post",
        content: "Test Content",
        categoryId: 1,
        userId: 1,
      };

      const post = await Post.create(testPost);
      expect(post).to.have.property("id");
      expect(post.title).to.equal(testPost.title); // Veritabanına kaydettiğimiz title gönderdiğimiz title'a eşit mi?
      expect(post.content).to.equal(testPost.content);
    });
  });

  describe("Post Search", () => {
    beforeEach(async () => {
      // Test verilerini ekle
      await Post.create({
        title: "JavaScript Guide",
        content: "Learn JavaScript programming",
        categoryId: 1,
        userId: 1,
      });
      await Post.create({
        title: "Python Tutorial",
        content: "Learn Python basics",
        categoryId: 1,
        userId: 1,
      });
    });

    it("should search posts by title", async () => {
      const results = await Post.search("JavaScript");
      // En az bir sonuç olmalı
      expect(results).to.have.lengthOf.at.least(1);
    });
  });
});
