const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "pawshop_secret";

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers["authorization"];
  const token = header && header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: "Необхідна авторизація" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Недійсний або прострочений токен" });
  }
};
