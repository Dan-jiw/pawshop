const router = require("express").Router();
const db = require("../config/db");

// GET /api/categories
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, COUNT(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
       GROUP BY c.id 
       ORDER BY c.sort_order ASC, c.id ASC`, // Сортуємо за пріоритетом
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
