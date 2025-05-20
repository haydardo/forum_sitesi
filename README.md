# Forum Sistemi

Bu proje, kullanıcıların gönderiler oluşturabileceği, beğenebileceği ve kategorileri yönetebileceği bir forum sistemi uygulamasıdır. RabbitMQ kullanılarak asenkron mesajlaşma sağlanmaktadır, projede hiçbir framework kullanılmamıştır.

## Özellikler

- Kullanıcılar gönderiler oluşturabilir ve düzenleyebilir.
- Gönderiler beğenilebilir ve beğeni sayısı güncellenebilir.
- Kategoriler oluşturulabilir, güncellenebilir ve silinebilir.
- RabbitMQ ile asenkron mesajlaşma sağlanır.

## Kurulum

1. Projeyi klonlayın:
   ```bash
   git clone https://github.com/kullanici/forum-sistemi.git
   cd forum-sistemi
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. `.env` dosyasını oluşturun ve gerekli çevre değişkenlerini ayarlayın:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=forum_db
   JWT_SECRET=your_jwt_secret
   ```

4. Veritabanını oluşturun ve tabloları ayarlayın:
   ```bash
   npm run migrate
   ```

5. Uygulamayı başlatın:
   ```bash
   npm run dev
   ```

## Kullanım

- Uygulama `http://localhost:3001` adresinde çalışacaktır.
- API endpoint'leri aşağıdaki gibidir:
  - `POST /api/posts`: Yeni bir gönderi oluşturur.
  - `GET /api/posts`: Tüm gönderileri listeler.
  - `PUT /api/posts/:id`: Belirli bir gönderiyi günceller.
  - `DELETE /api/posts/:id`: Belirli bir gönderiyi siler.
  - `POST /api/likes`: Bir gönderiye beğeni ekler.
  - `DELETE /api/likes/:postId`: Bir gönderiden beğeni kaldırır.
  - `POST /api/categories`: Yeni bir kategori oluşturur.
  - `GET /api/categories`: Tüm kategorileri listeler.
  - `PUT /api/categories/:id`: Belirli bir kategoriyi günceller.
  - `DELETE /api/categories/:id`: Belirli bir kategoriyi siler.

## Teknolojiler

- Node.js
- Express.js
- Sequelize (ORM)
- MySQL
- RabbitMQ
- JWT (JSON Web Tokens)

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına bakın.
