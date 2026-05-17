// routes/admin.js — PawShop Admin API
// Зображення зберігаються на Cloudinary (не локально)
// npm install cloudinary multer-storage-cloudinary

const router = require("express").Router();
const db = require("../config/db");
const adminOnly = require("../middleware/adminOnly");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

// ─── Cloudinary config ────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "pawshop/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 800, height: 800, crop: "limit", quality: "auto" },
    ],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype));
  },
});

// Хелпер для видалення зображення з Cloudinary
async function deleteCloudinaryImage(imageUrl) {
  if (!imageUrl || !imageUrl.includes("cloudinary")) return;
  try {
    // Витягуємо public_id з URL
    const parts = imageUrl.split("/");
    const filename = parts[parts.length - 1].split(".")[0];
    const folder = parts[parts.length - 2];
    await cloudinary.uploader.destroy(`${folder}/${filename}`);
  } catch (_) {}
}

// ════════════════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════════════════

// GET /api/admin/products — всі товари (включно з неактивними)
router.get("/products", adminOnly, async (req, res) => {
  try {
    const {
      search,
      category,
      status,
      sort = "p.id",
      order = "DESC",
      page = 1,
      limit = 20,
    } = req.query;
    const offset = (page - 1) * limit;

    let where = [];
    let params = [];

    if (search) {
      where.push("(p.name LIKE ? OR p.description LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      where.push("c.slug = ?");
      params.push(category);
    }
    if (status !== undefined && status !== "") {
      where.push("p.is_active = ?");
      params.push(+status);
    }

    const whereStr = where.length ? "WHERE " + where.join(" AND ") : "";
    const allowedSort = [
      "p.id",
      "p.name",
      "p.price",
      "p.stock",
      "p.rating",
      "p.is_active",
      "c.name",
    ];
    const sortCol = allowedSort.includes(sort) ? sort : "p.id";
    const sortDir = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const [rows] = await db.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p JOIN categories c ON p.category_id = c.id
       ${whereStr} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
      [...params, +limit, +offset],
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM products p
       JOIN categories c ON p.category_id = c.id ${whereStr}`,
      params,
    );

    // Міні-статистика
    const [[stats]] = await db.query(
      `SELECT COUNT(*) AS total,
              SUM(is_active=1) AS active,
              SUM(is_active=0) AS inactive,
              SUM(stock=0)     AS out_of_stock
       FROM products`,
    );

    res.json({ data: rows, total, page: +page, limit: +limit, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/products/:id
router.get("/products/:id", adminOnly, async (req, res) => {
  try {
    const [[product]] = await db.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [req.params.id],
    );
    if (!product) return res.status(404).json({ error: "Товар не знайдено" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/products — створити товар
router.post(
  "/products",
  adminOnly,
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        name,
        description,
        price,
        old_price,
        stock,
        category_id,
        pet_type,
        emoji,
        tag,
        is_active,
      } = req.body;
      if (!name || !price || !category_id)
        return res
          .status(400)
          .json({ error: "Назва, ціна та категорія обов'язкові" });

      // Cloudinary повертає secure_url замість локального шляху
      const image_url = req.file ? req.file.path : null;

      const [result] = await db.query(
        `INSERT INTO products (name, description, price, old_price, stock, category_id, pet_type, emoji, tag, image_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          description || null,
          +price,
          old_price || null,
          +stock || 0,
          +category_id,
          pet_type || "all",
          emoji || "🐾",
          tag || null,
          image_url,
          is_active !== undefined ? +is_active : 1,
        ],
      );
      res.json({ success: true, id: result.insertId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// PUT /api/admin/products/:id — оновити товар
router.put(
  "/products/:id",
  adminOnly,
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        name,
        description,
        price,
        old_price,
        stock,
        category_id,
        pet_type,
        emoji,
        tag,
        is_active,
      } = req.body;
      if (!name || !price || !category_id)
        return res
          .status(400)
          .json({ error: "Назва, ціна та категорія обов'язкові" });

      const fields = {
        name,
        description: description || null,
        price: +price,
        old_price: old_price || null,
        stock: +stock || 0,
        category_id: +category_id,
        pet_type: pet_type || "all",
        emoji: emoji || "🐾",
        tag: tag || null,
        is_active: is_active !== undefined ? +is_active : 1,
      };

      if (req.file) {
        // Видаляємо старе зображення з Cloudinary
        const [[old]] = await db.query(
          "SELECT image_url FROM products WHERE id=?",
          [req.params.id],
        );
        if (old) await deleteCloudinaryImage(old.image_url);
        fields.image_url = req.file.path;
      }

      await db.query("UPDATE products SET ? WHERE id = ?", [
        fields,
        req.params.id,
      ]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// DELETE /api/admin/products/:id
router.delete("/products/:id", adminOnly, async (req, res) => {
  try {
    // Видаляємо зображення з Cloudinary перед видаленням товару
    const [[product]] = await db.query(
      "SELECT image_url FROM products WHERE id=?",
      [req.params.id],
    );
    if (product) await deleteCloudinaryImage(product.image_url);

    await db.query("DELETE FROM products WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/products/:id/stock
router.patch("/products/:id/stock", adminOnly, async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || stock < 0)
      return res.status(400).json({ error: "Невірне значення" });
    await db.query("UPDATE products SET stock = ? WHERE id = ?", [
      +stock,
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/products/bulk
router.post("/products/bulk", adminOnly, async (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!ids?.length || !action)
      return res.status(400).json({ error: "Вкажіть товари та дію" });

    const placeholders = ids.map(() => "?").join(",");
    if (action === "activate")
      await db.query(
        `UPDATE products SET is_active=1 WHERE id IN (${placeholders})`,
        ids,
      );
    else if (action === "deactivate")
      await db.query(
        `UPDATE products SET is_active=0 WHERE id IN (${placeholders})`,
        ids,
      );
    else if (action === "delete") {
      // Видаляємо зображення з Cloudinary для кожного товару
      const [products] = await db.query(
        `SELECT image_url FROM products WHERE id IN (${placeholders})`,
        ids,
      );
      await Promise.all(
        products.map((p) => deleteCloudinaryImage(p.image_url)),
      );
      await db.query(`DELETE FROM products WHERE id IN (${placeholders})`, ids);
    } else return res.status(400).json({ error: "Невідома дія" });

    res.json({ success: true, affected: ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// CATEGORIES
// ════════════════════════════════════════════════════════════

router.get("/categories", adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, COUNT(p.id) AS product_count
       FROM categories c LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id ORDER BY c.sort_order ASC, c.id ASC`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/categories", adminOnly, async (req, res) => {
  try {
    const { name, slug, icon, sort_order } = req.body;
    if (!name || !slug)
      return res.status(400).json({ error: "Назва та slug обов'язкові" });
    const [r] = await db.query(
      "INSERT INTO categories (name, slug, icon, sort_order) VALUES (?, ?, ?, ?)",
      [name, slug, icon || "🐾", sort_order || 0],
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .json({ error: "Категорія з таким slug вже існує" });
    res.status(500).json({ error: err.message });
  }
});

router.put("/categories/:id", adminOnly, async (req, res) => {
  try {
    const { name, slug, icon, sort_order } = req.body;
    if (!name || !slug)
      return res.status(400).json({ error: "Назва та slug обов'язкові" });
    await db.query(
      "UPDATE categories SET name=?, slug=?, icon=?, sort_order=? WHERE id=?",
      [name, slug, icon || "🐾", sort_order || 0, req.params.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/categories/:id", adminOnly, async (req, res) => {
  try {
    const [[{ cnt }]] = await db.query(
      "SELECT COUNT(*) AS cnt FROM products WHERE category_id = ?",
      [req.params.id],
    );
    if (cnt > 0)
      return res
        .status(400)
        .json({ error: `Неможливо видалити: в категорії є ${cnt} товарів` });
    await db.query("DELETE FROM categories WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/categories/reorder
router.put("/categories/reorder", adminOnly, async (req, res) => {
  try {
    const { order } = req.body;
    for (const item of order)
      await db.query("UPDATE categories SET sort_order=? WHERE id=?", [
        item.sort_order,
        item.id,
      ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════

router.get("/orders", adminOnly, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let where = [];
    let params = [];
    if (status) {
      where.push("o.status = ?");
      params.push(status);
    }
    if (search) {
      where.push("(o.customer_email LIKE ? OR o.customer_name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    const whereStr = where.length ? "WHERE " + where.join(" AND ") : "";
    const [rows] = await db.query(
      `SELECT o.* FROM orders o ${whereStr} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, +limit, +offset],
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM orders o ${whereStr}`,
      params,
    );
    res.json({ data: rows, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/orders/:id — деталі замовлення з товарами
router.get("/orders/:id", adminOnly, async (req, res) => {
  try {
    const [[order]] = await db.query("SELECT * FROM orders WHERE id=?", [
      req.params.id,
    ]);
    if (!order)
      return res.status(404).json({ error: "Замовлення не знайдено" });

    // Якщо є таблиця order_items
    const [items] = await db
      .query(
        `SELECT oi.*, p.name, p.emoji, p.image_url
       FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
        [req.params.id],
      )
      .catch(() => [[]]);

    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/orders/:id/status", adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!allowed.includes(status))
      return res.status(400).json({ error: "Невірний статус" });
    await db.query("UPDATE orders SET status=? WHERE id=?", [
      status,
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// REVIEWS
// ════════════════════════════════════════════════════════════

router.get("/reviews", adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      `SELECT r.*, p.name AS product_name, p.emoji, p.id AS pid
       FROM reviews r LEFT JOIN products p ON p.id = r.product_id
       ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [+limit, +offset],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/reviews/:id", adminOnly, async (req, res) => {
  try {
    const [[r]] = await db.query("SELECT product_id FROM reviews WHERE id=?", [
      req.params.id,
    ]);
    await db.query("DELETE FROM reviews WHERE id=?", [req.params.id]);
    if (r) {
      await db.query(
        `UPDATE products SET
          rating=(SELECT COALESCE(AVG(rating),0) FROM reviews WHERE product_id=?),
          reviews_count=(SELECT COUNT(*) FROM reviews WHERE product_id=?)
         WHERE id=?`,
        [r.product_id, r.product_id, r.product_id],
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ════════════════════════════════════════════════════════════

router.get("/stats", adminOnly, async (req, res) => {
  try {
    const [[products]] = await db.query(
      `SELECT COUNT(*) AS total, SUM(is_active=1) AS active,
              SUM(stock=0) AS out_of_stock FROM products`,
    );
    const [[orders]] = await db.query(
      `SELECT COUNT(*) AS total,
              SUM(status='pending') AS pending,
              COALESCE(SUM(total_amount),0) AS revenue
       FROM orders`,
    );
    const [[reviews]] = await db.query("SELECT COUNT(*) AS total FROM reviews");
    res.json({ products, orders, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
