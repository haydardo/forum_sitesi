document.addEventListener("DOMContentLoaded", async () => {
  const postId = window.location.pathname.split("/").pop();
  const postDetailContainer = document.getElementById("post-detail");
  const commentsContainer = document.getElementById("comments-container");
  const categoryInfo = document.getElementById("category-info");
  const commentForm = document.getElementById("comment-form");

  try {
    const response = await fetch(`/api/posts/${postId}`);
    const post = await response.json();

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
      </div>
    `;

    // Kategori bilgilerini göster
    if (post.category) {
      categoryInfo.innerHTML = `
        <h5 class="mb-3">${post.category.name}</h5>
        <p class="text-muted">${
          post.category.description || "Bu kategori için açıklama bulunmuyor."
        }</p>
      `;
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
        loadComments();
      } catch (error) {
        console.error("Yorum gönderme hatası:", error);
        alert("Yorum gönderilirken bir hata oluştu");
      }
    });
  } catch (error) {
    console.error("Gönderi detayları yüklenirken hata:", error);
    postDetailContainer.innerHTML = `
      <div class="alert alert-danger">
        Gönderi detayları yüklenirken bir hata oluştu.
      </div>
    `;
  }
});

// Auth durumunu kontrol et ve UI'ı güncelle
function checkAuthStatus() {
  const token = localStorage.getItem("token");
  const commentForm = document.getElementById("comment-form");

  if (!token) {
    commentForm.innerHTML = `
      <div class="alert alert-info">
        Yorum yapmak için lütfen <a href="/login">giriş yapın</a>.
      </div>
    `;
  }
}

// Sayfa yüklendiğinde auth durumunu kontrol et
document.addEventListener("DOMContentLoaded", checkAuthStatus);
