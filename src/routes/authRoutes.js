import authController from "../controllers/authController.js";
import limiter from "../middleware/rateLimitMiddleware.js"; // Rate limiting middleware'ını içe aktar
export const authRoutes = async (req, res) => {
  const method = req.method;
  const url = req.url;

  try {
    switch (method) {
      case "POST":
        if (url === "/api/auth/register") {
          await limiter(req, res, () => authController.register(req, res));
        } else if (url === "/api/auth/login") {
          await limiter(req, res, () => authController.login(req, res));
        } else if (url === "/api/auth/logout") {
          await authController.logout(req, res);
        }
        break;
      default:
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Method not allowed" }));
    }
  } catch (error) {
    console.error("Auth route hatası:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Sunucu hatası" }));
  }
};

export default authRoutes;
