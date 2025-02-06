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

const formatDate = (dateString) => {
  if (!dateString) return "Tarih yok";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Geçersiz tarih";

    return new Intl.DateTimeFormat("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (error) {
    console.error("Tarih formatlanırken hata:", error);
    return "Tarih hatası";
  }
};

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

// Auth Functions
const checkAuthStatus = () => {
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  const isAuthenticated = !!token;

  elements.girisLink.classList.toggle("d-none", isAuthenticated);
  elements.kayitLink.classList.toggle("d-none", isAuthenticated);
  elements.cikisLink.classList.toggle("d-none", !isAuthenticated);
  elements.userInfo.classList.toggle("d-none", !isAuthenticated);
  elements.newPostSection.classList.toggle("d-none", !isAuthenticated);

  if (isAuthenticated && username) {
    elements.usernameSpan.textContent = username;
  }
};

const setupLogout = () => {
  elements.cikisLink.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.href = "/";
  });
};

const createPostElement = (post) => {
  const postElement = document.createElement("article");
  postElement.className = "list-group-item";

  const isLiked =
    post.likes &&
    post.likes.some(
      (like) => like.user_id === parseInt(localStorage.getItem("userId"))
    );

  postElement.innerHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <h5 class="mb-1">${post.title}</h5>
      <small class="text-muted">${formatDate(post.created_at)}</small>
    </div>
    <p class="mb-1">${post.content}</p>
    <div class="d-flex justify-content-between align-items-center">
      <small class="text-muted">
        Yazar: ${post.author ? post.author.username : "Anonim"} | 
        Kategori: ${post.category ? post.category.name : "Genel"}
      </small>
      <div>
        <button class="btn btn-sm btn-outline-primary like-button" data-post-id="${
          post.id
        }">
          <i class="bi bi-heart${isLiked ? "-fill" : ""}"></i> ${
    post.like_count || 0
  } Beğeni
        </button>
      </div>
    </div>
  `;

  const likeButton = postElement.querySelector(".like-button");
  likeButton.addEventListener("click", async () => {
    try {
      if (!localStorage.getItem("token")) {
        alert("Beğeni yapmak için giriş yapmalısınız!");
        return;
      }

      const response = await API.likePost(post.id);
      const newLikeCount = Math.max(0, response.likeCount); // Büyük olanı kullanıyor.
      post.like_count = newLikeCount;
      post.likes = response.liked
        ? [{ user_id: parseInt(localStorage.getItem("userId")) }]
        : [];

      likeButton.innerHTML = `
        <i class="bi bi-heart${response.liked ? "-fill" : ""}"></i> 
        ${newLikeCount} Beğeni
      `;
    } catch (error) {
      console.error("Beğeni hatası:", error);
      alert("Beğeni işlemi başarısız oldu.");
    }
  });

  return postElement;
};

// Post Functions
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
