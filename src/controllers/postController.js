const jwt = require("jsonwebtoken");
const { Post, Like, User, sequelize, Category, Topic } = require("../models");
const path = require("path");
const fs = require("fs/promises");

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
      const post = await Post.findByPk(req.params.id, {
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
      });

      if (!post) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Gönderi bulunamadı" }));
        return;
      }

      // API isteği için JSON yanıt
      if (req.headers.accept?.includes("application/json")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(post));
        return;
      }

      // HTML yanıt için template dosyasını serve et
      const htmlFilePath = path.join(__dirname, "../../public/post.html");
      const html = await fs.readFile(htmlFilePath, "utf-8");

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    } catch (error) {
      console.error("Gönderi alınırken hata:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Gönderi alınamadı" }));
    }
  }
}

module.exports = new PostController();
