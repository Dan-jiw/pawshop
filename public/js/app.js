/* ═══════════════════════════════════════════════════════════
   PawShop — Frontend JS v2
   Фікси:
   • getImgPath не ламає Cloudinary URLs
   • addToCart передає image_url замість emoji для зображень
   • Кошик правильно показує зображення
══════════════════════════════════════════════════════════ */

const API = "/api";

/* ─── State ─────────────────────────────────────────────── */
const state = {
  cart: JSON.parse(localStorage.getItem("pawshop_cart") || "[]"),
  products: [],
  categories: [],
  filters: {
    category: "",
    pet: "",
    search: "",
    minPrice: "",
    maxPrice: "",
    minRating: "",
  },
  sort: "id|ASC",
  page: 1,
  totalProducts: 0,
  priceRange: { minPrice: 0, maxPrice: 10000 },
  currentProduct: null,
  qty: 1,
  reviewRating: 0,
  paymentMethod: "card",
};

/* ─── Image helper ───────────────────────────────────────── */
// ВИПРАВЛЕННЯ: не ламаємо Cloudinary URLs
const getImgPath = (path) => {
  if (!path) return null;
  // Повний URL (Cloudinary або інший) — повертаємо як є
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  // Локальний шлях — додаємо / якщо нема
  return path.startsWith("/") ? path : `/${path}`;
};

// Перевіряє чи це URL зображення (а не emoji)
if (!val) return false;
const valueStr = String(val).trim().toLowerCase();

// Якщо це явне посилання
if (
  valueStr.startsWith("http") ||
  valueStr.includes("cloudinary.com") ||
  valueStr.startsWith("/uploads")
) {
  return true;
}

// Перевірка на розширення графічних файлів (замість простої крапки)
const extensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
return extensions.some((ext) => valueStr.endsWith(ext));

/* ─── API helper ─────────────────────────────────────────── */
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
  state.filters.search = "";
  document.getElementById("searchInput").value = "";
});

let searchTimer;
document.getElementById("searchInput").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.filters.search = e.target.value.trim();
    state.page = 1;
    document
      .querySelectorAll(".page")
      .forEach((p) => p.classList.remove("active"));
    document.getElementById("page-shop").classList.add("active");
    document.querySelectorAll(".nav__link").forEach((l) => {
      l.classList.toggle("active", l.dataset.page === "shop");
    });
    loadShopProducts();
    renderActiveTags();
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
    </div>`,
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
      </label>`,
      )
      .join("");
}

function filterByCategory(slug) {
  state.filters.category = slug;
  state.page = 1;
  showPage("shop");
  renderFilterCategories();
  renderActiveTags();
}

/* ─── Active filter tags ─────────────────────────────────── */
function renderActiveTags() {
  const container = document.getElementById("activeTags");
  if (!container) return;
  const tags = [];

  if (state.filters.search) {
    tags.push({
      label: `🔍 "${state.filters.search}"`,
      clear: () => {
        state.filters.search = "";
        document.getElementById("searchInput").value = "";
      },
    });
  }
  if (state.filters.category) {
    const cat = state.categories.find((c) => c.slug === state.filters.category);
    tags.push({
      label: `${cat?.icon || ""} ${cat?.name || state.filters.category}`,
      clear: () => {
        state.filters.category = "";
        renderFilterCategories();
      },
    });
  }
  if (state.filters.pet) {
    const PET_LABELS = {
      cat: "🐱 Коти",
      dog: "🐶 Собаки",
      bird: "🦜 Птахи",
      fish: "🐠 Рибки",
      rabbit: "🐇 Гризуни",
    };
    tags.push({
      label: PET_LABELS[state.filters.pet] || state.filters.pet,
      clear: () => {
        state.filters.pet = "";
        document.querySelector('input[name="pet"][value=""]').checked = true;
      },
    });
  }
  if (state.filters.minPrice || state.filters.maxPrice) {
    tags.push({
      label: `💰 ${state.filters.minPrice || 0} – ${state.filters.maxPrice || "∞"} ₴`,
      clear: () => {
        state.filters.minPrice = "";
        state.filters.maxPrice = "";
        updatePriceInputs();
      },
    });
  }
  if (state.filters.minRating) {
    tags.push({
      label: `⭐ від ${state.filters.minRating}`,
      clear: () => {
        state.filters.minRating = "";
        document.querySelector('input[name="rating"][value=""]').checked = true;
      },
    });
  }

  if (!tags.length) {
    container.style.display = "none";
    return;
  }

  container.style.display = "flex";
  container.innerHTML = tags
    .map(
      (t, i) => `
    <span class="filter-tag">
      ${t.label}
      <button onclick="clearTag(${i})" title="Прибрати">✕</button>
    </span>`,
    )
    .join("");
  container._clearFns = tags.map((t) => t.clear);
}

function clearTag(i) {
  const container = document.getElementById("activeTags");
  if (container._clearFns?.[i]) {
    container._clearFns[i]();
    state.page = 1;
    loadShopProducts();
    renderActiveTags();
  }
}

function updatePriceInputs() {
  const minEl = document.getElementById("priceMin");
  const maxEl = document.getElementById("priceMax");
  if (minEl) minEl.value = state.filters.minPrice || "";
  if (maxEl) maxEl.value = state.filters.maxPrice || "";
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
    ...(state.filters.minPrice && { minPrice: state.filters.minPrice }),
    ...(state.filters.maxPrice && { maxPrice: state.filters.maxPrice }),
    ...(state.filters.minRating && { minRating: state.filters.minRating }),
  });

  try {
    const data = await api(`/products?${params}`);
    state.products = data.data;
    state.totalProducts = data.total;
    if (data.priceRange) {
      state.priceRange = data.priceRange;
      initPriceRange(data.priceRange);
    }
    document.getElementById("shopCount").textContent =
      `Знайдено ${data.total} товарів`;

    if (!data.data.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)">
          <div style="font-size:3rem;margin-bottom:16px">🔍</div>
          <p>Товарів за вашим запитом не знайдено</p>
          <button class="btn btn--outline" style="margin-top:16px" onclick="resetAllFilters()">Скинути фільтри</button>
        </div>`;
    } else {
      renderProductCards(data.data, grid);
    }
    renderPagination(data.total, 9);
  } catch (_) {}
}

function initPriceRange(range) {
  const minEl = document.getElementById("priceMin");
  const maxEl = document.getElementById("priceMax");
  if (!minEl || !maxEl) return;
  if (!minEl.placeholder) {
    minEl.placeholder = `від ${Math.floor(range.minPrice)} ₴`;
    maxEl.placeholder = `до ${Math.ceil(range.maxPrice)} ₴`;
  }
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
            ? `<img src="${getImgPath(p.image_url)}" alt="${escapeHtml(p.name)}" class="product-card__img" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ""
        }
        <span class="product-card__emoji" style="${p.image_url ? "display:none" : ""}">${p.emoji || "🐾"}</span>
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
          <button class="add-btn" onclick="event.stopPropagation();addToCart(${p.id},'${escHtml(p.name)}',${p.price},'${escHtml(p.image_url || p.emoji || "🐾")}')" title="Додати до кошика">+</button>
        </div>
      </div>
    </div>`,
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
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}
function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function petLabel(t) {
  return (
    {
      cat: "🐱 Коти",
      dog: "🐶 Собаки",
      bird: "🦜 Птахи",
      fish: "🐠 Рибки",
      rabbit: "🐇 Гризуни",
      all: "🐾 Всі",
    }[t] || t
  );
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
    (_, i) =>
      `<button class="page-btn${state.page === i + 1 ? " active" : ""}" onclick="goPage(${i + 1})">${i + 1}</button>`,
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
            ? `<img src="${getImgPath(p.image_url)}" alt="${escapeHtml(p.name)}" class="product-modal__img">`
            : `<span style="font-size:4rem">${p.emoji || "🐾"}</span>`
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
        </div>`,
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
    </div>`;
}

function changeQty(delta) {
  const max = state.currentProduct?.stock || 99;
  state.qty = Math.max(1, Math.min(state.qty + delta, max));
  document.getElementById("qtyDisplay").textContent = state.qty;
}
function addToCartQty() {
  const p = state.currentProduct;
  if (!p) return;
  // ВИПРАВЛЕННЯ: передаємо image_url якщо є, інакше emoji
  addToCart(p.id, p.name, p.price, p.image_url || p.emoji || "🐾", state.qty);
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
    openProduct(productId);
  } catch (_) {}
}

/* ─── Cart ──────────────────────────────────────────────── */
function addToCart(productId, name, price, imageOrEmoji, qty = 1) {
  const existing = state.cart.find((i) => i.productId === productId);
  if (existing) existing.qty += qty;
  else
    state.cart.push({
      productId,
      name,
      price: +price,
      image: imageOrEmoji,
      qty,
    });
  saveCart();
  renderCartBadge();
  toast(`✓ ${name} додано до кошика`, "success");
}
function saveCart() {
  localStorage.setItem("pawshop_cart", JSON.stringify(state.cart));
}
function renderCartBadge() {
  document.getElementById("cartBadge").textContent = state.cart.reduce(
    (s, i) => s + i.qty,
    0,
  );
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

function renderCartThumb(image) {
  if (!image) return `<span style="font-size:1.8rem">🐾</span>`;
  if (isImageUrl(image)) {
    return `<img src="${getImgPath(image)}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:8px" onerror="this.style.display='none'">`;
  }
  return `<span style="font-size:1.8rem">${image}</span>`;
}

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
        ${renderCartThumb(item.image || item.emoji)}
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
    </div>`,
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
            (i) => `
          <div class="summary-item">
            <span>
              ${
                isImageUrl(i.image || i.emoji)
                  ? `<img src="${getImgPath(i.image || i.emoji)}" width="30" style="vertical-align:middle;margin-right:8px;border-radius:4px;object-fit:cover">`
                  : `<span style="margin-right:8px">${i.image || i.emoji || "🐾"}</span>`
              }
              ${escapeHtml(i.name)} ×${i.qty}
            </span>
            <span>${formatPrice(i.price * i.qty)}</span>
          </div>`,
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
          <div class="pay-opt selected" onclick="selectPayment('card',this)">💳 Картою</div>
          <div class="pay-opt" onclick="selectPayment('cash',this)">💵 Готівкою</div>
          <div class="pay-opt" onclick="selectPayment('online',this)">📱 Online</div>
        </div>
      </div>
      <div class="form-group">
        <label>Коментар до замовлення</label>
        <input id="ch_notes" class="form-input" placeholder="Необов'язково..." />
      </div>
      <button class="btn btn--primary btn--full" onclick="placeOrder()">✓ Підтвердити замовлення</button>
    </div>`;
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
    const notes = document.getElementById("ch_notes")?.value.trim() || "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (name.length < 3) return toast("Введіть повне ім'я", "error");
    if (!emailRegex.test(email))
      return toast("Коректний email обов'язковий", "error");
    if (address.length < 10)
      return toast("Введіть повну адресу доставки", "error");
    if (!state.cart.length) return toast("Кошик порожній", "error");

    const result = await api("/orders", {
      method: "POST",
      body: JSON.stringify({
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        delivery_address: address,
        payment_method: state.paymentMethod,
        notes,
        items: state.cart.map((i) => ({
          product_id: i.productId,
          quantity: i.qty,
          price: i.price,
        })),
      }),
    });

    state.cart = [];
    saveCart();
    renderCartBadge();
    document.getElementById("checkoutContent").innerHTML = `
      <div class="order-success">
        <span class="order-success__icon">🎉</span>
        <h3>Замовлення прийнято!</h3>
        <p>Дякуємо, <strong>${escapeHtml(name)}</strong>!</p>
        <p>Номер замовлення: <strong>#${result.order_id}</strong></p>
        <p style="margin-top:16px;font-size:.9rem;color:var(--text-muted)">Чекайте на дзвінок менеджера!</p>
        <button class="btn btn--primary" style="margin-top:24px" onclick="closeModal('checkoutModal');showPage('home')">На головну 🏠</button>
      </div>`;
  } catch (err) {
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
  state.filters.category =
    document.querySelector('input[name="cat"]:checked')?.value || "";
  state.filters.pet =
    document.querySelector('input[name="pet"]:checked')?.value || "";
  state.filters.minRating =
    document.querySelector('input[name="rating"]:checked')?.value || "";
  state.filters.minPrice = document.getElementById("priceMin")?.value || "";
  state.filters.maxPrice = document.getElementById("priceMax")?.value || "";
  state.sort = document.getElementById("sortSelect").value;
  state.page = 1;
  loadShopProducts();
  renderActiveTags();
});

function resetAllFilters() {
  state.filters = {
    category: "",
    pet: "",
    search: "",
    minPrice: "",
    maxPrice: "",
    minRating: "",
  };
  state.sort = "id|ASC";
  state.page = 1;
  document.querySelectorAll('input[name="cat"]')[0].checked = true;
  document.querySelectorAll('input[name="pet"]')[0].checked = true;
  const ratingFirst = document.querySelector('input[name="rating"]');
  if (ratingFirst) ratingFirst.checked = true;
  document.getElementById("sortSelect").value = "id|ASC";
  const minEl = document.getElementById("priceMin");
  const maxEl = document.getElementById("priceMax");
  if (minEl) minEl.value = "";
  if (maxEl) maxEl.value = "";
  document.getElementById("searchInput").value = "";
  loadShopProducts();
  renderActiveTags();
}

document
  .getElementById("resetFilters")
  .addEventListener("click", resetAllFilters);
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
    document
      .getElementById("shopProducts")
      .classList.toggle("list-view", btn.dataset.view === "list");
  });
});

/* ─── Keyboard ───────────────────────────────────────────── */
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
