import amqp from "amqplib";

const rabbitmqConnect = async () => {
  try {
    const connection = await amqp.connect("amqp://localhost:5672");
    const channel = await connection.createChannel();
    console.log("RabbitMQ bağlantısı başarılı");
    return channel;
  } catch (error) {
    console.error("RabbitMQ bağlantı hatası:", error);
    throw error;
  }
};

export default rabbitmqConnect;
