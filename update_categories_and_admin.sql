USE pawshop;

-- 1. Розширюємо поле (про всяк випадок)
ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255);

-- 2. Оновлюємо сортування категорій
UPDATE categories SET sort_order = id;

-- 3. Встановлюємо правильні хеші
UPDATE users
SET password_hash = '$2a$10$cRFLw9vMpTpPbgaBZwowZuBULkkVdvQZn6WK4AI.0vL/MLnf2QCaa'
WHERE email = 'admin@pawshop.ua';

UPDATE users
SET password_hash = '$2a$10$cRFLw9vMpTpPbgaBZwowZuBULkkVdvQZn6WK4AI.0vL/MLnf2QCaa'
WHERE email = 'user@pawshop.ua';