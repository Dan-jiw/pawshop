/* ═══════════════════════════════════════════════════════════
   PawShop — Frontend JS
   Підключається до Node.js/Express + MySQL API
══════════════════════════════════════════════════════════ */

const API = "/api";

/* ─── State ─────────────────────────────────────────────── */
const state = {
  cart: JSON.parse(localStorage.getItem("pawshop_cart") || "[]"),
  products: [],
  categories: [],
  filters: { category: "", pet: "", search: "" },
  sort: "id|ASC",
  page: 1,
  totalProducts: 0,
  currentProduct: null,
  qty: 1,
  reviewRating: 0,
  paymentMethod: "card",
};

const getImgPath = (path) => {
  if (!path) return null;
  // Якщо шлях вже має 'uploads', просто додаємо один слеш на початок
  // Якщо немає - додаємо /uploads/
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return cleanPath.replace("//", "/");
};

/* ─── API helpers ────────────────────────────────────────── */
async function api(path, opts = {}) {
  try {
    const res = await fetch(API + path, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Помилка запиту");
    return data;
  } catch (err) {
    toast(err.message, "error");
    throw err;
  }
}

/* ─── Toast ─────────────────────────────────────────────── */
function toast(msg, type = "") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast show${type ? " " + type : ""}`;
  setTimeout(() => el.classList.remove("show"), 3200);
}

/* ─── Page router ────────────────────────────────────────── */
function showPage(name) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("page-" + name)?.classList.add("active");
  document.querySelectorAll(".nav__link").forEach((l) => {
    l.classList.toggle("active", l.dataset.page === name);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name === "shop") loadShopProducts();
}

document.querySelectorAll("[data-page]").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    showPage(link.dataset.page);
  });
});

/* ─── Header scroll ─────────────────────────────────────── */
window.addEventListener("scroll", () => {
  document
    .querySelector(".header")
    .classList.toggle("scrolled", window.scrollY > 20);
});

/* ─── Search ─────────────────────────────────────────────── */
document.getElementById("searchToggle").addEventListener("click", () => {
  const bar = document.getElementById("searchBar");
  bar.classList.toggle("open");
  if (bar.classList.contains("open"))
    document.getElementById("searchInput").focus();
});
document.getElementById("searchClose").addEventListener("click", () => {
  document.getElementById("searchBar").classList.remove("open");
});
let searchTimer;
document.getElementById("searchInput").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.filters.search = e.target.value.trim();
    state.page = 1;
    showPage("shop");
  }, 400);
});

/* ─── Categories ────────────────────────────────────────── */
async function loadCategories() {
  try {
    state.categories = await api("/categories");
    renderHomeCategories();
    renderFilterCategories();
  } catch (_) {}
}

function renderHomeCategories() {
  const grid = document.getElementById("homeCategories");
  grid.innerHTML = state.categories
    .map(
      (c) => `
    <div class="category-card" onclick="filterByCategory('${c.slug}')">
      <span class="category-card__icon">${c.icon}</span>
      <div class="category-card__name">${c.name}</div>
      <div class="category-card__count">${c.product_count} товарів</div>
    </div>
  `,
    )
    .join("");
}

function renderFilterCategories() {
  const wrap = document.getElementById("filterCategories");
  wrap.innerHTML =
    `<label class="filter-radio"><input type="radio" name="cat" value="" ${!state.filters.category ? "checked" : ""}> Всі</label>` +
    state.categories
      .map(
        (c) => `
      <label class="filter-radio">
        <input type="radio" name="cat" value="${c.slug}" ${state.filters.category === c.slug ? "checked" : ""}>
        ${c.icon} ${c.name}
      </label>
    `,
      )
      .join("");
}

function filterByCategory(slug) {
  state.filters.category = slug;
  state.page = 1;
  showPage("shop");
  renderFilterCategories();
}

/* ─── Products ───────────────────────────────────────────── */
async function loadFeaturedProducts() {
  try {
    const data = await api("/products?sort=rating&order=DESC&limit=4");
    renderProductCards(data.data, document.getElementById("featuredProducts"));
  } catch (_) {}
}

async function loadShopProducts() {
  const grid = document.getElementById("shopProducts");
  grid.innerHTML = '<div class="spinner"></div>';

  const [sortField, sortDir] = state.sort.split("|");
  const params = new URLSearchParams({
    page: state.page,
    limit: 9,
    sort: sortField,
    order: sortDir,
    ...(state.filters.category && { category: state.filters.category }),
    ...(state.filters.pet && { pet: state.filters.pet }),
    ...(state.filters.search && { search: state.filters.search }),
  });

  try {
    const data = await api(`/products?${params}`);
    state.products = data.data;
    state.totalProducts = data.total;

    const count = document.getElementById("shopCount");
    count.textContent = `Знайдено ${data.total} товарів`;

    if (!data.data.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)">
        <div style="font-size:3rem;margin-bottom:16px">🔍</div>
        <p>Товарів за вашим запитом не знайдено</p>
      </div>`;
    } else {
      renderProductCards(data.data, grid);
    }
    renderPagination(data.total, 9);
  } catch (_) {}
}

function renderProductCards(products, container) {
  container.innerHTML = products
    .map(
      (p) => `
    <div class="product-card" onclick="openProduct(${p.id})">
      ${p.tag ? `<div class="product-card__tag ${["Новинка", "Акція"].includes(p.tag) ? "green" : ""}">${p.tag}</div>` : ""}
      <div class="product-card__thumb">
        ${
          p.image_url
            ? `<img src="${getImgPath(p.image_url)}" alt="${p.name}" class="product-card__img" onerror="this.src='/img/no-photo.png'">`
            : p.emoji || "🐾"
        }
      </div>
      <div class="product-card__body">
        <div class="product-card__category">${p.category_name || ""}</div>
        <div class="product-card__name">${p.name}</div>
        <div class="product-card__rating">
          <span class="stars">${renderStars(p.rating)}</span>
          <span>${(+p.rating).toFixed(1)} (${p.reviews_count})</span>
        </div>
        <div class="product-card__footer">
          <div>
            <div class="product-card__price">${formatPrice(p.price)}</div>
            ${p.old_price ? `<div class="product-card__old-price">${formatPrice(p.old_price)}</div>` : ""}
          </div>
          <button class="add-btn" onclick="event.stopPropagation();addToCart(${p.id},'${escHtml(p.name)}',${p.price},'${p.image_url || p.emoji || "🐾"}')">+</button>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

function renderStars(rating) {
  const full = Math.round(+rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}
function formatPrice(n) {
  return (+n).toLocaleString("uk-UA") + " ₴";
}
function escHtml(s) {
  return String(s).replace(/'/g, "\\'");
}

/* ─── Pagination ────────────────────────────────────────── */
function renderPagination(total, limit) {
  const pages = Math.ceil(total / limit);
  const el = document.getElementById("pagination");
  if (pages <= 1) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = Array.from(
    { length: pages },
    (_, i) => `
    <button class="page-btn${state.page === i + 1 ? " active" : ""}" onclick="goPage(${i + 1})">${i + 1}</button>
  `,
  ).join("");
}
function goPage(n) {
  state.page = n;
  loadShopProducts();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ─── Product modal ─────────────────────────────────────── */
async function openProduct(id) {
  try {
    const product = await api(`/products/${id}`);
    state.currentProduct = product;
    state.qty = 1;
    state.reviewRating = 0;
    renderProductModal(product);
    document.getElementById("productModal").classList.add("open");
  } catch (_) {}
}

function renderProductModal(p) {
  const box = document.getElementById("modalBox");
  box.innerHTML = `
    <button class="btn-icon" style="position:absolute;top:16px;right:16px;z-index:1" onclick="closeModal('productModal')">✕</button>
    <div class="product-modal__inner">
        <div class="product-modal__emoji">
          ${
            p.image_url
              ? `<img src="${getImgPath(p.image_url)}" alt="${p.name}" class="product-modal__img">`
              : p.emoji || "🐾"
          }
        </div>
      <div>
        <div style="font-size:.8rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">${p.category_name || ""}</div>
        <div class="product-modal__name">${p.name}</div>
        ${p.tag ? `<div class="product-card__tag" style="position:static;display:inline-block;margin-bottom:12px">${p.tag}</div>` : ""}
        <div class="product-modal__price">${formatPrice(p.price)}</div>
        ${p.old_price ? `<div class="product-modal__old">${formatPrice(p.old_price)}</div>` : ""}
        <p class="product-modal__desc">${p.description || ""}</p>
        <div class="product-modal__meta">
          <span class="meta-tag">📦 Залишок: ${p.stock} шт.</span>
          <span class="meta-tag">${renderStars(p.rating)} ${(+p.rating).toFixed(1)}</span>
          ${p.pet_type ? `<span class="meta-tag">${petLabel(p.pet_type)}</span>` : ""}
        </div>
        <div class="qty-control">
          <button class="qty-btn" onclick="changeQty(-1)">−</button>
          <span class="qty-display" id="qtyDisplay">1</span>
          <button class="qty-btn" onclick="changeQty(1)">+</button>
          <span style="font-size:.85rem;color:var(--text-muted)">шт.</span>
        </div>
        <button class="btn btn--primary btn--full" onclick="addToCartQty()">🛒 Додати до кошика</button>
      </div>
    </div>
    <div class="reviews-section">
      <h4>Відгуки (${p.reviews ? p.reviews.length : 0})</h4>
      ${
        (p.reviews || [])
          .map(
            (r) => `
        <div class="review-item">
          <div class="review-item__head">
            <span class="review-item__author">${escapeHtml(r.author_name)}</span>
            <span class="stars" style="font-size:.9rem">${renderStars(r.rating)}</span>
          </div>
          ${r.comment ? `<p class="review-item__text">${escapeHtml(r.comment)}</p>` : ""}
          <small style="color:var(--text-muted);font-size:.75rem">${new Date(r.created_at).toLocaleDateString("uk-UA")}</small>
        </div>
      `,
          )
          .join("") ||
        '<p style="color:var(--text-muted);font-size:.9rem">Ще немає відгуків. Будьте першим!</p>'
      }
      <div class="review-form">
        <h5>Залишити відгук</h5>
        <div class="star-picker" id="starPicker">
          ${[1, 2, 3, 4, 5].map((n) => `<span class="star-pick" data-val="${n}" onclick="setReviewRating(${n})">⭐</span>`).join("")}
        </div>
        <input id="reviewAuthor" class="form-input" placeholder="Ваше ім'я" />
        <textarea id="reviewComment" class="form-textarea" placeholder="Ваш відгук..."></textarea>
        <button class="btn btn--primary btn--sm" style="margin-top:10px" onclick="submitReview(${p.id})">Відправити</button>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function petLabel(t) {
  const m = {
    cat: "🐱 Коти",
    dog: "🐶 Собаки",
    bird: "🦜 Птахи",
    fish: "🐠 Рибки",
    rabbit: "🐇 Гризуни",
    all: "🐾 Всі",
  };
  return m[t] || t;
}

function changeQty(delta) {
  const max = state.currentProduct?.stock || 99;
  state.qty = Math.max(1, Math.min(state.qty + delta, max));
  document.getElementById("qtyDisplay").textContent = state.qty;
}

function addToCartQty() {
  const p = state.currentProduct;
  if (!p) return;
  addToCart(p.id, p.name, p.price, p.emoji || "🐾", state.qty);
  closeModal("productModal");
}

function setReviewRating(val) {
  state.reviewRating = val;
  document
    .querySelectorAll(".star-pick")
    .forEach((s) => s.classList.toggle("active", +s.dataset.val <= val));
}

async function submitReview(productId) {
  const author = document.getElementById("reviewAuthor").value.trim();
  if (!author) {
    toast("Введіть ваше ім'я", "error");
    return;
  }
  if (!state.reviewRating) {
    toast("Оберіть оцінку", "error");
    return;
  }
  const comment = document.getElementById("reviewComment").value.trim();
  try {
    await api(`/products/${productId}/reviews`, {
      method: "POST",
      body: JSON.stringify({
        author_name: author,
        rating: state.reviewRating,
        comment,
      }),
    });
    toast("Дякуємо за відгук!", "success");
    openProduct(productId); // reload
  } catch (_) {}
}

/* ─── Cart ──────────────────────────────────────────────── */
function addToCart(productId, name, price, emoji, qty = 1) {
  const existing = state.cart.find((i) => i.productId === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    state.cart.push({ productId, name, price: +price, emoji, qty });
  }
  saveCart();
  renderCartBadge();
  toast(`✓ ${name} додано до кошика`, "success");
}

function saveCart() {
  localStorage.setItem("pawshop_cart", JSON.stringify(state.cart));
}

function renderCartBadge() {
  const total = state.cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById("cartBadge").textContent = total;
}

function openCart() {
  renderCartDrawer();
  document.getElementById("cartDrawer").classList.add("open");
}
function closeCart() {
  document.getElementById("cartDrawer").classList.remove("open");
}

document.getElementById("cartBtn").addEventListener("click", openCart);
document.getElementById("closeCart").addEventListener("click", closeCart);
document.getElementById("drawerOverlay").addEventListener("click", closeCart);
document.getElementById("checkoutBtn").addEventListener("click", openCheckout);

function renderCartDrawer() {
  const body = document.getElementById("cartItems");
  const foot = document.getElementById("cartFoot");

  if (!state.cart.length) {
    body.innerHTML = `<div class="cart-empty"><span class="cart-empty__icon">🛒</span><p>Кошик порожній</p><p style="margin-top:8px;font-size:.85rem">Додайте товари з каталогу</p></div>`;
    foot.style.display = "none";
    return;
  }

  const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  body.innerHTML = state.cart
    .map(
      (item) => `
    <div class="cart-item">
      <div class="cart-item__emoji">
        ${
          item.emoji && item.emoji.includes(".")
            ? `<img src="${getImgPath(item.emoji)}" width="40">`
            : item.emoji || "🐾"
        }
      </div>
      <div class="cart-item__info">
        <div class="cart-item__name">${escapeHtml(item.name)}</div>
        <div class="cart-item__price">${formatPrice(item.price * item.qty)}</div>
      </div>
      <div class="cart-item__qty">
        <button onclick="updateCartQty(${item.productId}, -1)">−</button>
        <span>${item.qty}</span>
        <button onclick="updateCartQty(${item.productId}, 1)">+</button>
        <button onclick="removeFromCart(${item.productId})" style="color:#e74c3c;margin-left:4px">✕</button>
      </div>
    </div>
  `,
    )
    .join("");

  document.getElementById("cartTotal").textContent = formatPrice(total);
  foot.style.display = "block";
}

function updateCartQty(productId, delta) {
  const item = state.cart.find((i) => i.productId === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(productId);
  else {
    saveCart();
    renderCartBadge();
    renderCartDrawer();
  }
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((i) => i.productId !== productId);
  saveCart();
  renderCartBadge();
  renderCartDrawer();
}

/* ─── Checkout ───────────────────────────────────────────── */
function openCheckout() {
  closeCart();
  renderCheckoutForm();
  document.getElementById("checkoutModal").classList.add("open");
}

function renderCheckoutForm() {
  const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById("checkoutContent").innerHTML = `
    <div class="checkout-form">
      <div class="checkout-summary">
        <h4>Ваше замовлення</h4>
        ${state.cart
          .map(
            (i) => `<div class="summary-item"><span>${
              i.emoji && i.emoji.includes(".")
                ? `<img src="${getImgPath(i.emoji)}" width="30" style="vertical-align:middle; margin-right:8px; border-radius:4px;">`
                : `<span style="margin-right:8px;">${i.emoji || "🐾"}</span>`
            }
      ${escapeHtml(i.name)} ×${i.qty}</span><span>${formatPrice(i.price * i.qty)}</span></div>`,
          )
          .join("")}
        <div class="summary-total"><span>Разом:</span><span>${formatPrice(total)}</span></div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Ім'я та прізвище *</label>
          <input id="ch_name" class="form-input" placeholder="Іван Петренко" />
        </div>
        <div class="form-group">
          <label>Email *</label>
          <input id="ch_email" class="form-input" type="email" placeholder="ivan@email.com" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Телефон</label>
          <input id="ch_phone" class="form-input" placeholder="+38 (050) 000-00-00" />
        </div>
        <div class="form-group">
          <label>Адреса доставки *</label>
          <input id="ch_address" class="form-input" placeholder="м. Київ, вул. Хрещатик, 1" />
        </div>
      </div>
      <div class="form-group">
        <label>Спосіб оплати</label>
        <div class="payment-options">
          <div class="pay-opt selected" data-pay="card" onclick="selectPayment('card', this)">💳 Картою</div>
          <div class="pay-opt" data-pay="cash" onclick="selectPayment('cash', this)">💵 Готівкою</div>
          <div class="pay-opt" data-pay="online" onclick="selectPayment('online', this)">📱 Online</div>
        </div>
      </div>
      <div class="form-group">
        <label>Коментар до замовлення</label>
        <input id="ch_notes" class="form-input" placeholder="Необов'язково..." />
      </div>
      <button class="btn btn--primary btn--full" onclick="placeOrder()">✓ Підтвердити замовлення</button>
    </div>
  `;
}

function selectPayment(method, el) {
  state.paymentMethod = method;
  document
    .querySelectorAll(".pay-opt")
    .forEach((o) => o.classList.remove("selected"));
  el.classList.add("selected");
}

async function placeOrder() {

  try {
    const name = document.getElementById("ch_name").value.trim();
    const email = document.getElementById("ch_email").value.trim();
    const phone = document.getElementById("ch_phone").value.trim();
    const address = document.getElementById("ch_address").value.trim();
    const notesEl = document.getElementById("ch_notes"); // Шукаємо поле коментаря
    const notes = notesEl ? notesEl.value.trim() : "";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Валідація
    if (name.length < 3) return toast("Введіть повне ім'я", "error");
    if (!emailRegex.test(email))
      return toast("Коректний email обов'язковий", "error");
    if (address.length < 10)
      return toast("Введіть повну адресу доставки", "error");
    if (state.cart.length === 0) return toast("Кошик порожній", "error");

    console.log("📦 Дані зібрано, відправляю на сервер...");

    const result = await api("/orders", {
      method: "POST",
      body: JSON.stringify({
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        delivery_address: address,
        payment_method: state.paymentMethod,
        notes: notes,
        items: state.cart.map((i) => ({
          product_id: i.productId,
          quantity: i.qty,
          price: i.price, // Додаємо ціну, бо сервер може її вимагати для запису в order_items
        })),
      }),
    });

    // Очищення
    state.cart = [];
    saveCart();
    renderCartBadge();

    // Відображення успіху
    document.getElementById("checkoutContent").innerHTML = `
      <div class="order-success">
        <span class="order-success__icon">🎉</span>
        <h3>Замовлення прийнято!</h3>
        <p>Дякуємо, <strong>${escapeHtml(name)}</strong>!</p>
        <p>Номер замовлення: <strong>#${result.order_id}</strong></p>
        <p style="margin-top:16px;font-size:.9rem;color:var(--text-muted)">Чекайте на дзвінок менеджера!</p>
        <button class="btn btn--primary" style="margin-top:24px" onclick="closeModal('checkoutModal');showPage('home')">На головну 🏠</button>
      </div>
    `;
  } catch (err) {
    console.error("❌ ПОМИЛКА ПРИ ОФОРМЛЕННІ:", err);
    toast(err.message || "Сталася помилка при відправці", "error");
  }
}

/* ─── Modal helpers ──────────────────────────────────────── */
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}
document
  .getElementById("modalOverlay")
  .addEventListener("click", () => closeModal("productModal"));
document
  .getElementById("checkoutOverlay")
  .addEventListener("click", () => closeModal("checkoutModal"));
document
  .getElementById("closeCheckout")
  .addEventListener("click", () => closeModal("checkoutModal"));

/* ─── Shop filters ───────────────────────────────────────── */
document.getElementById("applyFilters").addEventListener("click", () => {
  const cat = document.querySelector('input[name="cat"]:checked')?.value || "";
  const pet = document.querySelector('input[name="pet"]:checked')?.value || "";
  const sort = document.getElementById("sortSelect").value;
  state.filters.category = cat;
  state.filters.pet = pet;
  state.sort = sort;
  state.page = 1;
  loadShopProducts();
});

document.getElementById("resetFilters").addEventListener("click", () => {
  state.filters = { category: "", pet: "", search: "" };
  state.sort = "id|ASC";
  state.page = 1;
  document.querySelectorAll('input[name="cat"]')[0].checked = true;
  document.querySelectorAll('input[name="pet"]')[0].checked = true;
  document.getElementById("sortSelect").value = "id|ASC";
  loadShopProducts();
});

document.getElementById("sortSelect").addEventListener("change", (e) => {
  state.sort = e.target.value;
  state.page = 1;
  loadShopProducts();
});

/* ─── View toggle ────────────────────────────────────────── */
document.querySelectorAll(".view-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".view-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const grid = document.getElementById("shopProducts");
    grid.classList.toggle("list-view", btn.dataset.view === "list");
  });
});

/* ─── Keyboard shortcuts ─────────────────────────────────── */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal("productModal");
    closeModal("checkoutModal");
    closeCart();
  }
});

/* ─── Init ───────────────────────────────────────────────── */
async function init() {
  renderCartBadge();
  await loadCategories();
  await loadFeaturedProducts();
  showPage("home");
}

init();
