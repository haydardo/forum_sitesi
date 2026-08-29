# Forum Sistemi

Bu benim ilk projem. Amacım hazır bir framework'ün (Express, NestJS vb.) arkasına saklanmadan, Node.js'in `http` modülüyle bir backend'in temelde nasıl çalıştığını; Sequelize/MySQL ile ilişkisel veri modellemeyi, RabbitMQ ile asenkron mesajlaşmayı, Redis ile önbelleklemeyi ve JWT ile kimlik doğrulamayı sıfırdan, elle kurarak öğrenmekti. Bu yüzden projede kasıtlı olarak hiçbir web framework'ü kullanılmamıştır; routing, statik dosya servisi ve request/body parsing gibi işler manuel olarak yazılmıştır.

Kullanıcıların gönderiler oluşturabileceği, beğenebileceği ve kategorileri yönetebileceği bir forum sistemi uygulamasıdır.

## Özellikler

- Kullanıcılar gönderiler oluşturabilir ve düzenleyebilir.
- Gönderiler beğenilebilir ve beğeni sayısı güncellenebilir.
- Kategoriler oluşturulabilir, güncellenebilir ve silinebilir.
- RabbitMQ ile asenkron mesajlaşma sağlanır.

## Nasıl Çalışıyor?

Proje framework kullanmadığı için akışın büyük kısmı `src/main.js` içinde elle yönetiliyor:

- **Sunucu ve routing**: Node'un yerleşik `http` modülüyle bir server oluşturuluyor. Gelen her istek için CORS başlıkları ayarlanıyor, `POST` isteklerinde body manuel olarak toplanıp `JSON.parse` ile ayrıştırılıyor. İstek `/api/...` ile başlamıyorsa `public/` klasöründeki statik dosyalar (html/css/js) sunuluyor; başlıyorsa path'e bakılarak ilgili route modülüne (`src/routes/`) yönlendiriliyor.
- **Controller / Route / Middleware katmanı**: `src/routes/` gelen isteği path'e göre `src/controllers/` altındaki fonksiyonlara dağıtıyor. `src/middleware/authMiddleware.js` JWT doğrulaması yapıyor, `rateLimitMiddleware.js` istek sınırlaması uyguluyor.
- **Veritabanı**: Sequelize ORM + MySQL kullanılıyor. Bağlantı ayarları `config/config.json`'dan okunuyor (`src/utilities/db.js`). Tablo şemaları `src/migrations/`, örnek veriler `src/seeders/` altında; `npm run migrate` ile uygulanıyor. Modeller (`User`, `Post`, `Topic`, `Category`, `Comment`, `Like`) `src/models/` altında ve `src/models/index.js` bunları otomatik yükleyip ilişkilendiriyor.
- **Asenkron mesajlaşma (RabbitMQ)**: `src/config/rabbitmq.js` `amqplib` ile RabbitMQ'ya bağlanıyor, `src/services/messageService.js` gönderi işlemlerini `post_operations` kuyruğuna yazarak asıl işlemi ana isteğin akışından ayırıyor.
- **Önbellekleme (Redis)**: `src/config/redis.js` üzerinden bağlanılan Redis, özellikle kategori gibi sık okunan verileri cache'lemek için kullanılıyor.
- **Ek script**: `python_scripts/content_analyzer.py`, Node uygulamasından bağımsız çalışan bir Python içerik analiz aracı.

Yani bir istek geldiğinde sırasıyla: `http` server → statik/dinamik ayrımı → route → middleware (auth/rate-limit) → controller → Sequelize (MySQL) ve/veya RabbitMQ/Redis şeklinde ilerliyor.

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

4. MySQL (MariaDB), RabbitMQ ve Redis'i Docker Compose ile ayağa kaldırın (Docker Desktop'ın açık olması gerekir):
   ```bash
   docker compose up -d
   ```
   Bu komut üç servisi de container olarak başlatır: MariaDB `localhost:3307`, RabbitMQ `localhost:5673` (yönetim paneli `localhost:15673`), Redis `localhost:6380` üzerinden erişilebilir. Portlar, makinede zaten çalışan başka bir MySQL/RabbitMQ/Redis ile çakışmaması için standart portlardan kaydırılmıştır.

5. Veritabanı tablolarını oluşturun:
   ```bash
   npm run migrate
   ```

6. Uygulamayı başlatın:
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

- Node.js (framework yok, saf `http` modülü)
- Sequelize (ORM)
- MySQL / MariaDB
- RabbitMQ
- Redis
- JWT (JSON Web Tokens)
- Docker Compose (yerel geliştirme ortamı için MariaDB, RabbitMQ, Redis)

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına bakın.
