const jwt = require("jsonwebtoken");
const {
  Post,
  Like,
  User,
  sequelize,
  Category,
  Topic,
  Comment,
} = require("../models");
const path = require("path");
const fs = require("fs/promises");
const { spawn } = require("child_process");

class PostController {
  async getAllPosts(req, res) {
    try {
      const posts = await Post.findAll({
        include: [
          {
            model: User,
            as: "author",
            attributes: ["username"],
          },
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "description"],
          },
        ],
        order: [["created_at", "DESC"]],
        attributes: {
          include: [
            "id",
            "title",
            "content",
            "created_at",
            "updated_at",
            "like_count",
          ],
        },
      });

      const formattedPosts = posts.map((post) => {
        const postJson = post.toJSON();
        return {
          ...postJson,
          created_at: postJson.created_at
            ? new Date(postJson.created_at).toISOString()
            : null,
          updated_at: postJson.updated_at
            ? new Date(postJson.updated_at).toISOString()
            : null,
        };
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(formattedPosts));
    } catch (error) {
      console.error("Gönderiler alınırken hata:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Gönderiler alınamadı" }));
    }
  }

  // İçerik analizi için yardımcı fonksiyon
  async analyzeContent(content) {
    return new Promise((resolve, reject) => {
      const python = spawn("python", ["python_scripts/content_analyzer.py"]);
      let result = "";
      let errorOutput = "";

      python.stdin.write(JSON.stringify({ content }));
      python.stdin.end();

      python.stdout.on("data", (data) => {
        result += data.toString();
      });

      python.stderr.on("data", (data) => {
        errorOutput += data.toString();
        console.error("Python hatası:", errorOutput);
      });

      python.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Python hatası: ${errorOutput}`));
          return;
        }
        try {
          const analysis = JSON.parse(result);
          console.log("İçerik analizi sonucu:", analysis); // Debug için
          resolve(analysis);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  async createPost(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Yetkilendirme gerekli" }));
      return;
    }

    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "gizli_anahtar"
      );
      const userId = decoded.id;

      const { title, content, categoryId } = req.body;
      console.log("İçerik kontrolü başlıyor:", { title, content }); // Debug için

      // Başlık ve içerik analizi
      const titleAnalysis = await this.analyzeContent(title);
      const contentAnalysis = await this.analyzeContent(content);

      console.log("Analiz sonuçları:", { titleAnalysis, contentAnalysis }); // Debug için

      if (!titleAnalysis.is_appropriate || !contentAnalysis.is_appropriate) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Uygunsuz içerik",
            message: "Gönderi uygunsuz içerik içeriyor. Lütfen düzenleyin.",
            details: {
              title: titleAnalysis.has_bad_words
                ? "Başlıkta uygunsuz kelimeler var"
                : null,
              content: contentAnalysis.has_bad_words
                ? "İçerikte uygunsuz kelimeler var"
                : null,
            },
          })
        );
        return;
      }

      // Benzersiz slug oluştur
      const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const timestamp = Date.now();
      const uniqueSlug = `${baseSlug}-${timestamp}`;

      // Yeni bir topic oluştur
      const topic = await Topic.create({
        title,
        content,
        user_id: userId,
        category_id: categoryId,
        slug: uniqueSlug,
      });

      // Post'u topic_id ile oluştur
      const post = await Post.create({
        title,
        content,
        user_id: userId,
        category_id: categoryId,
        topic_id: topic.id,
      });

      // Oluşturulan postu ilişkileriyle birlikte al
      const createdPost = await Post.findByPk(post.id, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["username"],
          },
          {
            model: Category,
            as: "category",
            attributes: ["id", "name"],
          },
        ],
      });

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(createdPost));
    } catch (error) {
      console.error("Gönderi oluşturma hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Gönderi oluşturulamadı" }));
    }
  }

  async likePost(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Yetkilendirme gerekli" }));
      return;
    }

    const transaction = await sequelize.transaction();

    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "gizli_anahtar"
      );
      const userId = decoded.id;
      const postId = req.params.id;

      const existingLike = await Like.findOne({
        where: {
          user_id: userId,
          post_id: postId,
        },
        transaction,
      });

      if (existingLike) {
        const post = await Post.findByPk(postId, { transaction });
        const currentLikeCount = post.like_count;

        await existingLike.destroy({ transaction });
        await post.update(
          { like_count: Math.max(0, currentLikeCount - 1) },
          { transaction }
        );

        await transaction.commit();

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Beğeni kaldırıldı",
            liked: false,
            likeCount: Math.max(0, currentLikeCount - 1),
          })
        );
        return;
      }

      const [like, created] = await Like.findOrCreate({
        where: {
          user_id: userId,
          post_id: postId,
        },
        transaction,
      });

      if (created) {
        const post = await Post.findByPk(postId, { transaction });
        await post.update(
          { like_count: sequelize.literal("like_count + 1") },
          { transaction }
        );
      }

      const updatedPost = await Post.findByPk(postId, { transaction });
      await transaction.commit();

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "Gönderi beğenildi",
          liked: true,
          likeCount: updatedPost.like_count,
        })
      );
    } catch (error) {
      await transaction.rollback();
      console.error("Beğeni hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "Beğeni işlemi sırasında bir hata oluştu" })
      );
    }
  }

  async getPostById(req, res) {
    try {
      const postId = req.params.id;
      const post = await Post.findByPk(postId, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["username"],
          },
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "description"],
          },
        ],
        attributes: [
          "id",
          "title",
          "content",
          "created_at",
          "updated_at",
          "like_count",
        ],
      });

      if (!post) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Gönderi bulunamadı" }));
        return;
      }

      // API yanıtı için veriyi formatla
      const formattedPost = {
        ...post.toJSON(),
        created_at: post.created_at
          ? new Date(post.created_at).toISOString()
          : null,
        updated_at: post.updated_at
          ? new Date(post.updated_at).toISOString()
          : null,
      };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(formattedPost));
    } catch (error) {
      console.error("Gönderi detayı alınırken hata:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Gönderi detayları alınamadı" }));
    }
  }

  async addComment(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Yetkilendirme gerekli" }));
      return;
    }

    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "gizli_anahtar"
      );
      const userId = decoded.id;
      const postId = req.params.id;
      const { content } = req.body;

      // İçerik analizi için doğru formatta veri gönder
      const contentAnalysis = await this.analyzeContent(content);
      console.log("Yorum analiz sonucu:", contentAnalysis); // Debug için

      if (!contentAnalysis.is_appropriate) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Yorum uygunsuz içerik içeriyor",
            details: {
              content: "Yorumunuzda uygunsuz kelimeler var",
            },
          })
        );
        return;
      }

      const comment = await Comment.create({
        content,
        user_id: userId,
        post_id: postId,
      });

      const commentWithUser = await Comment.findByPk(comment.id, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["username"],
          },
        ],
      });

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(commentWithUser));
    } catch (error) {
      console.error("Yorum ekleme hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Yorum eklenirken bir hata oluştu" }));
    }
  }

  // Yorumları getirme metodu
  async getComments(req, res) {
    try {
      const postId = req.params.id;
      const comments = await Comment.findAll({
        where: { post_id: postId },
        include: [
          {
            model: User,
            as: "author",
            attributes: ["username"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(comments));
    } catch (error) {
      console.error("Yorumları getirme hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Yorumlar alınamadı" }));
    }
  }
}

module.exports = new PostController();
