import rateLimit from "express-rate-limit";

// IP bazlı istek sayılarını tutmak için Map
const requestCounts = new Map();

// Rate limiting ayarları
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 10, // Her IP için 15 dakikada maksimum 10 istek
  message: {
    message: "Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.",
  },
});

// Middleware fonksiyonu
const rateLimitMiddleware = (req, res, next) => {
  return new Promise((resolve) => {
    const ip = req.socket.remoteAddress || "unknown";
    const now = Date.now();

    // IP için rate limit verilerini al veya oluştur
    let rateData = requestCounts.get(ip) || { count: 0, startTime: now };

    // Zaman penceresi kontrolü
    if (now - rateData.startTime >= 15 * 60 * 1000) {
      // 15 dakika geçmişse sayacı sıfırla
      rateData = { count: 1, startTime: now };
    } else {
      // İstek sayısını artır
      rateData.count++;
    }

    // Rate limit kontrolü
    if (rateData.count > 10) {
      res.writeHead(429, { "Content-Type": "application/json" });
      res.end(JSON.stringify(limiter.message));
      return resolve();
    }

    // Rate limit verilerini güncelle
    requestCounts.set(ip, rateData);
    resolve(next());
  });
};

export default rateLimitMiddleware;
