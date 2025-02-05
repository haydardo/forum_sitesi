const { Post, User, Category, Topic, Like } = require("../models");
const { spawn } = require("child_process");

const postController = {
  async getAllPosts(req, res) {
    // Tüm gönderileri getirme
  },

  async createPost(req, res) {
    // Gönderi oluşturma
  },

  async likePost(req, res, postId) {
    // Gönderi beğenme
  },

  async analyzeContent(content) {
    // İçerik analizi
  },
};

module.exports = postController;
