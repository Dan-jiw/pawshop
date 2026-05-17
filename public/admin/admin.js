/* ═══════════════════════════════════════════════════════════
   PawShop Admin Panel JS — v2
   Виправлення:
   • Редагування неактивних товарів (тепер через /api/admin/products/:id)
   • Дебаунс пошуку для замовлень
   • Toast при зміні статусу замовлення
   • Деталі замовлення у модалці
   • Очищення форми при відкритті для нового товару
══════════════════════════════════════════════════════════ */

const API = "/api";
let admToken = localStorage.getItem("pawshop_admin_token") || null;
let admUser = JSON.parse(localStorage.getItem("pawshop_admin_user") || "null");

const pState = { page: 1, limit: 15, selected: new Set(), total: 0 };
let stockProductId = null;
let searchTimer;

/* ─── API ────────────────────────────────────────────────── */
async function admApi(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (admToken) headers["Authorization"] = `Bearer ${admToken}`;
  if (opts.body instanceof FormData) delete headers["Content-Type"];

  const res = await fetch(API + path, { headers, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* ─── Toast ─────────────────────────────────────────────── */
function admToast(msg, type = "") {
  const el = document.getElementById("admToast");
  el.textContent = msg;
  el.className = `adm-toast show${type ? " " + type : ""}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3000);
}

/* ─── Auth ───────────────────────────────────────────────── */
async function adminLogin() {
  const email = document.getElementById("agEmail").value.trim();
  const password = document.getElementById("agPass").value;
  const errEl = document.getElementById("agError");
  const btn = document.getElementById("agBtn");

  if (!email || !password) {
    showErr(errEl, "Заповніть всі поля");
    return;
  }
  btn.textContent = "Вхід...";
  btn.disabled = true;

  try {
    const data = await admApi("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.user.role !== "admin") throw new Error("Ви не є адміністратором");
    admToken = data.token;
    admUser = data.user;
    localStorage.setItem("pawshop_admin_token", admToken);
    localStorage.setItem("pawshop_admin_user", JSON.stringify(admUser));
    bootAdmin();
  } catch (err) {
    showErr(errEl, err.message);
  } finally {
    btn.textContent = "Увійти →";
    btn.disabled = false;
  }
}

function adminLogout() {
  admToken = null;
  admUser = null;
  localStorage.removeItem("pawshop_admin_token");
  localStorage.removeItem("pawshop_admin_user");
  document.getElementById("adminApp").style.display = "none";
  document.getElementById("authGate").style.display = "flex";
}

function showErr(el, msg) {
  el.textContent = msg;
  el.style.display = "block";
}

/* ─── Boot ───────────────────────────────────────────────── */
function bootAdmin() {
  document.getElementById("authGate").style.display = "none";
  document.getElementById("adminApp").style.display = "grid";
  document.getElementById("admName").textContent = admUser?.name || "Admin";
  document.getElementById("admEmail").textContent = admUser?.email || "";
  document.getElementById("admAvatar").textContent = (admUser?.name || "A")
    .charAt(0)
    .toUpperCase();

  const editId = new URLSearchParams(location.search).get("edit");
  loadCategories().then(() => {
    loadProducts();
    if (editId) openProductForm(+editId);
  });
  loadOrders();
  loadReviews();
}

/* ─── Section nav ────────────────────────────────────────── */
function showSec(name, btn) {
  document
    .querySelectorAll(".adm-section")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById("sec-" + name).classList.add("active");
  document
    .querySelectorAll(".adm-nav__item")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

/* ═══════════════════════════════════════════════════════════
   PRODUCTS
══════════════════════════════════════════════════════════ */
async function loadProducts() {
  const search = document.getElementById("pSearch")?.value.trim() || "";
  const cat = document.getElementById("pCat")?.value || "";
  const status = document.getElementById("pStatus")?.value ?? "";
  const sort = document.getElementById("pSort")?.value || "p.id|DESC";
  const [sortField, sortDir] = sort.split("|");

  const params = new URLSearchParams({
    page: pState.page,
    limit: pState.limit,
    sort: sortField,
    order: sortDir,
    ...(search && { search }),
    ...(cat && { category: cat }),
    ...(status !== "" && { status }),
  });

  const body = document.getElementById("productsBody");
  body.innerHTML = `<tr><td colspan="9" class="table-empty"><div class="adm-spinner" style="margin:0 auto"></div></td></tr>`;

  try {
    const data = await admApi(`/admin/products?${params}`);
    pState.total = data.total;
    renderProductsTable(data.data);
    renderProductStats(data.stats);
    renderProductsPagination(data.total);
    document.getElementById("productsSubtitle").textContent =
      `Всього товарів: ${data.total}`;
    document.getElementById("navCountProducts").textContent =
      data.stats?.total || "—";
  } catch (err) {
    body.innerHTML = `<tr><td colspan="9" class="table-empty" style="color:#f85149">${err.message}</td></tr>`;
  }
}

function debouncedLoadProducts() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    pState.page = 1;
    loadProducts();
  }, 350);
}

function renderProductStats(s) {
  if (!s) return;
  document.getElementById("miniStats").innerHTML = `
    <div class="mini-stat"><div class="mini-stat__val orange">${s.total}</div><div class="mini-stat__label">Всього товарів</div></div>
    <div class="mini-stat"><div class="mini-stat__val green">${s.active}</div><div class="mini-stat__label">Активних</div></div>
    <div class="mini-stat"><div class="mini-stat__val red">${s.inactive}</div><div class="mini-stat__label">Неактивних</div></div>
    <div class="mini-stat"><div class="mini-stat__val yellow">${s.out_of_stock}</div><div class="mini-stat__label">Немає в наявності</div></div>
  `;
}

function renderProductsTable(products) {
  const body = document.getElementById("productsBody");
  if (!products.length) {
    body.innerHTML = `<tr><td colspan="9" class="table-empty">Товарів не знайдено</td></tr>`;
    return;
  }
  body.innerHTML = products
    .map(
      (p) => `
    <tr>
      <td><input type="checkbox" data-id="${p.id}" onchange="toggleSelect(${p.id},this.checked)" ${pState.selected.has(p.id) ? "checked" : ""}></td>
      <td><span style="color:var(--muted)">#${p.id}</span></td>
      <td>
        <div class="prod-cell">
          <div class="prod-cell__emoji">
            ${p.image_url ? `<img src="${p.image_url}" alt="" loading="lazy">` : p.emoji || "🐾"}
          </div>
          <div>
            <div class="prod-cell__name" title="${esc(p.name)}">${esc(p.name)}</div>
            <div class="prod-cell__id">${p.pet_type || ""} ${p.tag ? `· <span style="color:var(--primary)">${p.tag}</span>` : ""}</div>
          </div>
        </div>
      </td>
      <td>${esc(p.category_name || "—")}</td>
      <td>
        <div style="font-weight:600">${fmtPrice(p.price)}</div>
        ${p.old_price ? `<div style="font-size:.72rem;color:var(--muted);text-decoration:line-through">${fmtPrice(p.old_price)}</div>` : ""}
      </td>
      <td>
        <div class="stock-cell">
          <span style="color:${+p.stock === 0 ? "var(--red)" : +p.stock < 5 ? "var(--yellow)" : "var(--text)"}">${p.stock}</span>
          <button class="stock-edit-btn" onclick="openStockModal(${p.id},'${esc(p.name)}',${p.stock})" title="Змінити залишок">✏️</button>
        </div>
      </td>
      <td>
        <span style="color:#f59e0b;font-size:.9rem">${"★".repeat(Math.round(+p.rating))}${"☆".repeat(5 - Math.round(+p.rating))}</span>
        <span style="color:var(--muted);font-size:.75rem"> ${(+p.rating).toFixed(1)}</span>
      </td>
      <td>
        <span class="badge ${p.is_active ? "badge--green" : "badge--red"}">
          ${p.is_active ? "✅ Активний" : "❌ Неактивний"}
        </span>
      </td>
      <td>
        <div class="row-actions">
          <button class="row-btn" onclick="openProductForm(${p.id})">✏️ Редагувати</button>
          <button class="row-btn danger" onclick="deleteProduct(${p.id},'${esc(p.name)}')">🗑️</button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");
  updateBulkBar();
}

function renderProductsPagination(total) {
  const pages = Math.ceil(total / pState.limit);
  const el = document.getElementById("productsPagination");
  document.getElementById("productsCount").textContent =
    `Показано ${Math.min(pState.limit, total - (pState.page - 1) * pState.limit)} з ${total}`;
  if (pages <= 1) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = Array.from(
    { length: pages },
    (_, i) =>
      `<button class="${pState.page === i + 1 ? "active" : ""}" onclick="pState.page=${i + 1};loadProducts()">${i + 1}</button>`,
  ).join("");
}

/* ─── Select / Bulk ──────────────────────────────────────── */
function toggleSelect(id, checked) {
  checked ? pState.selected.add(id) : pState.selected.delete(id);
  updateBulkBar();
}
function toggleSelAll(el) {
  document
    .querySelectorAll('#productsBody input[type="checkbox"]')
    .forEach((cb) => {
      const id = +cb.dataset.id;
      cb.checked = el.checked;
      el.checked ? pState.selected.add(id) : pState.selected.delete(id);
    });
  updateBulkBar();
}
function clearSelection() {
  pState.selected.clear();
  document
    .querySelectorAll('#productsBody input[type="checkbox"]')
    .forEach((cb) => (cb.checked = false));
  document.getElementById("selAll").checked = false;
  updateBulkBar();
}
function updateBulkBar() {
  const bar = document.getElementById("bulkBar");
  const count = pState.selected.size;
  bar.style.display = count ? "flex" : "none";
  if (count)
    document.getElementById("bulkCount").textContent = `${count} обрано`;
}

async function bulkAction(action) {
  if (!pState.selected.size) return;
  const ids = [...pState.selected];
  const labels = {
    activate: "активувати",
    deactivate: "деактивувати",
    delete: "видалити",
  };
  if (
    action === "delete" &&
    !confirm(
      `Ви впевнені що хочете ВИДАЛИТИ ${ids.length} товарів?\nЦю дію неможливо скасувати!`,
    )
  )
    return;
  if (
    action !== "delete" &&
    !confirm(`${labels[action]} ${ids.length} товарів?`)
  )
    return;
  try {
    await admApi("/admin/products/bulk", {
      method: "POST",
      body: JSON.stringify({ ids, action }),
    });
    admToast(`✅ ${ids.length} товарів — дія виконана`, "ok");
    pState.selected.clear();
    loadProducts();
  } catch (err) {
    admToast(err.message, "err");
  }
}

/* ─── Delete product ────────────────────────────────────── */
async function deleteProduct(id, name) {
  if (
    !confirm(
      `Видалити "${name}"?\nЦя дія видалить також зображення товару. Незворотно.`,
    )
  )
    return;
  try {
    await admApi(`/admin/products/${id}`, { method: "DELETE" });
    admToast(`🗑️ "${name}" видалено`, "ok");
    loadProducts();
  } catch (err) {
    admToast(err.message, "err");
  }
}

/* ─── Product form ───────────────────────────────────────── */
async function openProductForm(id = null) {
  document.getElementById("pfError").style.display = "none";
  document.getElementById("productFormTitle").textContent = id
    ? "Редагувати товар"
    : "Додати товар";
  document.getElementById("pf_id").value = id || "";
  document.getElementById("pf_image").value = "";
  resetFileDrop();

  // Populate category select
  const catSel = document.getElementById("pf_category");
  catSel.innerHTML = admCategories
    .map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`)
    .join("");

  if (id) {
    // ВИПРАВЛЕННЯ: використовуємо адмінський ендпоінт, який повертає неактивні товари теж
    try {
      const prod = await admApi(`/admin/products/${id}`);
      document.getElementById("pf_name").value = prod.name || "";
      document.getElementById("pf_desc").value = prod.description || "";
      document.getElementById("pf_price").value = prod.price || "";
      document.getElementById("pf_old_price").value = prod.old_price || "";
      document.getElementById("pf_stock").value = prod.stock || 0;
      document.getElementById("pf_emoji").value = prod.emoji || "";
      document.getElementById("pf_tag").value = prod.tag || "";
      document.getElementById("pf_pet").value = prod.pet_type || "all";
      document.getElementById("pf_active").value =
        prod.is_active !== undefined ? +prod.is_active : 1;
      catSel.value = prod.category_id || "";

      if (prod.image_url) {
        document.getElementById("fileDropInner").innerHTML =
          `<img src="${prod.image_url}" alt=""><p style="margin-top:8px;font-size:.75rem;color:var(--muted)">Натисніть щоб змінити</p>`;
      }
    } catch (err) {
      admToast("Помилка завантаження товару: " + err.message, "err");
    }
  } else {
    // Очищаємо поля для нового товару
    [
      "pf_name",
      "pf_desc",
      "pf_price",
      "pf_old_price",
      "pf_emoji",
      "pf_tag",
    ].forEach((fid) => {
      document.getElementById(fid).value = "";
    });
    document.getElementById("pf_stock").value = 0;
    document.getElementById("pf_pet").value = "all";
    document.getElementById("pf_active").value = 1;
  }

  document.getElementById("productFormModal").classList.add("open");
}

function resetFileDrop() {
  document.getElementById("fileDropInner").innerHTML = `
    <span style="font-size:2rem">📷</span>
    <p>Натисніть або перетягніть файл</p>
    <small>JPG, PNG, WEBP · до 3MB</small>
  `;
}

function closeProductForm() {
  document.getElementById("productFormModal").classList.remove("open");
}

function previewImage(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("fileDropInner").innerHTML =
      `<img src="${e.target.result}" style="max-height:160px;border-radius:8px;object-fit:contain"><p style="margin-top:8px;font-size:.75rem;color:var(--muted)">${file.name}</p>`;
  };
  reader.readAsDataURL(file);
}

document.addEventListener("DOMContentLoaded", () => {
  const drop = document.getElementById("fileDrop");
  if (!drop) return;
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.style.borderColor = "var(--primary)";
  });
  drop.addEventListener("dragleave", () => {
    drop.style.borderColor = "var(--border)";
  });
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.style.borderColor = "var(--border)";
    const file = e.dataTransfer.files[0];
    if (file) {
      const input = document.getElementById("pf_image");
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      previewImage(input);
    }
  });
});

async function submitProductForm() {
  const id = document.getElementById("pf_id").value;
  const name = document.getElementById("pf_name").value.trim();
  const catId = document.getElementById("pf_category").value;
  const price = document.getElementById("pf_price").value;
  const errEl = document.getElementById("pfError");
  const btn = document.getElementById("pfSubmitBtn");

  if (!name) {
    showErr(errEl, "Назва обов'язкова");
    return;
  }
  if (!price || +price <= 0) {
    showErr(errEl, "Вкажіть коректну ціну");
    return;
  }
  if (!catId) {
    showErr(errEl, "Оберіть категорію");
    return;
  }

  const fd = new FormData();
  fd.append("name", name);
  fd.append("description", document.getElementById("pf_desc").value);
  fd.append("price", price);
  fd.append("old_price", document.getElementById("pf_old_price").value);
  fd.append("stock", document.getElementById("pf_stock").value);
  fd.append("category_id", catId);
  fd.append("pet_type", document.getElementById("pf_pet").value);
  fd.append("emoji", document.getElementById("pf_emoji").value);
  fd.append("tag", document.getElementById("pf_tag").value);
  fd.append("is_active", document.getElementById("pf_active").value);

  const imageFile = document.getElementById("pf_image").files[0];
  if (imageFile) fd.append("image", imageFile);

  btn.textContent = "Збереження...";
  btn.disabled = true;
  errEl.style.display = "none";

  try {
    if (id) {
      await admApi(`/admin/products/${id}`, { method: "PUT", body: fd });
      admToast("✅ Товар оновлено", "ok");
    } else {
      await admApi("/admin/products", { method: "POST", body: fd });
      admToast("✅ Товар додано", "ok");
    }
    closeProductForm();
    loadProducts();
  } catch (err) {
    showErr(errEl, err.message);
  } finally {
    btn.textContent = "Зберегти товар";
    btn.disabled = false;
  }
}

/* ─── Stock modal ────────────────────────────────────────── */
function openStockModal(id, name, currentStock) {
  stockProductId = id;
  document.getElementById("stockProductName").textContent = name;
  document.getElementById("stockValue").value = currentStock;
  document.getElementById("stockModal").classList.add("open");
  setTimeout(() => document.getElementById("stockValue").focus(), 100);
}
function closeStockModal() {
  document.getElementById("stockModal").classList.remove("open");
  stockProductId = null;
}
async function submitStock() {
  const val = +document.getElementById("stockValue").value;
  if (isNaN(val) || val < 0) {
    admToast("Невірне значення", "err");
    return;
  }
  try {
    await admApi(`/admin/products/${stockProductId}/stock`, {
      method: "PATCH",
      body: JSON.stringify({ stock: val }),
    });
    admToast(`📦 Залишок оновлено: ${val} шт.`, "ok");
    closeStockModal();
    loadProducts();
  } catch (err) {
    admToast(err.message, "err");
  }
}

/* ═══════════════════════════════════════════════════════════
   CATEGORIES
══════════════════════════════════════════════════════════ */
let admCategories = [];

async function loadCategories() {
  try {
    admCategories = await admApi("/admin/categories");
    renderCategories();
    document.getElementById("navCountCategories").textContent =
      admCategories.length;

    const pCat = document.getElementById("pCat");
    pCat.innerHTML =
      `<option value="">Всі категорії</option>` +
      admCategories
        .map((c) => `<option value="${c.slug}">${c.icon} ${c.name}</option>`)
        .join("");
  } catch (err) {
    admToast(err.message, "err");
  }
}

function renderCategories() {
  const grid = document.getElementById("categoriesGrid");
  if (!admCategories.length) {
    grid.innerHTML = '<p style="color:var(--muted)">Категорій немає</p>';
    return;
  }
  grid.innerHTML = admCategories
    .map(
      (c) => `
    <div class="cat-card">
      <div class="cat-card__icon">${c.icon}</div>
      <div class="cat-card__info">
        <div class="cat-card__name">${esc(c.name)}</div>
        <div class="cat-card__meta">
          <span>${c.product_count}</span> товарів · #${c.slug}
          ${c.sort_order !== undefined ? ` · порядок: ${c.sort_order}` : ""}
        </div>
      </div>
      <div class="cat-card__actions">
        <button class="row-btn" onclick="openCategoryForm(${c.id})">✏️</button>
        <button class="row-btn danger" onclick="deleteCategory(${c.id},'${esc(c.name)}',${c.product_count})">🗑️</button>
      </div>
    </div>
  `,
    )
    .join("");
}

function openCategoryForm(id = null) {
  document.getElementById("cfError").style.display = "none";
  document.getElementById("categoryFormTitle").textContent = id
    ? "Редагувати категорію"
    : "Додати категорію";
  document.getElementById("cf_id").value = id || "";

  if (id) {
    const cat = admCategories.find((c) => c.id === id);
    if (cat) {
      document.getElementById("cf_name").value = cat.name || "";
      document.getElementById("cf_slug").value = cat.slug || "";
      document.getElementById("cf_icon").value = cat.icon || "";
      document.getElementById("cf_order").value = cat.sort_order || 0;
    }
  } else {
    ["cf_name", "cf_slug", "cf_icon"].forEach(
      (i) => (document.getElementById(i).value = ""),
    );
    document.getElementById("cf_order").value = admCategories.length;
  }
  document.getElementById("categoryFormModal").classList.add("open");
}

function closeCategoryForm() {
  document.getElementById("categoryFormModal").classList.remove("open");
}

function autoSlug() {
  const name = document.getElementById("cf_name").value;
  const slug = name
    .toLowerCase()
    .replace(/[іi]/g, "i")
    .replace(/[аa]/g, "a")
    .replace(/[еe]/g, "e")
    .replace(/[оo]/g, "o")
    .replace(/[уy]/g, "u")
    .replace(/[ї]/g, "i")
    .replace(/[є]/g, "ye")
    .replace(/[ь]/g, "")
    .replace(/[щ]/g, "shch")
    .replace(/[ш]/g, "sh")
    .replace(/[ч]/g, "ch")
    .replace(/[ж]/g, "zh")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  if (!document.getElementById("cf_id").value)
    document.getElementById("cf_slug").value = slug;
}

async function submitCategoryForm() {
  const id = document.getElementById("cf_id").value;
  const name = document.getElementById("cf_name").value.trim();
  const slug = document.getElementById("cf_slug").value.trim();
  const icon = document.getElementById("cf_icon").value.trim();
  const order = document.getElementById("cf_order").value;
  const errEl = document.getElementById("cfError");

  if (!name) {
    showErr(errEl, "Назва обов'язкова");
    return;
  }
  if (!slug) {
    showErr(errEl, "Slug обов'язковий");
    return;
  }

  try {
    const body = JSON.stringify({
      name,
      slug,
      icon: icon || "🐾",
      sort_order: +order || 0,
    });
    if (id) {
      await admApi(`/admin/categories/${id}`, { method: "PUT", body });
      admToast("✅ Категорію оновлено", "ok");
    } else {
      await admApi("/admin/categories", { method: "POST", body });
      admToast("✅ Категорію додано", "ok");
    }
    closeCategoryForm();
    await loadCategories();
  } catch (err) {
    showErr(errEl, err.message);
  }
}

async function deleteCategory(id, name, count) {
  if (count > 0) {
    admToast(`❌ Не можна видалити: є ${count} товарів`, "err");
    return;
  }
  if (!confirm(`Видалити категорію "${name}"?`)) return;
  try {
    await admApi(`/admin/categories/${id}`, { method: "DELETE" });
    admToast(`🗑️ Категорію "${name}" видалено`, "ok");
    loadCategories();
  } catch (err) {
    admToast(err.message, "err");
  }
}

/* ═══════════════════════════════════════════════════════════
   ORDERS
══════════════════════════════════════════════════════════ */
const ORDER_STATUS = {
  pending: { label: "⏳ Нове", cls: "badge--yellow" },
  processing: { label: "⚙️ В обробці", cls: "badge--blue" },
  shipped: { label: "🚚 Відправлено", cls: "badge--blue" },
  delivered: { label: "✅ Доставлено", cls: "badge--green" },
  cancelled: { label: "❌ Скасовано", cls: "badge--red" },
};

async function loadOrders() {
  const search = document.getElementById("oSearch")?.value.trim() || "";
  const status = document.getElementById("oStatus")?.value || "";
  const params = new URLSearchParams({
    ...(search && { search }),
    ...(status && { status }),
  });
  const body = document.getElementById("ordersBody");
  body.innerHTML = `<tr><td colspan="8" class="table-empty"><div class="adm-spinner" style="margin:0 auto"></div></td></tr>`;
  try {
    const data = await admApi(`/admin/orders?${params}`);
    const pending = data.data.filter((o) => o.status === "pending").length;
    document.getElementById("navCountOrders").textContent = pending || "—";
    renderOrdersTable(data.data);
  } catch (err) {
    body.innerHTML = `<tr><td colspan="8" class="table-empty" style="color:var(--red)">${err.message}</td></tr>`;
  }
}

// ВИПРАВЛЕННЯ: дебаунс для пошуку замовлень
function debouncedLoadOrders() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadOrders, 350);
}

function renderOrdersTable(orders) {
  const body = document.getElementById("ordersBody");
  if (!orders.length) {
    body.innerHTML = `<tr><td colspan="8" class="table-empty">Замовлень не знайдено</td></tr>`;
    return;
  }
  const PAY = { card: "💳 Картою", cash: "💵 Готівка", online: "📱 Online" };
  body.innerHTML = orders
    .map((o) => {
      return `
      <tr>
        <td style="font-weight:600;color:var(--primary)">#${o.id}</td>
        <td>${esc(o.customer_name)}</td>
        <td style="color:var(--muted)">${esc(o.customer_email)}</td>
        <td style="font-weight:600">${fmtPrice(o.total_amount)}</td>
        <td style="color:var(--muted)">${PAY[o.payment_method] || o.payment_method}</td>
        <td>
          <select class="status-select" onchange="updateOrderStatus(${o.id},this.value)">
            ${Object.entries(ORDER_STATUS)
              .map(
                ([k, v]) =>
                  `<option value="${k}" ${k === o.status ? "selected" : ""}>${v.label}</option>`,
              )
              .join("")}
          </select>
        </td>
        <td style="color:var(--muted)">${new Date(o.created_at).toLocaleDateString("uk-UA")}</td>
        <td>
          <button class="row-btn" onclick="openOrderDetails(${o.id})">↗ Деталі</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

// ВИПРАВЛЕННЯ: toast при зміні статусу + reload
async function updateOrderStatus(id, status) {
  try {
    await admApi(`/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    admToast(
      `✅ Статус замовлення #${id} → ${ORDER_STATUS[status]?.label || status}`,
      "ok",
    );
    // Оновлюємо лічильник pending
    loadOrders();
  } catch (err) {
    admToast(err.message, "err");
  }
}

// Деталі замовлення у модалці
async function openOrderDetails(id) {
  try {
    const order = await admApi(`/admin/orders/${id}`);
    const modal = document.getElementById("orderDetailsModal");
    const body = document.getElementById("orderDetailsBody");
    document.getElementById("orderDetailsTitle").textContent =
      `Замовлення #${order.id}`;

    const PAY = { card: "💳 Картою", cash: "💵 Готівка", online: "📱 Online" };
    const st = ORDER_STATUS[order.status] || { label: order.status };

    body.innerHTML = `
      <div class="order-details-grid">
        <div>
          <div class="od-label">Клієнт</div>
          <div class="od-val">${esc(order.customer_name)}</div>
        </div>
        <div>
          <div class="od-label">Email</div>
          <div class="od-val">${esc(order.customer_email)}</div>
        </div>
        <div>
          <div class="od-label">Телефон</div>
          <div class="od-val">${esc(order.customer_phone || "—")}</div>
        </div>
        <div>
          <div class="od-label">Оплата</div>
          <div class="od-val">${PAY[order.payment_method] || order.payment_method}</div>
        </div>
        <div>
          <div class="od-label">Статус</div>
          <div class="od-val">${st.label}</div>
        </div>
        <div>
          <div class="od-label">Сума</div>
          <div class="od-val" style="color:var(--primary);font-weight:700">${fmtPrice(order.total_amount)}</div>
        </div>
        ${
          order.delivery_address
            ? `
        <div style="grid-column:span 2">
          <div class="od-label">Адреса доставки</div>
          <div class="od-val">${esc(order.delivery_address)}</div>
        </div>`
            : ""
        }
        ${
          order.comment
            ? `
        <div style="grid-column:span 2">
          <div class="od-label">Коментар</div>
          <div class="od-val" style="color:var(--muted)">${esc(order.comment)}</div>
        </div>`
            : ""
        }
      </div>

      ${
        order.items?.length
          ? `
        <div style="margin-top:20px">
          <div class="od-label" style="margin-bottom:10px">Товари</div>
          ${order.items
            .map(
              (item) => `
            <div class="order-item-row">
              <span>${item.emoji || "🐾"}</span>
              <span style="flex:1">${esc(item.name || "Товар #" + item.product_id)}</span>
              <span style="color:var(--muted)">${item.quantity} шт.</span>
              <span style="font-weight:600">${fmtPrice(item.price * item.quantity)}</span>
            </div>
          `,
            )
            .join("")}
        </div>
      `
          : ""
      }
    `;
    modal.classList.add("open");
  } catch (err) {
    admToast("Помилка завантаження деталей: " + err.message, "err");
  }
}

function closeOrderDetails() {
  document.getElementById("orderDetailsModal").classList.remove("open");
}

/* ═══════════════════════════════════════════════════════════
   REVIEWS
══════════════════════════════════════════════════════════ */
async function loadReviews() {
  const body = document.getElementById("reviewsBody");
  try {
    const data = await admApi("/admin/reviews");
    if (!data.length) {
      body.innerHTML = `<tr><td colspan="7" class="table-empty">Відгуків немає</td></tr>`;
      return;
    }
    body.innerHTML = data
      .map(
        (r) => `
      <tr>
        <td style="color:var(--muted)">#${r.id}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <span>${r.emoji || "🐾"}</span>
            <a href="/product/${r.pid}" target="_blank" style="font-size:.8rem;color:var(--blue);text-decoration:underline">${esc(r.product_name || "—")}</a>
          </div>
        </td>
        <td>${esc(r.author_name)}</td>
        <td><span style="color:#f59e0b">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span></td>
        <td style="color:var(--muted);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${r.comment ? esc(r.comment) : "<em>—</em>"}
        </td>
        <td style="color:var(--muted)">${new Date(r.created_at).toLocaleDateString("uk-UA")}</td>
        <td>
          <button class="row-btn danger" onclick="deleteReview(${r.id})">🗑️ Видалити</button>
        </td>
      </tr>
    `,
      )
      .join("");
  } catch (err) {
    body.innerHTML = `<tr><td colspan="7" class="table-empty" style="color:var(--red)">${err.message}</td></tr>`;
  }
}

async function deleteReview(id) {
  if (!confirm("Видалити цей відгук?")) return;
  try {
    await admApi(`/admin/reviews/${id}`, { method: "DELETE" });
    admToast("🗑️ Відгук видалено", "ok");
    loadReviews();
  } catch (err) {
    admToast(err.message, "err");
  }
}

/* ─── Helpers ────────────────────────────────────────────── */
function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function fmtPrice(n) {
  return (+n).toLocaleString("uk-UA") + " ₴";
}

/* ─── Keyboard ───────────────────────────────────────────── */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeProductForm();
    closeCategoryForm();
    closeStockModal();
    closeOrderDetails();
  }
});

/* ═══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
if (admToken) {
  fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${admToken}` } })
    .then((r) => r.json())
    .then((data) => {
      if (data.user?.role === "admin") {
        admUser = data.user;
        bootAdmin();
      } else adminLogout();
    })
    .catch(adminLogout);
} else {
  document.getElementById("authGate").style.display = "flex";
}
