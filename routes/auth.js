const router = require("express").Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "pawshop_secret";

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Заповніть усі обов'язкові поля" });
    if (password.length < 6)
      return res.status(400).json({ error: "Пароль мінімум 6 символів" });

    const [[existing]] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    if (existing)
      return res
        .status(409)
        .json({ error: "Користувач з таким email вже існує" });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)",
      [name, email, hash, phone || null],
    );

    const user = { id: result.insertId, name, email, role: "user" };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`🐾 Спроба входу: ${email}`); // Лог у термінал

    if (!email || !password)
      return res.status(400).json({ error: "Введіть email та пароль" });

    // Спробуємо отримати результат простіше
    const [rows] = await db.query(
      "SELECT id, name, email, password_hash, role FROM users WHERE email = ?",
      [email],
    );

    const user = rows[0]; // Беремо першого знайденого користувача

    if (!user) {
      console.log("❌ Користувача не знайдено в базі");
      return res.status(401).json({ error: "Невірний email або пароль" });
    }

    console.log("✅ Користувач знайдений, перевіряємо пароль...");
    console.log("Хеш з бази:", user.password_hash);

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      console.log("❌ Пароль не збігається!");
      return res.status(401).json({ error: "Невірний email або пароль" });
    }

    console.log("🎉 Вхід успішний!");

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: payload });
  } catch (err) {
    console.error("🔥 Помилка сервера:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me  — перевірити токен
router.get("/me", require("../middleware/auth"), (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
