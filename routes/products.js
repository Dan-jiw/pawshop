const router = require('express').Router();
const db = require('../config/db');

// GET /api/products — список товарів з фільтрацією
router.get('/', async (req, res) => {
  try {
    const { category, pet, search, sort = 'id', order = 'ASC', page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    let where = ['p.is_active = 1'];
    let params = [];

    if (category) { where.push('c.slug = ?'); params.push(category); }
    if (pet)      { where.push('(p.pet_type = ? OR p.pet_type = "all")'); params.push(pet); }
    if (search)   { where.push('p.name LIKE ?'); params.push(`%${search}%`); }

    const allowedSort = { price: 'p.price', rating: 'p.rating', name: 'p.name', id: 'p.id' };
    const sortCol = allowedSort[sort] || 'p.id';
    const sortDir = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [rows] = await db.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ${whereStr}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM products p
       JOIN categories c ON p.category_id = c.id ${whereStr}`,
      params
    );

    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id — один товар
router.get('/:id', async (req, res) => {
  try {
    const [[product]] = await db.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p JOIN categories c ON p.category_id = c.id
       WHERE p.id = ? AND p.is_active = 1`,
      [req.params.id]
    );
    if (!product) return res.status(404).json({ error: 'Товар не знайдено' });

    const [reviews] = await db.query(
      `SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 10`,
      [req.params.id]
    );

    res.json({ ...product, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/:id/reviews — додати відгук
router.post('/:id/reviews', async (req, res) => {
  try {
    const { author_name, rating, comment } = req.body;
    if (!author_name || !rating) return res.status(400).json({ error: 'Імʼя та оцінка обов\'язкові' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Оцінка від 1 до 5' });

    await db.query(
      `INSERT INTO reviews (product_id, author_name, rating, comment) VALUES (?, ?, ?, ?)`,
      [req.params.id, author_name, rating, comment || null]
    );

    // Оновлення рейтингу товару
    await db.query(
      `UPDATE products SET
        rating = (SELECT AVG(rating) FROM reviews WHERE product_id = ?),
        reviews_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ?)
       WHERE id = ?`,
      [req.params.id, req.params.id, req.params.id]
    );

    res.json({ success: true, message: 'Відгук додано!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
