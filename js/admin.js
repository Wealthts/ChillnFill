/*
 * Admin Dashboard Script
 * 1. CONFIG + STATE
 * 2. HELPER FUNCTIONS
 * 3. RENDER FUNCTIONS
 * 4. API FUNCTIONS
 * 5. PAGE FUNCTIONS
 * 6. EVENT BINDINGS
 */

let editCookIndex = null;
let editMenuIndex = null;

const COOKS_API_BASE = "/api/cooks";
const MENUS_API_BASE = "/api/menu";
const ORDERS_API_BASE = "/api/orders";
const PAYMENTS_API_BASE = "/api/payments";
const REVIEWS_API_BASE = "/api/reviews";
const ADMIN_SESSION_API = "/api/session";

const ADMIN_ACTIVE_PAGE_KEY = "admin_active_page";

const state = {
  cooks: [],
  menus: [],
  orders: [],
  payments: [],
  reviews: []
};

let dashboardFilter = getDefaultDashboardFilter();

const optionLabelMap = {
  spice: "Spiciness",
  sweet: "Sweetness",
  ice: "Ice Level",
  doneness: "Doneness",
  size: "Size"
};

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultDashboardFilter() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end)
  };
}

function safeParseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function bindEnter(ids, handler) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      handler();
    });
  });
}

async function showAlertDialog(message, icon = "error", title = "Notice") {
  const text = String(message || "");
  if (window.Swal) {
    await window.Swal.fire({
      icon,
      title,
      text,
      confirmButtonColor: "#7a4e2f"
    });
    return;
  }
  console.warn("SweetAlert2 is unavailable:", text);
}

function showErrorDialog(message, title = "Error") {
  return showAlertDialog(message, "error", title);
}

function showSuccessDialog(message, title = "Success") {
  return showAlertDialog(message, "success", title);
}

async function showConfirmDialog(message, title = "Are you sure?") {
  const text = String(message || "");
  if (window.Swal) {
    const result = await window.Swal.fire({
      icon: "warning",
      title,
      text,
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#7a4e2f",
      cancelButtonColor: "#a97a52"
    });
    return Boolean(result.isConfirmed);
  }
  console.warn("SweetAlert2 is unavailable for confirm dialog:", text);
  return false;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}

function normalizeMenu(menu) {
  const optionKeys = Array.isArray(menu?.optionKeys) ? menu.optionKeys : [];
  return {
    id: menu?.id,
    name: menu?.name || "Unnamed Menu",
    thaiName: menu?.thaiName || "",
    price: Number(menu?.price || 0),
    category: menu?.category || "single",
    desc: menu?.desc || "",
    optionKeys,
    img: menu?.img || menu?.image || "",
    available: menu?.available !== false
  };
}

function getStatusClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "paid" || normalized === "serving" || normalized === "completed" || normalized === "done") {
    return "bg-[#dff3e4] text-[#1f7a3d]";
  }
  if (normalized === "cooking") return "bg-[#e5f0ff] text-[#1b4d8f]";
  if (normalized === "pending") return "bg-[#fff1cc] text-[#9a6a00]";
  if (normalized === "cancelled" || normalized === "canceled" || normalized === "failed") {
    return "bg-[#fde2e2] text-[#b42318]";
  }
  return "bg-[#efe4d8] text-[#5f4028]";
}

function normalizeStatus(status, fallback = "pending") {
  const normalized = String(status || fallback).trim().toLowerCase();
  return normalized || fallback;
}

function isFinalItemStatus(status) {
  const normalized = normalizeStatus(status);
  return normalized === "completed" || normalized === "cancelled";
}

function getOrderStatusOptions(selectedStatus) {
  const normalized = normalizeStatus(selectedStatus, "pending");
  return ["pending", "cooking", "serving", "cancelled"]
    .map((status) => `<option value="${status}" ${normalized === status ? "selected" : ""}>${status.charAt(0).toUpperCase()}${status.slice(1)}</option>`)
    .join("");
}

function getOrderItemSummary(item) {
  const itemId = String(item.id ?? item.order_item_id ?? item.item_id ?? "");
  const itemStatus = normalizeStatus(item.status, "pending");
  const selectedStatus = itemStatus === "completed" ? "serving" : itemStatus;
  const qty = Number(item.qty ?? item.quantity ?? 0);
  const assignedCook = String(item.cook_id || item.cookId || "").trim();
  const notes = String(item.notes || "").trim();

  const assignedText = assignedCook ? `Assigned to ${assignedCook}` : "Unassigned";

  return `
    <div class="rounded-2xl border border-[#e6d7c7] bg-[#fffaf5] p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="font-medium text-[#5f4028]">${escapeHtml(item.name || "-")} x${qty}</div>
          <div class="mt-1 text-xs text-[#a97a52]">Item ID: ${escapeHtml(itemId || "-")}</div>
          <div class="mt-1 text-xs font-semibold ${assignedCook ? "text-[#7a4e2f]" : "text-[#a97a52]"}">${escapeHtml(assignedText)}</div>
          ${notes ? `<div class="mt-1 text-xs text-[#a97a52]">${escapeHtml(notes)}</div>` : ""}
        </div>
        <div class="px-3 py-1 rounded-full text-xs font-bold ${getStatusClass(selectedStatus)}">${escapeHtml(String(selectedStatus).toUpperCase())}</div>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <span class="text-sm font-semibold text-[#5f4028]">Status</span>
        <select class="select select-sm border-[#e6d7c7] bg-[#fffaf5]" data-admin-item-status-id="${escapeHtml(itemId)}">
          ${getOrderStatusOptions(selectedStatus)}
        </select>
      </div>
    </div>
  `;
}

function getPageTitleHtml(title) {
  return `<h2 class="text-2xl font-bold mt-6 mb-4">${escapeHtml(title)}</h2>`;
}

function renderSectionError(sectionId, title, message) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  section.innerHTML = `
    ${getPageTitleHtml(title)}
    <div class="rounded-2xl border border-[#e6d7c7] bg-[#fffaf5] p-4 text-sm text-[#7a4e2f]">
      ${escapeHtml(message)}
    </div>
  `;
}

function getActionHeaderHtml(title, buttonText, buttonAction) {
  return `
    <div class="flex items-center justify-between mt-6 mb-4">
      <h2 class="text-2xl font-bold">${escapeHtml(title)}</h2>
      <button class="btn bg-[#7a4e2f] text-[#fbf5ee] border-none hover:bg-[#5f4028]" onclick="${buttonAction}">${escapeHtml(buttonText)}</button>
    </div>
  `;
}

function getSimpleStatCardHtml(label, value, extraText) {
  const extraHtml = extraText
    ? `<div class="text-sm text-[#a97a52] mt-2">${escapeHtml(extraText)}</div>`
    : "";

  return `
    <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow">
      <div class="card-body">
        <div class="text-sm text-[#a97a52]">${escapeHtml(label)}</div>
        <div class="text-2xl font-extrabold text-[#5f4028]">${escapeHtml(value)}</div>
        ${extraHtml}
      </div>
    </div>
  `;
}

function getCookCardHtml(cook, index) {
  const isActive = String(cook.status || "").toLowerCase() === "active";
  const passwordReady = Boolean(cook.password_ready);

  return `
    <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow">
      <div class="card-body flex flex-col items-center text-center">
        <b class="text-lg">${escapeHtml(cook.full_name || cook.cook_id)}</b>
        <div class="opacity-70">ID: ${escapeHtml(cook.cook_id || "-")}</div>
        <div class="mt-2 text-xs ${passwordReady ? "text-[#1f7a3d]" : "text-[#a97a52]"}">
          ${passwordReady ? "Password ready" : "Waiting for first password setup"}
        </div>
        <div class="mt-3 flex items-center justify-center">
          <button class="btn btn-sm ${isActive ? "btn-success" : "btn-error"}" onclick="toggleCook(${index})">
            ${isActive ? "Enabled" : "Disabled"}
          </button>
        </div>
        <div class="card-actions justify-center mt-4">
          <button class="btn btn-sm bg-[#fbf5ee] text-[#5f4028] border border-[#e6d7c7] hover:bg-[#f3eadf]" onclick="editCook(${index})">Edit</button>
          <button class="btn btn-sm bg-[#efe4d8] text-[#5f4028] border border-[#e6d7c7] hover:bg-[#f3eadf]" onclick="deleteCook(${index})">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function getMenuCardHtml(menu, index) {
  const optionText = menu.optionKeys.length
    ? menu.optionKeys.map((key) => optionLabelMap[key] || key).join(", ")
    : "None";

  return `
    <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow-sm">
      <div class="card-body p-4 gap-2">
        ${menu.img ? `<img src="${escapeHtml(menu.img)}" class="w-full h-28 rounded-lg object-cover border border-[#e6d7c7]" />` : ""}
        <div class="flex items-start justify-between gap-2">
          <div class="font-bold text-base leading-tight">${escapeHtml(menu.name)}</div>
          <div class="text-sm font-semibold text-[#7a4e2f] whitespace-nowrap">${menu.price} Baht</div>
        </div>
        <div class="text-xs text-[#5f4028] space-y-1">
          <div><span class="opacity-70">Category:</span> ${escapeHtml(menu.category)}</div>
          <div><span class="opacity-70">Options:</span> ${escapeHtml(optionText)}</div>
          <div><span class="opacity-70">Status:</span> ${menu.available ? "Available" : "Disabled"}</div>
        </div>
        <div class="text-xs text-[#5f4028] bg-[#fffaf5] border border-[#e6d7c7] rounded-lg px-2 py-1 min-h-[52px]">${escapeHtml(menu.desc || "-")}</div>
        <div class="flex items-center justify-between mt-1">
          <button class="btn btn-xs ${menu.available ? "btn-success" : "btn-error"}" onclick="toggleMenu(${index})">
            ${menu.available ? "Enabled" : "Disabled"}
          </button>
          <div class="card-actions">
            <button class="btn btn-xs bg-[#fbf5ee] text-[#5f4028] border border-[#e6d7c7] hover:bg-[#f3eadf]" onclick="editMenu(${index})">Edit</button>
            <button class="btn btn-xs bg-[#efe4d8] text-[#5f4028] border border-[#e6d7c7] hover:bg-[#f3eadf]" onclick="deleteMenu(${index})">Delete</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getOrderCardHtml(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const activeItems = items.filter((item) => !isFinalItemStatus(item?.status));
  const assignedItems = activeItems.filter((item) => String(item?.cook_id || item?.cookId || "").trim()).length;
  const unassignedItems = activeItems.length - assignedItems;
  const itemsHtml = items.length
    ? items.map((item) => getOrderItemSummary(item)).join("")
    : "<div class='text-sm text-[#a97a52]'>No items found</div>";

  return `
    <div class="card border border-[#e6d7c7] bg-[#fbf5ee] shadow-sm mb-4">
      <div class="card-body">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="text-lg font-bold text-[#5f4028]">Order #${escapeHtml(order.id)}</div>
            <div class="text-sm text-[#a97a52]">Table ${escapeHtml(order.table || "-")} | ${escapeHtml(formatDateTime(order.time))}</div>
            <div class="mt-1 text-xs text-[#a97a52]">Assigned items: ${assignedItems} | Unassigned items: ${unassignedItems}</div>
          </div>
          <div class="px-3 py-1 rounded-full text-xs font-bold inline-flex ${getStatusClass(order.status)}">${escapeHtml(String(order.status || "pending").toUpperCase())}</div>
        </div>
        <div class="mt-4 grid gap-3">${itemsHtml}</div>
        <div class="mt-3 font-semibold text-[#5f4028]">Total: ${Number(order.total || 0)} Baht</div>
      </div>
    </div>
  `;
}

function getPaymentCardHtml(payment) {
  return `
    <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow mb-4">
      <div class="card-body">
        <b>Table: ${escapeHtml(payment.table_number || "-")}</b><br>
        Payment #${escapeHtml(payment.payment_reference || payment.id)}<br>
        Amount: ${Number(payment.amount || 0)} Baht<br>
        Method: ${escapeHtml(payment.method || "-")}<br>
        Status: ${escapeHtml(payment.status || "-")}<br>
        ${escapeHtml(formatDateTime(payment.created_at))}
      </div>
    </div>
  `;
}

function getReviewCardHtml(review) {
  return `
    <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow mb-4">
      <div class="card-body">
        <div class="flex items-center justify-between gap-3">
          <div class="font-bold text-[#5f4028]">★ ${Number(review.rating || 0)} / 5</div>
          <div class="text-xs text-[#a97a52]">${escapeHtml(formatDateTime(review.created_at))}</div>
        </div>
        <div class="text-sm text-[#5f4028] mt-2">${escapeHtml(review.comment || "-")}</div>
        <div class="text-xs text-[#a97a52] mt-1">Table: ${escapeHtml(review.table_number || "-")}</div>
      </div>
    </div>
  `;
}

function getDashboardFilterCardHtml(rangeLabel) {
  return `
    <div class='card bg-[#fbf5ee] border border-[#e6d7c7] shadow mb-4'>
      <div class='card-body'>
        <div class='flex flex-wrap items-end gap-3'>
          <div>
            <div class='text-sm opacity-70 mb-1'>Start Date</div>
            <input id='dashboardStartDate' type='date' class='input input-bordered bg-[#fffaf5] border-[#e6d7c7]' value='${dashboardFilter.start}'>
          </div>
          <div>
            <div class='text-sm opacity-70 mb-1'>End Date</div>
            <input id='dashboardEndDate' type='date' class='input input-bordered bg-[#fffaf5] border-[#e6d7c7]' value='${dashboardFilter.end}'>
          </div>
          <button class='btn bg-[#7a4e2f] text-[#fbf5ee] border-none hover:bg-[#5f4028]' onclick='applyDashboardDateFilter()'>Apply</button>
          <button class='btn bg-[#efe4d8] text-[#5f4028] border border-[#e6d7c7] hover:bg-[#f3eadf]' onclick='clearDashboardDateFilter()'>Clear</button>
        </div>
        <div class='mt-2 text-sm opacity-70'>Range: ${escapeHtml(rangeLabel)}</div>
      </div>
    </div>
  `;
}

function bindOrderActionButtons(container) {
  if (!container) return;

  container.querySelectorAll("select[data-admin-item-status-id]").forEach((selectEl) => {
    selectEl.addEventListener("change", async (event) => {
      try {
        await updateAdminOrderItemStatus(selectEl.getAttribute("data-admin-item-status-id"), event.target.value);
      } catch (err) {
        await showErrorDialog(err.message || "Unable to update item status");
      }
    });
  });
}

async function updateAdminOrderStatus(orderId) {
  const selectEl = document.querySelector(`[data-admin-order-status-id="${orderId}"]`);
  if (!selectEl) return;

  await apiRequest(`${ORDERS_API_BASE}/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: selectEl.value })
  });
  await loadOrders();
}

async function updateAdminOrderItemStatus(itemId, statusValue = "") {
  const selectEl = document.querySelector(`[data-admin-item-status-id="${itemId}"]`);
  const nextStatus = String(statusValue || selectEl?.value || "").trim().toLowerCase();
  if (!nextStatus) return;

  await apiRequest(`/api/order-items/${encodeURIComponent(itemId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: nextStatus })
  });
  await loadOrders();
}

function getRecordCustomerKey(record) {
  if (!record) return "";
  if (record.userId) return `user:${record.userId}`;
  if (record.session_id) return `user:${record.session_id}`;
  if (record.table) return `table:${record.table}`;
  if (record.table_number) return `table:${record.table_number}`;
  return "";
}

function isServedOrderStatus(status) {
  const normalized = String(status || "").toLowerCase();
  return ["serving", "served", "completed", "done"].includes(normalized);
}

function parseDateBoundary(dateText, isEnd) {
  if (!dateText) return null;
  const timeText = isEnd ? "T23:59:59.999" : "T00:00:00.000";
  const date = new Date(`${dateText}${timeText}`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isInDashboardRange(isoTime) {
  if (!isoTime) return false;
  const value = new Date(isoTime);
  if (Number.isNaN(value.getTime())) return false;

  const start = parseDateBoundary(dashboardFilter.start, false);
  const end = parseDateBoundary(dashboardFilter.end, true);
  if (start && value < start) return false;
  if (end && value > end) return false;
  return true;
}

function getCheckedOptionValues(selector) {
  return Array.from(document.querySelectorAll(selector))
    .filter((input) => input.checked)
    .map((input) => input.value);
}

function setCheckedOptionValues(selector, values) {
  const selected = new Set(Array.isArray(values) ? values : []);
  document.querySelectorAll(selector).forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove("hidden");
  modalEl.classList.add("flex");
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add("hidden");
  modalEl.classList.remove("flex");
}

function getCurrentPage() {
  const pages = ["dashboard", "cooks", "menu", "orders", "payment", "reviews"];
  return pages.find((page) => {
    const el = document.getElementById(page);
    return el && el.style.display !== "none";
  }) || "dashboard";
}

function showPage(page) {
  const pages = ["dashboard", "cooks", "menu", "orders", "payment", "reviews"];
  const nextPage = pages.includes(page) ? page : "dashboard";
  pages.forEach((p) => {
    const el = document.getElementById(p);
    if (el) el.style.display = p === nextPage ? "block" : "none";
  });
  const titleEl = document.getElementById("title");
  if (titleEl) titleEl.innerText = nextPage.toUpperCase();
  localStorage.setItem(ADMIN_ACTIVE_PAGE_KEY, nextPage);
  const nextHash = `#${nextPage}`;
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, "", nextHash);
  }
}

function applyInitialRoute() {
  const hashPage = (window.location.hash || "").replace("#", "").trim();
  const storedPage = localStorage.getItem(ADMIN_ACTIVE_PAGE_KEY) || "";
  const pages = ["dashboard", "cooks", "menu", "orders", "payment", "reviews"];
  if (pages.includes(hashPage)) return showPage(hashPage);
  if (pages.includes(storedPage)) return showPage(storedPage);
  showPage("dashboard");
}

async function bootstrapAdminSession() {
  try {
    const session = await apiRequest(ADMIN_SESSION_API, { method: "GET" });
    if (session?.user_type === "admin" || session?.admin_logged_in) {
      localStorage.setItem("admin_logged_in", "true");
      localStorage.setItem("user_type", "admin");
      return true;
    }
  } catch (err) {
  }
  return false;
}

async function logout() {
  try {
    await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
  } catch (err) {
    console.warn("Logout API failed:", err);
  }
  localStorage.removeItem("admin_logged_in");
  localStorage.removeItem("user_type");
  localStorage.removeItem(ADMIN_ACTIVE_PAGE_KEY);
  window.location.href = "staff.html";
}

async function loadCooks() {
  const data = await apiRequest(COOKS_API_BASE);
  state.cooks = Array.isArray(data.cooks) ? data.cooks : [];

  const div = document.getElementById("cooks");
  if (!div) return;

  const cookCardsHtml = state.cooks.map((cook, index) => getCookCardHtml(cook, index)).join("");
  div.innerHTML = `
    ${getActionHeaderHtml("Cooks", "+ Add Cook", "openCookModal()")}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${cookCardsHtml}</div>
  `;
}

function openCookModal() {
  openModal(document.getElementById("cookModal"));
  document.getElementById("cookName").value = "";
  document.getElementById("cookId").value = "";
}

function closeCookModal() {
  closeModal(document.getElementById("cookModal"));
}

async function addCook() {
  const full_name = String(document.getElementById("cookName").value || "").trim();
  const cook_id = String(document.getElementById("cookId").value || "").trim();

  if (!full_name || !cook_id) {
    await showErrorDialog("Please fill all fields", "Missing fields");
    return;
  }

  await apiRequest(COOKS_API_BASE, {
    method: "POST",
    body: JSON.stringify({ cook_id, full_name, status: "active" })
  });
  closeCookModal();
  await loadCooks();
}

async function toggleCook(index) {
  const cook = state.cooks[index];
  if (!cook) return;

  const nextStatus = String(cook.status || "").toLowerCase() === "active" ? "inactive" : "active";
  await apiRequest(`${COOKS_API_BASE}/${encodeURIComponent(cook.cook_id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: nextStatus })
  });
  await loadCooks();
}

async function deleteCook(index) {
  const cook = state.cooks[index];
  if (!cook) return;
  if (!(await showConfirmDialog("Delete this cook?", "Delete cook"))) return;

  await apiRequest(`${COOKS_API_BASE}/${encodeURIComponent(cook.cook_id)}`, { method: "DELETE" });
  await loadCooks();
}

function editCook(index) {
  const cook = state.cooks[index];
  if (!cook) return;

  editCookIndex = index;
  document.getElementById("editCookName").value = cook.full_name || "";
  document.getElementById("editCookId").value = cook.cook_id || "";
  openModal(document.getElementById("editCookModal"));
}

function closeEditCookModal() {
  editCookIndex = null;
  closeModal(document.getElementById("editCookModal"));
}

async function updateCook() {
  if (editCookIndex === null || !state.cooks[editCookIndex]) return;

  const cookId = String(document.getElementById("editCookId").value || "").trim();
  const full_name = String(document.getElementById("editCookName").value || "").trim();

  if (!cookId || !full_name) {
    await showErrorDialog("Please fill required fields", "Missing fields");
    return;
  }

  const payload = { full_name };

  await apiRequest(`${COOKS_API_BASE}/${encodeURIComponent(cookId)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  closeEditCookModal();
  await loadCooks();
}

async function loadMenu() {
  const data = await apiRequest(`${MENUS_API_BASE}?include_disabled=1`);
  state.menus = (Array.isArray(data.menus) ? data.menus : []).map(normalizeMenu);

  const div = document.getElementById("menu");
  if (!div) return;

  const menuCardsHtml = state.menus.map((menu, index) => getMenuCardHtml(menu, index)).join("");
  div.innerHTML = `
    ${getActionHeaderHtml("Menu", "+ Add Menu", "openMenuModal()")}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${menuCardsHtml}</div>
  `;
}

function openMenuModal() {
  editMenuIndex = null;
  document.getElementById("menuName").value = "";
  document.getElementById("menuPrice").value = "";
  document.getElementById("menuDesc").value = "";
  document.getElementById("menuCategory").value = "single";
  document.getElementById("menuImg").value = "";
  setCheckedOptionValues(".menu-option", []);
  openModal(document.getElementById("menuModal"));
}

function closeMenuModal() {
  closeModal(document.getElementById("menuModal"));
}

function closeEditMenuModal() {
  editMenuIndex = null;
  closeModal(document.getElementById("editMenuModal"));
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to read image file"));
      img.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error("Unable to read image file"));
    reader.readAsDataURL(file);
  });
}

async function compressImageFile(file) {
  const image = await loadImageElement(file);
  const maxWidth = 1280;
  const maxHeight = 1280;
  let { width, height } = image;

  const scale = Math.min(maxWidth / width || 1, maxHeight / height || 1, 1);
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image compression is not supported in this browser");
  }

  context.drawImage(image, 0, 0, width, height);

  const qualities = [0.82, 0.72, 0.62, 0.5, 0.4];
  let output = "";
  for (const quality of qualities) {
    output = canvas.toDataURL("image/jpeg", quality);
    if (output.length <= 900000) break;
  }

  if (!output || output.length > 900000) {
    throw new Error("Image is still too large after compression. Please choose a smaller image.");
  }

  return output;
}

async function readImageFile(input) {
  const file = input?.files?.[0];
  if (!file) return null;
  return compressImageFile(file);
}

async function addMenu() {
  const name = String(document.getElementById("menuName").value || "").trim();
  const price = Number(document.getElementById("menuPrice").value || 0);
  const desc = String(document.getElementById("menuDesc").value || "").trim();
  const category = String(document.getElementById("menuCategory").value || "single").trim();
  const optionKeys = getCheckedOptionValues(".menu-option");
  const img = await readImageFile(document.getElementById("menuImg"));

  if (!name || !price) {
    await showErrorDialog("Please fill all fields", "Missing fields");
    return;
  }

  try {
    await apiRequest(MENUS_API_BASE, {
      method: "POST",
      body: JSON.stringify({ name, price, desc, category, optionKeys, img, available: true })
    });
    closeMenuModal();
    await loadMenu();
    await showSuccessDialog("Menu added successfully");
  } catch (error) {
    if (String(error.message || "").includes("max_allowed_packet")) {
      await showErrorDialog("Image is too large for the database. Please choose a smaller image.");
      return;
    }
    await showErrorDialog(error.message || "Unable to add menu");
  }
}

function editMenu(index) {
  const menu = state.menus[index];
  if (!menu) return;

  editMenuIndex = index;
  document.getElementById("editMenuName").value = menu.name || "";
  document.getElementById("editMenuPrice").value = menu.price || "";
  document.getElementById("editMenuDesc").value = menu.desc || "";
  document.getElementById("editMenuCategory").value = menu.category || "single";
  setCheckedOptionValues(".edit-menu-option", menu.optionKeys || []);
  openModal(document.getElementById("editMenuModal"));
}

async function updateMenu() {
  if (editMenuIndex === null || !state.menus[editMenuIndex]) return;

  const current = state.menus[editMenuIndex];
  const name = String(document.getElementById("editMenuName").value || "").trim();
  const price = Number(document.getElementById("editMenuPrice").value || 0);
  const desc = String(document.getElementById("editMenuDesc").value || "").trim();
  const category = String(document.getElementById("editMenuCategory").value || "single").trim();
  const optionKeys = getCheckedOptionValues(".edit-menu-option");

  if (!name || !price) {
    await showErrorDialog("Please fill all fields", "Missing fields");
    return;
  }

  try {
    await apiRequest(`${MENUS_API_BASE}/${current.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name,
        price,
        desc,
        category,
        optionKeys,
        img: current.img || "",
        available: current.available
      })
    });
    closeEditMenuModal();
    await loadMenu();
    await showSuccessDialog("Menu updated successfully");
  } catch (error) {
    await showErrorDialog(error.message || "Unable to update menu");
  }
}

async function deleteMenu(index) {
  const menu = state.menus[index];
  if (!menu) return;
  if (!(await showConfirmDialog("Delete this menu?", "Delete menu"))) return;

  await apiRequest(`${MENUS_API_BASE}/${menu.id}`, { method: "DELETE" });
  await loadMenu();
}

async function toggleMenu(index) {
  const menu = state.menus[index];
  if (!menu) return;

  try {
    await apiRequest(`${MENUS_API_BASE}/${menu.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ available: !menu.available })
    });
    await loadMenu();
  } catch (error) {
    await showErrorDialog(error.message || "Unable to update menu status");
  }
}

async function loadOrders() {
  const data = await apiRequest(ORDERS_API_BASE);
  state.orders = Array.isArray(data.orders) ? data.orders : [];

  const div = document.getElementById("orders");
  if (!div) return;
  const orderCardsHtml = state.orders.map((order) => getOrderCardHtml(order)).join("");
  div.innerHTML = `${getPageTitleHtml("Orders")}${orderCardsHtml}`;
  bindOrderActionButtons(div);
}

async function loadPayments() {
  const data = await apiRequest(PAYMENTS_API_BASE);
  state.payments = Array.isArray(data.payments) ? data.payments : [];

  const div = document.getElementById("payment");
  if (!div) return;
  const paymentCardsHtml = state.payments.map((payment) => getPaymentCardHtml(payment)).join("");
  div.innerHTML = `${getPageTitleHtml("Payments")}${paymentCardsHtml}`;
}

async function loadReviews() {
  const data = await apiRequest(REVIEWS_API_BASE);
  state.reviews = Array.isArray(data.reviews) ? data.reviews : [];

  const div = document.getElementById("reviews");
  if (!div) return;

  const avg = state.reviews.length
    ? (state.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / state.reviews.length).toFixed(1)
    : "0.0";

  if (!state.reviews.length) {
    div.innerHTML = `
      ${getPageTitleHtml("Reviews")}
      ${getSimpleStatCardHtml("Average Rating", avg, "No reviews yet")}
    `;
    return;
  }

  const reviewCardsHtml = state.reviews.map((review) => getReviewCardHtml(review)).join("");
  div.innerHTML = `
    ${getPageTitleHtml("Reviews")}
    <div class="mb-4">${getSimpleStatCardHtml("Average Rating", `${avg} / 5`)}</div>
    ${reviewCardsHtml}
  `;
}

async function loadDashboard() {
  if (!state.orders.length) {
    try { await loadOrders(); } catch {}
  }
  if (!state.payments.length) {
    try { await loadPayments(); } catch {}
  }
  if (!state.reviews.length) {
    try { await loadReviews(); } catch {}
  }

  const filteredOrders = state.orders.filter((order) => isInDashboardRange(order.time));
  const filteredPayments = state.payments.filter((payment) => isInDashboardRange(payment.created_at));
  const filteredReviews = state.reviews.filter((review) => isInDashboardRange(review.created_at));

  const totalPayment = filteredPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const avgRating = filteredReviews.length
    ? (filteredReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / filteredReviews.length).toFixed(1)
    : "0.0";

  const customerSet = new Set();
  filteredOrders.forEach((order) => {
    const key = getRecordCustomerKey(order);
    if (key) customerSet.add(key);
  });

  const menuCounts = {};
  filteredOrders.filter((order) => isServedOrderStatus(order.status)).forEach((order) => {
    (Array.isArray(order.items) ? order.items : []).forEach((item) => {
      if (!item?.name) return;
      menuCounts[item.name] = (menuCounts[item.name] || 0) + Number(item.qty || 0);
    });
  });

  let topMenu = "-";
  let topMenuCount = 0;
  Object.entries(menuCounts).forEach(([name, count]) => {
    if (count > topMenuCount) {
      topMenu = name;
      topMenuCount = count;
    }
  });

  const div = document.getElementById("dashboard");
  if (!div) return;

  const hasFilter = Boolean(dashboardFilter.start || dashboardFilter.end);
  const rangeLabel = hasFilter
    ? `${dashboardFilter.start || "Any"} to ${dashboardFilter.end || "Any"}`
    : "All dates";

  const statCardsHtml = [
    getSimpleStatCardHtml("Customers", customerSet.size),
    getSimpleStatCardHtml("Total Revenue", `${totalPayment} Baht`),
    getSimpleStatCardHtml("Average Rating", avgRating),
    getSimpleStatCardHtml("Top Menu Served", topMenuCount ? `${topMenu} (${topMenuCount})` : topMenu)
  ].join("");

  div.innerHTML = `
    ${getPageTitleHtml("Dashboard")}
    ${getDashboardFilterCardHtml(rangeLabel)}
    <div class='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>${statCardsHtml}</div>
  `;
}

async function loadAll() {
  const tasks = [
    { sectionId: "cooks", title: "Cooks", run: loadCooks },
    { sectionId: "menu", title: "Menu", run: loadMenu },
    { sectionId: "orders", title: "Orders", run: loadOrders },
    { sectionId: "payment", title: "Payments", run: loadPayments },
    { sectionId: "reviews", title: "Reviews", run: loadReviews }
  ];

  const results = await Promise.allSettled(tasks.map((task) => task.run()));
  results.forEach((result, index) => {
    if (result.status === "fulfilled") return;
    const task = tasks[index];
    renderSectionError(task.sectionId, task.title, result.reason?.message || `Unable to load ${task.title.toLowerCase()}.`);
    console.warn(`loadAll failed for ${task.sectionId}:`, result.reason);
  });

  try {
    await loadDashboard();
  } catch (err) {
    renderSectionError("dashboard", "Dashboard", err.message || "Unable to load dashboard.");
    console.warn("loadDashboard failed:", err);
  }
}

async function refreshVisiblePageData() {
  const page = getCurrentPage();
  if (page === "dashboard") {
    await Promise.all([loadOrders(), loadPayments(), loadReviews()]);
    await loadDashboard();
    return;
  }
  if (page === "cooks") return loadCooks();
  if (page === "menu") return loadMenu();
  if (page === "orders") return loadOrders();
  if (page === "payment") return loadPayments();
  if (page === "reviews") return loadReviews();
}

function applyDashboardDateFilter() {
  const startInput = document.getElementById("dashboardStartDate");
  const endInput = document.getElementById("dashboardEndDate");
  const start = startInput ? startInput.value : "";
  const end = endInput ? endInput.value : "";

  if (start && end && new Date(start) > new Date(end)) {
    void showErrorDialog("Start date cannot be after end date", "Invalid date range");
    return;
  }

  dashboardFilter = { start, end };
  loadDashboard();
}

function clearDashboardDateFilter() {
  dashboardFilter = { start: "", end: "" };
  loadDashboard();
}

async function initAdminPage() {
  bindEnter(["cookName", "cookId"], addCook);
  bindEnter(["editCookName"], updateCook);
  bindEnter(["menuName", "menuPrice", "menuDesc"], addMenu);
  bindEnter(["editMenuName", "editMenuPrice", "editMenuDesc"], updateMenu);

  const app = document.getElementById("app");
  if (app) {
    app.classList.remove("hidden");
  }

  if (!(await bootstrapAdminSession())) {
    window.location.href = "staff.html";
    return;
  }

  applyInitialRoute();
  await loadAll();

  const clockEl = document.getElementById("clock");
  if (clockEl) clockEl.innerText = new Date().toLocaleString();
  setInterval(async () => {
    const nextClockEl = document.getElementById("clock");
    if (nextClockEl) nextClockEl.innerText = new Date().toLocaleString();
    if (app.classList.contains("hidden")) return;
    try {
      await refreshVisiblePageData();
    } catch (err) {
      console.warn("refreshVisiblePageData failed:", err);
    }
  }, 5000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAdminPage);
} else {
  initAdminPage();
}
