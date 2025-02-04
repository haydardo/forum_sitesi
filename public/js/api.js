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
      console.error("Hata:", error);
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
  login: async (credentials) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) throw new Error("Giriş başarısız");
      return await response.json();
    } catch (error) {
      console.error("Hata:", error);
      throw error;
    }
  },

  register: async (userData) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error("Kayıt başarısız");
      return await response.json();
    } catch (error) {
      console.error("Hata:", error);
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
