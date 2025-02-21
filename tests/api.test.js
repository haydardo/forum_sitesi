import { expect } from "chai";
import request from "supertest";
import { createServer } from "../src/main.js";

describe("API Tests", () => {
  let server;
  let authToken;

  before(async () => {
    server = createServer();

    // Test kullanıcısı ile giriş yap
    const loginResponse = await request(server).post("/api/auth/login").send({
      username: "test",
      password: "test123",
    });

    authToken = loginResponse.body.token;
  });

  describe("POST /api/posts", () => {
    it("should create a new post", async () => {
      const response = await request(server)
        .post("/api/posts")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Test Post",
          content: "Test Content",
          categoryId: 1,
        });

      expect(response.status).to.equal(201);
      expect(response.body).to.have.property("success", true);
      expect(response.body.data).to.have.property("title", "Test Post");
    });

    it("should fail without authentication", async () => {
      const response = await request(server).post("/api/posts").send({
        title: "Test Post",
        content: "Test Content",
        categoryId: 1,
      });

      expect(response.status).to.equal(401);
    });
  });

  describe("GET /api/posts/search", () => {
    it("should search posts", async () => {
      const response = await request(server).get(
        "/api/posts/search?q=JavaScript"
      );

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an("array");
    });
  });

  after(async () => {
    if (server && server.close) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
