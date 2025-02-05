const { Post, User, Category, Topic, Like } = require("../models");
const jwt = require("jsonwebtoken");
const { spawn } = require("child_process");
const postController = require("../controllers/postController");

async function analyzeContent(content) {
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
}

async function handleGetRequest(req, res) {
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
}

async function handleLikeRequest(req, res, postId) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Yetkilendirme gerekli" }));
    return;
  }

  const token = authHeader.split(" ")[1];
  let userId;
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "gizli_anahtar"
    );
    userId = decoded.id;
  } catch (error) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Geçersiz token" }));
    return;
  }

  try {
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
}

async function handlePostRequest(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Yetkilendirme gerekli" }));
    return;
  }

  const token = authHeader.split(" ")[1];
  let userId;
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "gizli_anahtar"
    );
    userId = decoded.id;
  } catch (error) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Geçersiz token" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      if (!body) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Geçersiz istek verisi" }));
        return;
      }

      const { title, content, categoryId } = JSON.parse(body);

      if (!title || !content || !categoryId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ message: "Başlık, içerik ve kategori zorunludur" })
        );
        return;
      }

      const analysisResult = await analyzeContent(content);
      const titleAnalysisResult = await analyzeContent(title);

      if (
        !analysisResult.is_appropriate ||
        !titleAnalysisResult.is_appropriate
      ) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message:
              "Uygunsuz ifade kullandınız. Lütfen yasaklı kelimeler kullanmayın ve daha nazik bir dil tercih edin.",
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
        user_id: userId,
      });

      const post = await Post.create({
        title,
        content,
        category_id: categoryId,
        user_id: userId,
        topic_id: topic.id,
        is_solution: false,
        like_count: 0,
      });

      res.writeHead(201, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(post));
    } catch (error) {
      console.error("Post oluşturma hatası:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ message: "Gönderi oluşturulurken bir hata oluştu" })
      );
    }
  });
}

async function postRoutes(req, res) {
  const method = req.method;
  const url = req.url;

  try {
    switch (method) {
      case "GET":
        await postController.getAllPosts(req, res);
        break;
      case "POST":
        if (url.match(/\/api\/posts\/\d+\/like/)) {
          const postId = url.split("/")[3];
          await postController.likePost(req, res, postId);
        } else {
          await postController.createPost(req, res);
        }
        break;
      case "OPTIONS":
        res.writeHead(200, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        });
        res.end();
        break;
      default:
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Method not allowed" }));
    }
  } catch (error) {
    console.error("Post route hatası:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Sunucu hatası" }));
  }
}

module.exports = postRoutes;
