# 🐾 PawShop — Інтернет-магазин зоотоварів

Повноцінний веб-додаток на **HTML + CSS + JavaScript** з бекендом на **Node.js + Express** і базою даних **MySQL**.

---

## 📁 Структура проекту

```
petshop/
├── config/
│   └── db.js              # Підключення до MySQL (пул з'єднань)
├── routes/
│   ├── products.js        # GET /api/products, /api/products/:id, відгуки
│   ├── orders.js          # POST /api/orders, GET /api/orders/:id
│   └── categories.js      # GET /api/categories
├── public/
│   ├── index.html         # Один HTML-файл (SPA)
│   ├── css/
│   │   └── style.css      # Всі стилі
│   └── js/
│       └── app.js         # Весь frontend JS
├── database.sql           # SQL схема + seed-дані
├── server.js              # Express-сервер
├── package.json
└── .env.example           # Шаблон змінних середовища
```

---

## 🚀 Швидкий старт

### 1. Встановіть залежності

```bash
cd petshop
npm install
```

### 2. Налаштуйте MySQL

```bash
# Увійдіть у MySQL
mysql -u root -p

# Виконайте схему з seed-даними
source database.sql
# або:
mysql -u root -p < database.sql
```

### 3. Налаштуйте `.env`

```bash
cp .env.example .env
# Відредагуйте .env — вкажіть ваші дані MySQL
```

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=ВАШ_ПАРОЛЬ
DB_NAME=pawshop
JWT_SECRET=change_this_secret
PORT=3000
```

### 4. Запустіть сервер

```bash
# Продакшн
npm start

# Розробка (з авто-перезапуском)
npm run dev
```

### 5. Відкрийте браузер

```
http://localhost:3000
```

---

## 🛠️ API Endpoints

| Метод | URL | Опис |
|-------|-----|------|
| GET | `/api/products` | Список товарів (фільтри: category, pet, search, sort, order, page, limit) |
| GET | `/api/products/:id` | Один товар + відгуки |
| POST | `/api/products/:id/reviews` | Додати відгук |
| GET | `/api/categories` | Всі категорії з кількістю товарів |
| POST | `/api/orders` | Створити замовлення |
| GET | `/api/orders/:id` | Деталі замовлення |
| GET | `/api/health` | Health check |

---

## 🗃️ База даних (MySQL)

Таблиці:
- **categories** — категорії (Корм, Аксесуари, Здоров'я, Іграшки, Догляд)
- **products** — товари з цінами, рейтингом, emoji, залишками
- **users** — покупці та адміни
- **cart** — кошик (серверний)
- **orders** — замовлення
- **order_items** — позиції замовлення
- **reviews** — відгуки з автоматичним оновленням рейтингу товару

---

## ✨ Функціонал

- 🏠 **Головна**: hero-секція, статистика, категорії, популярні товари
- 🛍️ **Магазин**: фільтрація за категорією та видом тварини, сортування, пагінація, вигляд сітки/списку
- 🔍 **Пошук**: живий пошук з debounce
- 📦 **Картка товару**: повна інформація, вибір кількості, відгуки, форма відгуку
- 🛒 **Кошик**: drawer-панель, зміна кількості, видалення (LocalStorage)
- 💳 **Замовлення**: форма оформлення, вибір оплати, підтвердження з номером
- ⭐ **Відгуки**: додавання через API, автооновлення рейтингу в MySQL
- 📱 **Адаптивний дизайн**: мобільний, планшет, десктоп

---

## 🔧 Технології

| Частина | Технологія |
|---------|-----------|
| Frontend | HTML5, CSS3 (Custom Properties), Vanilla JS (ES2020) |
| Backend | Node.js, Express.js |
| База даних | MySQL 8+ з пулом з'єднань (mysql2/promise) |
| Аутентифікація | JWT (bcryptjs) — підготовлено до розширення |
| Шрифти | Google Fonts (Playfair Display + Inter) |
