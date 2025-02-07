document.addEventListener("DOMContentLoaded", async () => {
  const postId = window.location.pathname.split("/").pop();
  const postDetailContainer = document.getElementById("post-detail");
  const categoryInfo = document.getElementById("category-info");
  const commentForm = document.getElementById("comment-form");

  try {
    const response = await fetch(`/api/posts/${postId}`);
    if (!response.ok) {
      throw new Error("Gönderi bulunamadı");
    }

    const post = await response.json();
    console.log("Gelen post verisi:", post); // Debug için

    // Gönderi detaylarını göster
    postDetailContainer.innerHTML = `
      <div class="card-body">
        <h2 class="card-title">${post.title}</h2>
        <div class="post-meta text-muted mb-3">
          <span class="me-3">
            <i class="bi bi-person"></i> ${post.author?.username || "Anonim"}
          </span>
          <span>
            <i class="bi bi-clock"></i> ${new Date(
              post.created_at
            ).toLocaleString("tr-TR")}
          </span>
        </div>
        <div class="post-content">
          ${post.content}
        </div>
        <div class="mt-3">
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

    // Kategori bilgilerini göster
    if (post.category) {
      categoryInfo.innerHTML = `
        <div class="card-body">
          <h5 class="card-title">${post.category.name}</h5>
          <p class="card-text">${
            post.category.description || "Açıklama bulunmuyor"
          }</p>
          <div class="category-posts mt-3">
            <h6>Bu Kategorideki Diğer Gönderiler</h6>
            <div class="list-group" style="max-height: 300px; overflow-y: auto;">
              ${
                post.category.posts
                  ? post.category.posts
                      .map(
                        (categoryPost) => `
                  <a href="/posts/${
                    categoryPost.id
                  }" class="list-group-item list-group-item-action">
                    <div class="d-flex justify-content-between">
                      <h6 class="mb-1">${categoryPost.title}</h6>
                      <small>${new Date(categoryPost.created_at).toLocaleString(
                        "tr-TR"
                      )}</small>
                    </div>
                    <p class="mb-1">${categoryPost.content.substring(
                      0,
                      100
                    )}...</p>
                  </a>
                `
                      )
                      .join("")
                  : '<p class="text-muted">Bu kategoride henüz gönderi bulunmuyor.</p>'
              }
            </div>
          </div>
        </div>
      `;
    } else {
      categoryInfo.innerHTML =
        '<p class="text-muted">Kategori bilgisi bulunamadı.</p>';
    }

    // Yorum formunu ayarla
    commentForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!localStorage.getItem("token")) {
        alert("Yorum yapmak için giriş yapmalısınız!");
        return;
      }

      const commentContent = document.getElementById("comment-content").value;

      try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ content: commentContent }),
        });

        if (!response.ok) throw new Error("Yorum gönderilemedi");

        // Formu temizle ve yorumları yeniden yükle
        commentForm.reset();
        await loadComments();
      } catch (error) {
        console.error("Yorum gönderme hatası:", error);
        alert("Yorum gönderilirken bir hata oluştu");
      }
    });

    // Yorumları yükle
    await loadComments();
  } catch (error) {
    console.error("Gönderi detayları yüklenirken hata:", error);
    postDetailContainer.innerHTML = `
      <div class="card-body">
        <div class="alert alert-danger">
          Gönderi detayları yüklenirken bir hata oluştu: ${error.message}
        </div>
      </div>
    `;
  }

  // Auth kontrolü ve diğer işlemler...
  checkAuthStatus();
  setupLogout();
});

// Auth durumunu kontrol et ve UI'ı güncelle
function checkAuthStatus() {
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  const commentForm = document.getElementById("comment-form");
  const girisLink = document.getElementById("girisLink");
  const kayitLink = document.getElementById("kayitLink");
  const cikisLink = document.getElementById("cikisLink");
  const userInfo = document.getElementById("userInfo");
  const usernameSpan = document.getElementById("username");

  if (token && username) {
    // Kullanıcı giriş yapmışsa
    girisLink.classList.add("d-none");
    kayitLink.classList.add("d-none");
    cikisLink.classList.remove("d-none");
    userInfo.classList.remove("d-none");
    usernameSpan.textContent = username;

    // Yorum formunu göster
    commentForm.innerHTML = `
      <div class="mb-3">
        <textarea class="form-control" id="comment-content" rows="3" placeholder="Yorumunuzu yazın..."></textarea>
      </div>
      <button type="submit" class="btn btn-primary">Yorum Yap</button>
    `;
  } else {
    // Kullanıcı giriş yapmamışsa
    girisLink.classList.remove("d-none");
    kayitLink.classList.remove("d-none");
    cikisLink.classList.add("d-none");
    userInfo.classList.add("d-none");

    commentForm.innerHTML = `
      <div class="alert alert-info">
        Yorum yapmak için lütfen <a href="/login">giriş yapın</a>.
      </div>
    `;
  }
}

// Çıkış işlemi
function setupLogout() {
  const cikisLink = document.getElementById("cikisLink");
  cikisLink.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.href = "/";
  });
}

// Yorumları yükle
async function loadComments() {
  const postId = window.location.pathname.split("/").pop();
  const commentsContainer = document.getElementById("comments-container");

  try {
    const response = await fetch(`/api/posts/${postId}/comments`);
    const comments = await response.json();

    commentsContainer.innerHTML = comments.length
      ? comments
          .map(
            (comment) => `
          <div class="comment mb-3 p-3 border-bottom">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div class="comment-author">
                <i class="bi bi-person-circle"></i>
                <strong>${comment.author?.username || "Anonim"}</strong>
              </div>
              <small class="text-muted">
                ${new Date(comment.created_at).toLocaleString("tr-TR")}
              </small>
            </div>
            <div class="comment-content">
              ${comment.content}
            </div>
          </div>
        `
          )
          .join("")
      : '<div class="text-muted">Henüz yorum yapılmamış</div>';
  } catch (error) {
    console.error("Yorumları yükleme hatası:", error);
    commentsContainer.innerHTML = `
      <div class="alert alert-danger">
        Yorumlar yüklenirken bir hata oluştu
      </div>
    `;
  }
}
