const { User } = require("../models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const authController = {
  async register(req, res) {
    // Kayıt işlemleri
  },

  async login(req, res) {
    // Giriş işlemleri
  },

  async logout(req, res) {
    // Çıkış işlemleri
  },
};

module.exports = authController;
