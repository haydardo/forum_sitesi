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

// Kategorileri yükle
const loadCategories = async () => {
  try {
    if (!localStorage.getItem("token")) {
      console.log("Token bulunamadı, kategoriler yüklenemedi");
      return;
    }
    const categories = await API.getCategories();
    const categorySelect = document.getElementById("post-category");
    categorySelect.innerHTML = '<option value="">Kategori Seçin</option>';

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      categorySelect.appendChild(option);
    });
  } catch (error) {
    console.error("Kategoriler yüklenirken hata:", error);
  }
};

// Gönderi elementi oluştur
const createPostElement = (post) => {
  const div = document.createElement("div");
  div.className = "list-group-item";

  const authorName = post.author?.username
    ? `<span class="text-primary">${post.author.username}</span>`
    : `<span class="text-danger">Kullanıcı Silinmiş</span>`;

  const categoryName = post.category?.name
    ? `<span class="text-success">${post.category.name}</span>`
    : `<span class="text-warning">Kategori Seçilmemiş</span>`;

  div.innerHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <h5 class="mb-1">${post.title}</h5>
      <small class="text-muted">${formatDate(post.created_at)}</small>
    </div>
    <p class="mb-1">${post.content}</p>
    <div class="d-flex justify-content-between align-items-center">
      <small>
        Yazar: ${authorName} | 
        Kategori: ${categoryName}
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
      const response = await API.likePost(post.id);
      const likeCount = likeButton.querySelector(".like-count");
      const heartIcon = likeButton.querySelector("i");

      likeCount.textContent = response.likeCount;

      if (response.liked) {
        heartIcon.classList.remove("bi-heart");
        heartIcon.classList.add("bi-heart-fill");
      } else {
        heartIcon.classList.remove("bi-heart-fill");
        heartIcon.classList.add("bi-heart");
      }
    } catch (error) {
      console.error("Beğeni hatası:", error);
      alert("Beğeni işlemi sırasında bir hata oluştu");
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

  if (!title || !content || !categoryId) {
    alert("Lütfen tüm alanları doldurun.");
    return;
  }

  try {
    await API.createPost({ title, content, categoryId });
    elements.newPostForm.reset();
    elements.newPostSection.classList.add("d-none");
    await loadPosts();
  } catch (error) {
    console.error("Gönderi oluşturulurken hata:", error);
    alert("Gönderi oluşturulurken bir hata oluştu.");
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
  elements.newPostForm.addEventListener("submit", createPost);
  elements.yeniGonderiBtn.addEventListener("click", async () => {
    elements.newPostSection.classList.remove("d-none");
    await loadCategories();
  });
};

// Initialize
const init = async () => {
  setupEventListeners();
  setupLogout();
  checkAuthStatus();
  await loadPosts();
};

// DOM içeriği yüklendikten sonra başlat
document.addEventListener("DOMContentLoaded", init);
