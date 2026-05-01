const router = require("express").Router();
const db = require("../config/db");

// POST /api/orders — створити замовлення
router.post("/", async (req, res) => {
  const conn = await db.getConnection();
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      delivery_address,
      payment_method,
      notes,
      items,
    } = req.body;

    // Перевірка вхідних даних
    if (
      !customer_name ||
      !customer_email ||
      !delivery_address ||
      !items?.length
    ) {
      return res.status(400).json({ error: "Заповніть усі обов'язкові поля" });
    }

    await conn.beginTransaction();

    let total = 0;
    const orderItemsData = [];

    // 1. Перевірка наявності та підготовка даних
    for (const item of items) {
      const [[prod]] = await conn.query(
        "SELECT name, stock, is_active FROM products WHERE id = ?",
        [item.product_id],
      );

      // ПЕРЕВІРКА 1: Чи існує товар
      if (!prod || prod.is_active === 0) {
        // ДОДАЄМО return ТУТ!
        return res.status(400).json({
          error: `Товар "${item.product_name || item.product_id}" недоступний`,
        });
      }

      // ПЕРЕВІРКА 2: Чи достатньо на складі
      if (prod.stock < item.quantity) {
        // І ТУТ ТАКОЖ return!
        return res.status(400).json({
          error: `Недостатньо "${prod.name}" на складі. Доступно: ${prod.stock}`,
        });
      }
    }

    // 3. Створення основного замовлення
    // Використовуємо total_amount (згідно з твоїм INSERT)
    const [result] = await conn.query(
      `INSERT INTO orders (customer_name, customer_email, customer_phone, delivery_address, total_amount, payment_method, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        customer_name,
        customer_email,
        customer_phone || null,
        delivery_address,
        total,
        payment_method || "card",
        notes || null,
      ],
    );

    const orderId = result.insertId;

    // 4. Запис товарів у замовлення (деталізація)
    for (const itemData of orderItemsData) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          orderId,
          itemData.product_id,
          itemData.product_name,
          itemData.price,
          itemData.quantity,
        ],
      );
    }

    await conn.commit();

    res.json({
      success: true,
      order_id: orderId,
      total,
      message: "Замовлення успішно прийнято!",
    });
    for (const item of items) {
      // 1. Валідація кількості (не можна купити 0 або -5)
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error(`Некоректна кількість для товару #${item.product_id}`);
      }

      // 2. Перевірка наявності (Беремо актуальні дані з бази)
      const [[prod]] = await conn.query(
        "SELECT name, stock, is_active FROM products WHERE id = ?",
        [item.product_id],
      );

      if (!prod || prod.is_active === 0) {
        throw new Error(
          `Товар "${item.product_name || item.product_id}" недоступний для замовлення`,
        );
      }

      if (prod.stock < item.quantity) {
        throw new Error(
          `Недостатньо "${prod.name}" на складі. Доступно: ${prod.stock}`,
        );
      }
    }
  } catch (err) {
    await conn.rollback();
    console.error("ORDER ERROR:", err.message);
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/orders/:id — деталі замовлення
router.get("/:id", async (req, res) => {
  try {
    const [[order]] = await db.query("SELECT * FROM orders WHERE id = ?", [
      req.params.id,
    ]);

    if (!order)
      return res.status(404).json({ error: "Замовлення не знайдено" });

    const [items] = await db.query(
      `SELECT oi.*, p.image_url, p.emoji 
       FROM order_items oi 
       LEFT JOIN products p ON p.id = oi.product_id 
       WHERE oi.order_id = ?`,
      [req.params.id],
    );

    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
