-- ============================================================
-- PawShop - База даних для інтернет-магазину зоотоварів
-- ============================================================

-- CREATE DATABASE IF NOT EXISTS pawshop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE pawshop;

-- Категорії товарів
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(10) DEFAULT '🐾',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Товари
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    old_price DECIMAL(10, 2) DEFAULT NULL,
    stock INT DEFAULT 0,
    category_id INT NOT NULL,
    pet_type ENUM('cat','dog','bird','fish','rabbit','all') DEFAULT 'all',
    image_url VARCHAR(500) DEFAULT NULL,
    emoji VARCHAR(10) DEFAULT '🐾',
    rating DECIMAL(3, 2) DEFAULT 0,
    reviews_count INT DEFAULT 0,
    tag VARCHAR(50) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Користувачі
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    role ENUM('user','admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Кошик
CREATE TABLE IF NOT EXISTS cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_cart_item (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Замовлення
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    delivery_address TEXT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending',
    payment_method ENUM('card','cash','online') DEFAULT 'card',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Позиції замовлення
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT  NULL,
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Відгуки
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT,
    author_name VARCHAR(150) NOT NULL,
    rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- SEED DATA - Початкові дані
-- ============================================================

INSERT INTO categories (name, slug, icon) VALUES
('Корм', 'food', '🥣'),
('Аксесуари', 'accessories', '🦮'),
('Здоров''я', 'health', '💊'),
('Іграшки', 'toys', '🎾'),
('Догляд', 'care', '🛁');

INSERT INTO products (name, description, price, old_price, stock, category_id, pet_type, emoji, rating, reviews_count, tag) VALUES
('Royal Canin Adult Cat', 'Збалансований корм для дорослих котів з оптимальним вмістом білків та жирів. Підтримує здоров''я шерсті та травлення.', 450.00, 520.00, 23, 1, 'cat', '🥣', 4.8, 142, 'Хіт продажів'),
('Purina Pro Plan Dog', 'Преміум корм для собак середніх порід з куркою та рисом. Зміцнює імунітет та підтримує оптимальну вагу.', 680.00, NULL, 17, 1, 'dog', '🍖', 4.7, 98, 'Топ вибір'),
('Котячий будиночок Cozy', 'Затишний будиночок з м''якою підстилкою та підвісними іграшками. Матеріал: екологічний фліс.', 1200.00, 1500.00, 8, 2, 'cat', '🏠', 4.9, 67, 'Новинка'),
('Шлейка для прогулянок', 'Ергономічна шлейка з відбиваючими елементами для безпечних нічних прогулянок. Розмір S/M/L.', 350.00, NULL, 31, 2, 'dog', '🦮', 4.6, 203, NULL),
('Вітаміни Omega-3', 'Омега-3 добавки для блиску шерсті та здоров''я суглобів. Підходить для котів і собак.', 290.00, NULL, 45, 3, 'all', '💊', 4.5, 89, NULL),
('Акваріум Starter Kit 30L', 'Повний набір для початківців: акваріум 30л, фільтр, LED освітлення, термометр та підкормка.', 2400.00, 2800.00, 5, 2, 'fish', '🐠', 4.7, 34, 'Новинка'),
('Корм для папуг ZooMix', 'Зернова суміш із фруктами та горіхами для хвилястих папуг. Вітамінізований склад.', 185.00, NULL, 29, 1, 'bird', '🦜', 4.4, 56, NULL),
('М''яч з пискавкою', 'Інтерактивний гумовий м''яч з пискавкою для активних ігор. Яскравий, міцний, безпечний.', 125.00, NULL, 52, 4, 'dog', '🎾', 4.6, 178, NULL),
('Лежанка Premium Velvet', 'Ортопедична лежанка з оксамитового матеріалу. Знімний та машинозмивний чохол. 60×50 см.', 890.00, 1100.00, 12, 2, 'all', '🛏️', 4.8, 91, 'Акція'),
('Шампунь Bio Pet Care', 'Натуральний шампунь на рослинній основі. Без SLS та парабенів. Підходить для чутливої шкіри.', 220.00, NULL, 38, 5, 'dog', '🛁', 4.3, 44, NULL),
('Автоматична годівниця', 'Розумна годівниця з таймером на 4 прийоми їжі та LCD дисплеєм. Об''єм 1.8л.', 1650.00, 1900.00, 9, 2, 'cat', '⏰', 4.7, 62, 'Топ вибір'),
('Пастки для бліх', 'Електрична пастка для бліх з UV лампою. Безпечна для тварин та людей. Радіус 20м².', 380.00, NULL, 20, 3, 'all', '🔆', 4.2, 33, NULL);

-- Тестовий адмін
INSERT INTO users (name, email, password_hash, role) VALUES
('Адміністратор', 'admin@pawshop.ua', '$2b$10$example_hash_replace_in_production', 'admin'),
('Тест Користувач', 'user@pawshop.ua', '$2b$10$example_hash_replace_in_production', 'user');

-- Тестові відгуки
INSERT INTO reviews (product_id, author_name, rating, comment) VALUES
(1, 'Олена К.', 5, 'Відмінний корм! Мій кіт їсть із задоволенням, шерсть стала блискучою.'),
(1, 'Максим П.', 4, 'Якість добра, але ціна трохи висока. Загалом задоволений.'),
(2, 'Ірина М.', 5, 'Наш лабрадор обожнює цей корм! Рекомендую всім.'),
(3, 'Тетяна В.', 5, 'Котик одразу зайшов у будиночок і не хоче виходити 😄'),
(8, 'Андрій С.', 4, 'М''ячик міцний, собака грається вже 3 місяці і не зламав.');
