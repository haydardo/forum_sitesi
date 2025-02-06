const API = {
  baseUrl: "http://localhost:3001/api",

  //Wrapper ile bütün api işlemleri tek bir yerde yönetilebilir.
  // Gönderiler
  getPosts: async () => {
    try {
      const response = await fetch("/api/posts");
      if (!response.ok) throw new Error("Gönderiler alınamadı");
      return await response.json();
    } catch (error) {
      console.error("Hata:", error);
      throw error;
    }
  },

  createPost: async (postData) => {
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(postData),
      });

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.message);
        error.response = data;
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Gönderi oluşturma hatası:", error);
      throw error;
    }
  },
  getPostByCategory: async (categoryId) => {
    try {
      const response = await fetch(`/api/posts/category/${categoryId}`);
      if (!response.ok) throw new Error("Gönderiler alınamadı");
      return await response.json();
    } catch (error) {
      console.error("Hata:", error);
      throw error;
    }
  },

  // Kullanıcı işlemleri
  async login(username, password) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Giriş başarısız");
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      return data;
    } catch (error) {
      console.error("Giriş hatası:", error);
      throw error;
    }
  },

  async register(username, email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Kayıt başarısız");
      }

      return await response.json();
    } catch (error) {
      console.error("Kayıt hatası:", error);
      throw error;
    }
  },

  // Kategoriler
  getCategories: async () => {
    try {
      const response = await fetch("/api/categories", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Kategoriler alinamadi");
      return await response.json();
    } catch (error) {
      console.error("Hata:", error);
      throw error;
    }
  },
  likePost: async (postId) => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message);
      }

      return data;
    } catch (error) {
      console.error("Beğeni hatası:", error);
      throw error;
    }
  },
};
