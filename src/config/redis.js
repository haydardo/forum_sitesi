import { Redis } from "ioredis";

const redisClient = new Redis({
  host: "localhost",
  port: 6379,
  enableOfflineQueue: true,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redisClient.on("connect", () => {
  console.log("Redis bağlantısı başarılı");
});

redisClient.on("error", (error) => {
  console.error("Redis bağlantı hatası:", error);
});

export default redisClient;
