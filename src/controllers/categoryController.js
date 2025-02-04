const { Category, Post } = require("../models");
const url = require("url");

const categoryController = (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Tüm kategorileri getir - GET /categories
  if (path === "/api/categories" && method === "GET") {
    Category.findAll({
      include: [
        {
          model: Category,
          as: "subCategories",
          attributes: ["id", "name", "description"],
        },
        {
          model: Post,
          as: "Posts",
          attributes: ["id", "title", "content", "createdAt"],
          include: [
            {
              model: User,
              as: "author",
              attributes: ["username"],
            },
          ],
          order: [["createdAt", "DESC"]],
          separate: true,
        },
      ],
      where: {
        parent_id: null,
      },
      attributes: ["id", "name", "slug", "description"],
    })
      .then((categories) => {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify(categories));
      })
      .catch((error) => {
        console.error("Kategori listeleme hatası:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Kategoriler listelenirken bir hata oluştu",
          })
        );
      });
  }
  // Yeni kategori oluştur - POST /categories
  else if (path === "/categories" && method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      //Burada veriyi parça parça alıyoruz.
      body += chunk.toString(); //Burada ise veriyi stringe çevirip body'ye ekliyoruz.
    });

    req.on("end", () => {
      //Tüm veri parçaları alındığında çalışır.
      try {
        const { name, description } = JSON.parse(body);
        const slug = name.toLowerCase().replace(/ /g, "-");

        Category.create({ name, slug, description })
          .then((category) => {
            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify(category));
          })
          .catch((error) => {
            if (error.name === "SequelizeUniqueConstraintError") {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  message: "Bu kategori adı zaten kullanılıyor",
                })
              );
              return;
            }
            console.error("Kategori oluşturma hatası:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                message: "Kategori oluşturulurken bir hata oluştu",
              })
            );
          });
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Geçersiz istek formatı" }));
      }
    });
  }

  // ID'ye göre kategori getir - GET /categories/:id
  else if (path.match(/^\/categories\/\d+$/) && method === "GET") {
    const id = path.split("/")[2];
    Category.findByPk(id, {
      include: [
        {
          model: Post,
          attributes: ["id", "title"],
        },
      ],
    })
      .then((category) => {
        if (!category) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "Kategori bulunamadı" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(category));
      })
      .catch((error) => {
        console.error("Kategori getirme hatası:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Kategori getirilirken bir hata oluştu",
          })
        );
      });
  }

  // Kategori güncelle - PUT /categories/:id
  else if (path.match(/^\/categories\/\d+$/) && method === "PUT") {
    const id = path.split("/")[2];
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const { name, description } = JSON.parse(body);
        const slug = name.toLowerCase().replace(/ /g, "-");

        Category.findByPk(id)
          .then((category) => {
            if (!category) {
              res.writeHead(404, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ message: "Kategori bulunamadı" }));
              return;
            }

            return category.update({ name, slug, description });
          })
          .then((updatedCategory) => {
            if (updatedCategory) {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(updatedCategory));
            }
          })
          .catch((error) => {
            console.error("Kategori güncelleme hatası:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                message: "Kategori güncellenirken bir hata oluştu",
              })
            );
          });
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Geçersiz istek formatı" }));
      }
    });
  }

  // Kategori sil - DELETE /categories/:id
  else if (path.match(/^\/categories\/\d+$/) && method === "DELETE") {
    const id = path.split("/")[2];
    Category.findByPk(id)
      .then((category) => {
        if (!category) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "Kategori bulunamadı" }));
          return;
        }

        return category.destroy();
      })
      .then(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Kategori başarıyla silindi" }));
      })
      .catch((error) => {
        console.error("Kategori silme hatası:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Kategori silinirken bir hata oluştu",
          })
        );
      });
  }

  // Geçersiz endpoint
  else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Endpoint bulunamadı" }));
  }
};

module.exports = categoryController;
