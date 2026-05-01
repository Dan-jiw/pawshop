const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST || "localhost",
  port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
  user: process.env.MYSQLUSER || process.env.DB_USER || "root",
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || "",
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || "pawshop",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
});

pool
  .getConnection()
  .then((conn) => {
    console.log("✅ MySQL підключено успішно!");
    conn.release();
  })
  .catch((err) => {
    console.error("❌ Помилка підключення до MySQL:", err.message);
  });

module.exports = pool;
