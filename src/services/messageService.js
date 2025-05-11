import rabbitmqConnect from "../config/rabbitmq.js";

const QUEUE_NAME = "post_operations";

const sendMessage = async (queueName, messageObject) => {
  try {
    const channel = await rabbitmqConnect();
    await channel.assertQueue(queueName); // kuyruk oluşturur, eğer mevcutsa doğrular.
    await channel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(messageObject))
    );
    console.log(
      `Mesaj başarıyla ${queueName} kuyruğuna gönderildi:`,
      messageObject
    );
  } catch (error) {
    console.error("Mesaj gönderimi hatası:", error);
    throw error;
  }
};

export default {
  sendMessage,
  QUEUE_NAME,
};
