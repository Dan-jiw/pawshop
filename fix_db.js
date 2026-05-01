const db = require("./config/db");

async function fix() {
  try {
    console.log("🚀 Починаємо генеральне лікування бази даних...");

    // 0. Вимикаємо перевірку ключів, щоб дозволити очищення (TRUNCATE)
    await db.query("SET FOREIGN_KEY_CHECKS = 0");

    // --- 1. КАТЕГОРІЇ ---
    await db.query("TRUNCATE TABLE categories");
    const categories = [
      [1, "Корм", "food", "🦴", 1],
      [2, "Аксесуари", "accessories", "🦮", 2],
      [3, "Здоров'я", "health", "💊", 3],
      [4, "Іграшки", "toys", "🎾", 4],
      [5, "Догляд", "care", "🧼", 5],
    ];
    for (const cat of categories) {
      await db.query(
        "INSERT INTO categories (id, name, slug, icon, sort_order) VALUES (?, ?, ?, ?, ?)",
        cat,
      );
    }
    console.log("✅ Категорії: ВИЛІКУВАНО");

    // --- 2. ТОВАРИ ---
    // Використовуємо назви колонок з твого DESC products
    await db.query("TRUNCATE TABLE products");
    const products = [
      [
        1,
        "Котячий будиночок Cozy",
        "Затишний будиночок для вашого котика",
        1200.0,
        1500.0,
        10,
        2,
        "cat",
        "house.jpg",
        "🏠",
        4.9,
        67,
        "Новинка",
      ],
      [
        2,
        "Преміум корм для котів",
        "Смачний та корисний раціон для дорослих котів",
        450.0,
        null,
        50,
        1,
        "cat",
        "food.jpg",
        "🍖",
        4.8,
        124,
        null,
      ],
    ];
    for (const prod of products) {
      await db.query(
        `INSERT INTO products 
                (id, name, description, price, old_price, stock, category_id, pet_type, image_url, emoji, rating, reviews_count, tag) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        prod,
      );
    }
    console.log("✅ Товари: ВИЛІКУВАНО");

    // --- 3. ВІДГУКИ ---
    // Використовуємо назви колонок з твого DESC reviews
    await db.query("TRUNCATE TABLE reviews");
    const reviews = [
      [
        1,
        2, // product_id (відгук до товару №2 - корм)
        null, // user_id
        "Ірина М.", // author_name
        5, // rating
        "Наш лабрадор обожнює цей корм! Рекомендую всім.",
      ],
    ];
    for (const rev of reviews) {
      await db.query(
        `INSERT INTO reviews (id, product_id, user_id, author_name, rating, comment) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
        rev,
      );
    }
    console.log("✅ Відгуки: ВИЛІКУВАНО");

    // --- 4. КОРИСТУВАЧІ ---
    // Оновлюємо ім'я адміна, щоб прибрати символи
    await db.query(`
            UPDATE users 
            SET name = 'Адміністратор', 
                password_hash = '$2a$10$cRFLw9vMpTpPbgaBZwowZuBULkkVdvQZn6WK4AI.0vL/MLnf2QCaa' 
            WHERE email = 'admin@pawshop.ua'
        `);
    console.log("✅ Профіль адміна: ВИЛІКУВАНО");

    // 5. Вмикаємо перевірку ключів назад
    await db.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("\n🎉 ВІТАЮ! База повністю оновлена.");
    console.log(
      "Перевір сайт та адмінку. Тепер там має бути нормальна українська мова.",
    );

    process.exit();
  } catch (err) {
    console.error("❌ Помилка під час виконання скрипта:", err.message);
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    process.exit(1);
  }
}

fix();
