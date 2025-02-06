const { Post, User, Category, Topic } = require("../models");
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
          req.params = { id: postId };
          await postController.likePost(req, res);
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
