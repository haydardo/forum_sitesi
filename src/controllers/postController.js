const jwt = require("jsonwebtoken");
const { Post, Like, User, sequelize } = require("../models");

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
        ],
        order: [["created_at", "DESC"]],
      });
      const formattedPosts = posts.map((post) => {
        const postJson = post.toJSON();
        try {
          return {
            ...postJson,
            created_at: postJson.created_at
              ? new Date(postJson.created_at).toISOString()
              : null,
            updated_at: postJson.updated_at
              ? new Date(postJson.updated_at).toISOString()
              : null,
          };
        } catch (error) {
          console.error("Tarih dönüştürme hatası:", error);
          return {
            ...postJson,
            created_at: null,
          };
        }
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(formattedPosts));
    } catch (error) {
      console.error("Gönderiler alınırken hata:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Gönderiler alınamadı" }));
    }
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
      const post = await Post.create({
        title,
        content,
        user_id: userId,
        category_id: categoryId,
      });

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(post));
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
      const post = await Post.findByPk(req.params.id, {
        include: [
          {
            model: User,
            as: "author",
            attributes: ["username"],
          },
        ],
      });

      if (!post) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Gönderi bulunamadı" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(post));
    } catch (error) {
      console.error("Gönderi alınırken hata:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Gönderi alınamadı" }));
    }
  }
}

module.exports = new PostController();
