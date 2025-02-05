const { Post, User, Category, Topic, Like } = require("../models");
const { spawn } = require("child_process");
const jwt = require("jsonwebtoken");

const postController = {
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
            attributes: ["name"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(posts));
    } catch (error) {
      console.error("Post listeleme hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ message: "Gönderiler listelenirken bir hata oluştu" })
      );
    }
  },

  async createPost(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Yetkilendirme gerekli" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        // Token'dan userId al
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "gizli_anahtar"
        );
        const userId = decoded.id; // userId'yi token'dan alıyoruz

        const { title, content, categoryId } = JSON.parse(body);

        if (!title || !content || !categoryId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ message: "Başlık, içerik ve kategori zorunludur" })
          );
          return;
        }

        const analysisResult = await this.analyzeContent(content);
        const titleAnalysisResult = await this.analyzeContent(title);

        if (
          !analysisResult.is_appropriate ||
          !titleAnalysisResult.is_appropriate
        ) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              message:
                "Uygunsuz ifade kullandınız. Lütfen yasaklı kelimeler kullanmayın.",
            })
          );
          return;
        }

        const topic = await Topic.create({
          title,
          content,
          slug:
            title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now(),
          category_id: categoryId,
          user_id: userId, // Artık userId tanımlı
        });

        const post = await Post.create({
          title,
          content,
          category_id: categoryId,
          user_id: userId, // Artık userId tanımlı
          topic_id: topic.id,
          is_solution: false,
          like_count: 0,
        });

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify(post));
      } catch (error) {
        console.error("Post oluşturma hatası:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ message: "Gönderi oluşturulurken bir hata oluştu" })
        );
      }
    });
  },

  async likePost(req, res, postId) {
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

      const like = await Like.create({
        user_id: userId,
        post_id: postId,
      });

      const post = await Post.findByPk(postId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(post));
    } catch (error) {
      console.error("Beğeni hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Beğeni işlemi başarısız oldu" }));
    }
  },

  async analyzeContent(content) {
    return new Promise((resolve, reject) => {
      const python = spawn("python", ["python_scripts/content_analyzer.py"]);
      let result = "";
      let errorOutput = "";

      python.stdout.on("data", (data) => {
        result += data.toString();
      });

      python.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      python.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Python hatası: ${errorOutput}`));
          return;
        }
        try {
          resolve(JSON.parse(result));
        } catch (error) {
          reject(new Error("Python çıktısı JSON formatında değil"));
        }
      });

      python.stdin.write(JSON.stringify({ content }));
      python.stdin.end();
    });
  },
};

module.exports = postController;
