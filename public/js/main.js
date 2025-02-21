// DOM Elements
const elements = {
  postsContainer: document.getElementById("posts-container"),
  newPostSection: document.getElementById("new-post-section"),
  newPostForm: document.getElementById("new-post-form"),
  yeniGonderiBtn: document.getElementById("yeniGonderiBtn"),
  girisLink: document.getElementById("girisLink"),
  kayitLink: document.getElementById("kayitLink"),
  cikisLink: document.getElementById("cikisLink"),
  userInfo: document.getElementById("userInfo"),
  usernameSpan: document.getElementById("username"),
};

// Tarih formatla
const formatDate = (dateString) => {
  if (!dateString) return "Tarih yok";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Geçersiz tarih";

    return date.toLocaleString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Tarih formatlanırken hata:", error);
    return "Tarih hatası";
  }
};

// Kategorileri yükle ve select'e ekle
async function loadCategories() {
  try {
    const categories = await API.getCategories(); // API'den kategorileri al
    console.log("Yüklenen kategoriler:", categories);
    const categorySelect = document.getElementById("post-category");

    if (!categorySelect) {
      console.error("Kategori select elementi bulunamadı");
      return;
    }

    if (!Array.isArray(categories)) {
      console.error("Geçersiz kategori verisi:", categories);
      return;
    }

    categorySelect.innerHTML = '<option value="">Kategori Seçin</option>'; // İlk seçenek
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id; // Kategori ID'si
      option.textContent = category.name; // Kategori adı
      categorySelect.appendChild(option); // Seçenekleri ekle
    });
  } catch (error) {
    console.error("Kategoriler yüklenirken hata:", error);
  }
}

// Gönderi elementi oluştur
const createPostElement = (post) => {
  const div = document.createElement("div");
  div.className = "list-group-item";

  const authorName = post.author_username || post.author?.username || "Anonim";
  const categoryName =
    post.category_name || post.category?.name || "Kategori Seçilmemiş";

  div.innerHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <h5 class="mb-1">
        <a href="/posts/${post.id}" class="text-decoration-none">${
    post.title
  }</a>
      </h5>
      <small class="text-muted">${formatDate(post.created_at)}</small>
    </div>
    <p class="mb-1">${post.content}</p>
    <div class="d-flex justify-content-between align-items-center">
      <small>
        Yazar: <span class="text-primary">${authorName}</span> | 
        Kategori: <span class="text-success">${categoryName}</span>
      </small>
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-outline-primary like-button" data-post-id="${
          post.id
        }">
          <i class="bi bi-heart${post.is_liked ? "-fill" : ""}"></i>
          <span class="like-count">${post.like_count || 0}</span>
          <span class="ms-1">Beğen</span>
        </button>
      </div>
    </div>
  `;

  // Beğeni butonu için event listener ekle
  const likeButton = div.querySelector(".like-button");
  likeButton.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!localStorage.getItem("token")) {
      alert("Beğenmek için giriş yapmalısınız!");
      return;
    }

    try {
      const likeCount = likeButton.querySelector(".like-count");
      const heartIcon = likeButton.querySelector("i");
      const currentCount = parseInt(likeCount.textContent);

      // Önce UI'ı güncelle
      if (heartIcon.classList.contains("bi-heart")) {
        heartIcon.classList.remove("bi-heart");
        heartIcon.classList.add("bi-heart-fill");
        likeCount.textContent = currentCount + 1;
      } else {
        heartIcon.classList.remove("bi-heart-fill");
        heartIcon.classList.add("bi-heart");
        likeCount.textContent = Math.max(currentCount - 1, 0);
      }

      // Sonra API çağrısı yap
      const response = await API.likePost(post.id);
      post.like_count = response.likeCount;
      post.is_liked = response.liked;
    } catch (error) {
      console.error("Beğeni hatası:", error);
      alert("Beğeni işlemi sırasında bir hata oluştu");
      // Hata durumunda eski haline geri döndür
      window.location.reload();
    }
  });

  return div;
};

// Gönderileri yükle
const loadPosts = async () => {
  try {
    const posts = await API.getPosts();
    elements.postsContainer.innerHTML = "";

    if (posts.length === 0) {
      elements.postsContainer.innerHTML =
        '<p class="text-center text-muted my-3">Henüz gönderi bulunmuyor.</p>';
      return;
    }

    posts.forEach((post) => {
      elements.postsContainer.appendChild(createPostElement(post));
    });
  } catch (error) {
    console.error("Gönderiler yüklenirken hata:", error);
    elements.postsContainer.innerHTML =
      '<p class="text-center text-danger my-3">Gönderiler yüklenirken bir hata oluştu.</p>';
  }
};

// Yeni gönderi oluştur
const createPost = async (event) => {
  event.preventDefault();

  const title = document.getElementById("post-title").value.trim();
  const content = document.getElementById("post-content").value.trim();
  const categoryId = document.getElementById("post-category").value;
  console.log("seçilen kategori id:", categoryId);
  if (!title || !content || !categoryId) {
    alert("Lütfen tüm alanları doldurun.");
    return;
  }

  try {
    const result = await API.createPost({ title, content, categoryId });
    if (result.success) {
      elements.newPostForm.reset();
      elements.newPostSection.classList.add("d-none");
      await loadPosts();
    } else {
      throw new Error(result.message || "Post oluşturulurken bir hata oluştu");
    }
  } catch (error) {
    console.error("Gönderi oluşturulurken hata:", error);
    if (error.response?.details) {
      let errorMessage = "Uygunsuz İçerik Tespit Edildi:\n";
      if (error.response.details.title) {
        errorMessage += `- ${error.response.details.title}\n`;
      }
      if (error.response.details.content) {
        errorMessage += `- ${error.response.details.content}`;
      }
      alert(errorMessage);
    } else {
      alert(error.message || "Post oluşturulurken bir hata oluştu");
    }
  }
};

// Oturum kontrolü
const checkAuthStatus = () => {
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  if (token && username) {
    elements.girisLink.classList.add("d-none");
    elements.kayitLink.classList.add("d-none");
    elements.cikisLink.classList.remove("d-none");
    elements.userInfo.classList.remove("d-none");
    elements.usernameSpan.textContent = username;
    elements.yeniGonderiBtn.classList.remove("d-none");
  } else {
    elements.girisLink.classList.remove("d-none");
    elements.kayitLink.classList.remove("d-none");
    elements.cikisLink.classList.add("d-none");
    elements.userInfo.classList.add("d-none");
    elements.yeniGonderiBtn.classList.add("d-none");
  }
};

// Çıkış işlemi
const setupLogout = () => {
  elements.cikisLink.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    checkAuthStatus();
    window.location.href = "/";
  });
};

// Event Listeners
const setupEventListeners = () => {
  if (elements.newPostForm) {
    elements.newPostForm.addEventListener("submit", createPost);
  }

  if (elements.yeniGonderiBtn) {
    elements.yeniGonderiBtn.addEventListener("click", async () => {
      elements.newPostSection.classList.remove("d-none");
      await loadCategories(); // Kategorileri yükle
    });
  }

  // Sayfa yüklendiğinde kategorileri yükle
  document.addEventListener("DOMContentLoaded", async () => {
    if (document.getElementById("post-category")) {
      await loadCategories();
    }
  });
};

// main.js'e arama fonksiyonlarını ekleyelim
const setupSearch = () => {
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");

  const performSearch = async () => {
    const query = searchInput.value.trim();
    if (!query) return;

    try {
      const results = await API.searchPosts(query);

      // Sonuçları göster
      const postsContainer = document.getElementById("posts-container");
      postsContainer.innerHTML = ""; // Mevcut içeriği temizle

      if (results.length === 0) {
        postsContainer.innerHTML = `
          <div class="alert alert-info">
            "${query}" için sonuç bulunamadı
          </div>
        `;
        return;
      }

      results.forEach((post) => {
        const postElement = createPostElement(post);
        postsContainer.appendChild(postElement);
      });
    } catch (error) {
      alert("Arama yapılırken bir hata oluştu");
    }
  };

  // Enter tuşu ile arama
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      performSearch();
    }
  });

  // Arama butonu ile arama
  searchButton.addEventListener("click", performSearch);
};

// Initialize
const init = async () => {
  setupEventListeners();
  setupLogout();
  setupSearch(); // Yeni eklenen
  checkAuthStatus();
  await loadPosts();
};

// DOM içeriği yüklendikten sonra başlat
document.addEventListener("DOMContentLoaded", init);

// Sayfa yüklendiğinde token kontrolü
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const newPostButton = document.querySelector("#newPostButton");
  const loginButton = document.querySelector("#loginButton");

  if (token) {
    // Kullanıcı giriş yapmış
    if (newPostButton) newPostButton.style.display = "block";
    if (loginButton) loginButton.style.display = "none";
  } else {
    // Kullanıcı giriş yapmamış
    if (newPostButton) newPostButton.style.display = "none";
    if (loginButton) loginButton.style.display = "block";
  }
});
