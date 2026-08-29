import rabbitmqConnect from "../config/rabbitmq.js";
import { sequelize } from "../utilities/db.js";
import Post from "../models/Post.js";
import messageService from "./messageService.js";

const createSlug = (title) =>
  `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-${Date.now()}`;

async function createTopicForPost({ title, content, userId, categoryId }) {
  const [topicId] = await sequelize.query(
    `INSERT INTO topics (title, content, slug, user_id, category_id, created_at, updated_at)
     VALUES (:title, :content, :slug, :userId, :categoryId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    {
      replacements: {
        title,
        content,
        slug: createSlug(title),
        userId,
        categoryId,
      },
      type: sequelize.QueryTypes.INSERT,
    }
  );
  return topicId;
}

async function handleCreatePost(data) {
  const topicId = await createTopicForPost({
    title: data.title,
    content: data.content,
    userId: data.userId,
    categoryId: data.categoryId,
  });

  await Post.create({
    title: data.title,
    content: data.content,
    userId: data.userId,
    topicId,
  });
}

export async function startPostConsumer() {
  const channel = await rabbitmqConnect();
  await channel.assertQueue(messageService.QUEUE_NAME);

  channel.consume(messageService.QUEUE_NAME, async (msg) => {
    if (!msg) return;

    try {
      const { type, data } = JSON.parse(msg.content.toString());

      if (type === "create_post") {
        await handleCreatePost(data);
        console.log("Kuyruktan gelen post veritabanına kaydedildi:", data.title);
      }

      channel.ack(msg);
    } catch (error) {
      console.error("Post mesajı işlenirken hata:", error);
      channel.nack(msg, false, false);
    }
  });

  console.log(`RabbitMQ '${messageService.QUEUE_NAME}' kuyruğu dinleniyor.`);
}
