const API = {
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
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Lütfen önce giriş yapın");
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Post oluşturulurken bir hata oluştu");
      }

      return await response.json();
    } catch (error) {
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
      const response = await fetch(`/api/auth/login`, {
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
      const response = await fetch(`/api/auth/register`, {
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
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Kategoriler alınamadı");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Kategoriler yüklenirken hata:", error);
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

  // Arama işlemleri
  searchPosts: async (query) => {
    try {
      const response = await fetch(
        `/api/posts/search?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) throw new Error("Arama yapılamadı");
      return await response.json();
    } catch (error) {
      console.error("Arama hatası:", error);
      throw error;
    }
  },
};
