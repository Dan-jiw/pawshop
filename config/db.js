const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'pawshop',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

// Перевірка з'єднання при старті
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL підключено успішно!');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Помилка підключення до MySQL:', err.message);
  });

module.exports = pool;
