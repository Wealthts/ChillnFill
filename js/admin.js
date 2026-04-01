let editCookIndex = null;
let editMenuIndex = null;
const COOKS_API_BASE = "/api/cooks";
const MENUS_API_BASE = "/api/menu";
let cookRows = [];

function toDateInputValue(date){
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultDashboardFilter(){
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end)
  };
}

let dashboardFilter = getDefaultDashboardFilter();
const ADMIN_ACTIVE_PAGE_KEY = "admin_active_page";
const MENU_CATALOG_SEED_KEY = "menus_seeded_from_catalog_v1";
const MENUS_BACKUP_KEY = "menus_backup_latest";
const mediaImageByMenuName = {
  "basil fried rice": "../media/basilfriedrice.jpg",
  "tom yum goong": "../media/tomyumkung.jpg",
  "pad thai": "../media/padthai.jpg",
  "hainanese chicken rice": "../media/hainanesechickenrice.jpg",
  "som tam thai": "../media/somtamthai.jpg",
  "korean bbq beef": "../media/koreanbbq.jpg",
  "beef basil": "../media/beefbasil.jpg",
  "lime juice": "../media/limejuice.jpg"
};

function resolveMenuImage(menuName, fallbackImage){
  const key = String(menuName || "").trim().toLowerCase();
  return mediaImageByMenuName[key] || fallbackImage || "";
}

const defaultMenuCatalog = [
  {
    id: 1,
    name: "Basil Fried Rice",
    price: 65,
    category: "single",
    desc: "Crispy chicken basil rice with fried egg",
    optionKeys: ["spice"],
    hasOptions: true,
    img: resolveMenuImage("Basil Fried Rice"),
    available: true
  },
  {
    id: 2,
    name: "Tom Yum Goong",
    price: 120,
    category: "tomyum",
    desc: "Clear spicy shrimp tom yum soup",
    optionKeys: ["spice"],
    hasOptions: true,
    img: resolveMenuImage("Tom Yum Goong"),
    available: true
  },
  {
    id: 3,
    name: "Pad Thai",
    price: 70,
    category: "single",
    desc: "Thai stir-fried noodles with shrimp",
    optionKeys: ["spice"],
    hasOptions: true,
    img: resolveMenuImage("Pad Thai"),
    available: true
  },
  {
    id: 4,
    name: "Hainanese Chicken Rice",
    price: 60,
    category: "single",
    desc: "Steamed chicken rice with special sauce",
    optionKeys: [],
    hasOptions: false,
    img: resolveMenuImage("Hainanese Chicken Rice"),
    available: true
  },
  {
    id: 5,
    name: "Som Tam Thai",
    price: 55,
    category: "salad",
    desc: "Spicy green papaya salad",
    optionKeys: ["spice"],
    hasOptions: true,
    img: resolveMenuImage("Som Tam Thai"),
    available: true
  },
  {
    id: 6,
    name: "Korean BBQ Beef",
    price: 180,
    category: "main",
    desc: "Korean-style marinated grilled beef",
    optionKeys: ["doneness"],
    hasOptions: true,
    img: resolveMenuImage("Korean BBQ Beef"),
    available: true
  },
  {
    id: 7,
    name: "Beef Basil",
    price: 85,
    category: "single",
    desc: "Minced beef basil with fried egg",
    optionKeys: ["spice"],
    hasOptions: true,
    img: resolveMenuImage("Beef Basil"),
    available: true
  },
  {
    id: 8,
    name: "Lime Juice",
    price: 25,
    category: "drink",
    desc: "Fresh lime juice",
    optionKeys: ["sweet", "ice"],
    hasOptions: true,
    img: resolveMenuImage("Lime Juice"),
    available: true
  },
  {
    id: 9,
    name: "Green Tea",
    price: 30,
    category: "drink",
    desc: "Iced green tea",
    optionKeys: ["sweet", "ice"],
    hasOptions: true,
    img: resolveMenuImage("Green Tea"),
    available: true
  },
  {
    id: 10,
    name: "Ice Cream",
    price: 35,
    category: "dessert",
    desc: "Vanilla ice cream",
    optionKeys: ["size"],
    hasOptions: true,
    img: resolveMenuImage("Ice Cream"),
    available: true
  },
  {
    id: 11,
    name: "Crispy Pork Basil",
    price: 70,
    category: "single",
    desc: "Crispy pork basil rice",
    optionKeys: ["spice"],
    hasOptions: true,
    img: resolveMenuImage("Crispy Pork Basil"),
    available: true
  },
  {
    id: 12,
    name: "Seafood Tom Yum",
    price: 150,
    category: "tomyum",
    desc: "Mixed seafood tom yum soup",
    optionKeys: ["spice"],
    hasOptions: true,
    img: resolveMenuImage("Seafood Tom Yum"),
    available: true
  },
  {
    id: 13,
    name: "Soda",
    price: 20,
    category: "drink",
    desc: "Soda, Coke, Sprite",
    optionKeys: ["sweet", "ice"],
    hasOptions: true,
    img: resolveMenuImage("Soda"),
    available: true
  }
];

function menuSeedKeyOf(item){
  return `${String(item.name || "").trim().toLowerCase()}|${String(item.category || "single").trim().toLowerCase()}`;
}

function safeParseJson(value, fallback){
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
}

function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function apiRequest(url, options = {}){
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}

function normalizeCookRowsFromStorage(){
  const fromStorage = safeParseJson(localStorage.getItem("cooks"), []);
  if (!Array.isArray(fromStorage)) return [];

  return fromStorage.map((c) => {
    const active = typeof c?.active === "boolean" ? c.active : Boolean(c?.cooking || c?.serving);
    return {
      id: c?.id || c?.cook_id || "",
      cook_id: c?.cook_id || c?.id || "",
      full_name: c?.full_name || c?.name || "",
      status: c?.status || (active ? "active" : "inactive")
    };
  }).filter((c) => c.cook_id);
}

function persistCookRows(cooks){
  const safeRows = Array.isArray(cooks) ? cooks : [];
  const legacy = safeRows.map((c) => ({
    id: c.cook_id,
    cook_id: c.cook_id,
    name: c.full_name || c.cook_id,
    full_name: c.full_name || c.cook_id,
    status: c.status,
    active: String(c.status || "").toLowerCase() === "active"
  }));
  localStorage.setItem("cooks", JSON.stringify(legacy));
}

function readMenusFromStorage(){
  const primary = safeParseJson(localStorage.getItem("menus"), null);
  if (Array.isArray(primary) && primary.length) return primary;

  const backup = safeParseJson(localStorage.getItem(MENUS_BACKUP_KEY), []);
  if (Array.isArray(backup) && backup.length) {
    localStorage.setItem("menus", JSON.stringify(backup));
    return backup;
  }

  return Array.isArray(primary) ? primary : [];
}

function saveMenusToStorage(menus){
  const safeMenus = Array.isArray(menus) ? menus : [];
  const payload = JSON.stringify(safeMenus);
  localStorage.setItem(MENUS_BACKUP_KEY, payload);
  localStorage.setItem("menus", payload);
}

function seedMenuCatalogIfNeeded(){
  const storedMenus = readMenusFromStorage();
  if (Array.isArray(storedMenus) && storedMenus.length) {
    localStorage.setItem(MENU_CATALOG_SEED_KEY, "1");
    return;
  }

  if (localStorage.getItem(MENU_CATALOG_SEED_KEY) === "1") {
    saveMenusToStorage(defaultMenuCatalog);
    return;
  }

  const existingByKey = new Set(storedMenus.map(menuSeedKeyOf));
  const mergedMenus = [...storedMenus];

  defaultMenuCatalog.forEach((item) => {
    const key = menuSeedKeyOf(item);
    if (!existingByKey.has(key)) {
      mergedMenus.push({
        ...item,
        id: item.id || Date.now()
      });
    }
  });

  saveMenusToStorage(mergedMenus);
  localStorage.setItem(MENU_CATALOG_SEED_KEY, "1");
}

/* ================= LOGIN ================= */
function login(){
  const adminUser = document.getElementById("adminUser");
  const adminPass = document.getElementById("adminPass");
  const loginPage = document.getElementById("loginPage");
  const app = document.getElementById("app");

  if(adminUser.value === "admin" && adminPass.value === "0000"){
    loginPage.classList.add("hidden");
    app.classList.remove("hidden");
    loginPage.style.display = "none";
    app.style.display = "block";
    loadAll();
    applyInitialRoute();
  }else{
    alert("Wrong username or password");
  }
}

async function logout(){
  try {
    await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
  } catch (err) {
    console.warn("Logout API failed:", err);
  }
  localStorage.removeItem("admin_logged_in");
  localStorage.removeItem("user_type");
  localStorage.removeItem("cook_id");
  localStorage.removeItem("cook_name");
  localStorage.removeItem(ADMIN_ACTIVE_PAGE_KEY);
  window.location.href = "staff.html";
}

function isSectionVisible(sectionId){
  const el = document.getElementById(sectionId);
  if (!el) return false;
  return el.style.display !== "none";
}

function isOrderStatusSelectFocused(){
  const active = document.activeElement;
  return Boolean(active && active.matches && active.matches("#orders select"));
}

function bindEnter(ids, handler){
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

setInterval(() => {
  const clockEl = document.getElementById("clock");
  if (clockEl) clockEl.innerText = new Date().toLocaleString();

  // Avoid rerendering while user is interacting with order status dropdown.
  if (isSectionVisible("orders") && !isOrderStatusSelectFocused()) {
    loadOrders();
  }

  if (isSectionVisible("payment")) {
    loadPayments();
  }
}, 2000);

/* ================= PAGE ================= */
function showPage(page){
  let pages = ["dashboard","cooks","menu","orders","payment","reviews"];
  if (!pages.includes(page)) page = "dashboard";
  pages.forEach(p=> document.getElementById(p).style.display="none");

  document.getElementById(page).style.display="block";
  const titleEl = document.getElementById("title");
  if (titleEl) titleEl.innerText = page.toUpperCase();
  localStorage.setItem(ADMIN_ACTIVE_PAGE_KEY, page);
  const nextHash = `#${page}`;
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, "", nextHash);
  }
}

function applyInitialRoute(){
  const hashPage = (window.location.hash || "").replace("#", "").trim();
  const storedPage = localStorage.getItem(ADMIN_ACTIVE_PAGE_KEY) || "";
  const pages = ["dashboard","cooks","menu","orders","payment","reviews"];
  if (pages.includes(hashPage)) {
    showPage(hashPage);
  } else if (pages.includes(storedPage)) {
    showPage(storedPage);
  } else {
    showPage("dashboard");
  }
}

/* ================= LOAD ALL ================= */
function loadAll(){
  seedMenuCatalogIfNeeded();
  loadDashboard();
  loadCooks();
  loadMenu();
  loadOrders();
  loadPayments();
  loadReviews();
}

function parseDateBoundary(dateText, isEnd){
  if (!dateText) return null;
  const timeText = isEnd ? "T23:59:59.999" : "T00:00:00.000";
  const date = new Date(`${dateText}${timeText}`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isInDashboardRange(isoTime){
  if (!isoTime) return false;
  const value = new Date(isoTime);
  if (Number.isNaN(value.getTime())) return false;

  const start = parseDateBoundary(dashboardFilter.start, false);
  const end = parseDateBoundary(dashboardFilter.end, true);
  if (start && value < start) return false;
  if (end && value > end) return false;
  return true;
}

function applyDashboardDateFilter(){
  const startInput = document.getElementById("dashboardStartDate");
  const endInput = document.getElementById("dashboardEndDate");
  const start = startInput ? startInput.value : "";
  const end = endInput ? endInput.value : "";

  if (start && end && new Date(start) > new Date(end)) {
    alert("Start date cannot be after end date");
    return;
  }

  dashboardFilter = { start, end };
  loadDashboard();
}

function clearDashboardDateFilter(){
  dashboardFilter = { start: "", end: "" };
  loadDashboard();
}

function getRecordCustomerKey(record){
  if (!record) return "";
  if (record.userId) return `user:${record.userId}`;
  if (record.table) return `table:${record.table}`;
  return "";
}

function isServedOrderStatus(status){
  const normalized = String(status || "").toLowerCase();
  return ["serving", "served", "completed", "done"].includes(normalized);
}

function getOrderStatusClass(status){
  const normalized = String(status || "").toLowerCase();
  if (normalized === "serving" || normalized === "served" || normalized === "completed" || normalized === "done") {
    return "bg-[#dff3e4] text-[#1f7a3d]";
  }
  if (normalized === "cooking" || normalized === "preparing") {
    return "bg-[#e5f0ff] text-[#1b4d8f]";
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return "bg-[#fde2e2] text-[#b42318]";
  }
  return "bg-[#fff1cc] text-[#9a6a00]";
}

/* ================= MODAL ================= */
function openModal(modalEl){
  modalEl.classList.remove("hidden");
  modalEl.classList.add("flex");
}

function closeModal(modalEl){
  modalEl.classList.add("hidden");
  modalEl.classList.remove("flex");
}

function getCheckedOptionValues(selector){
  return Array.from(document.querySelectorAll(selector))
    .filter((input) => input.checked)
    .map((input) => input.value);
}

function setCheckedOptionValues(selector, values){
  const selected = new Set(Array.isArray(values) ? values : []);
  document.querySelectorAll(selector).forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function formatOptionKeyLabel(key){
  const labels = {
    spice: "Spiciness",
    sweet: "Sweetness",
    ice: "Ice Level",
    doneness: "Doneness",
    size: "Size"
  };
  return labels[key] || key;
}

function openMenuModal(){ 
  const menuModal = document.getElementById("menuModal");
  const menuName = document.getElementById("menuName");
  const menuPrice = document.getElementById("menuPrice");
  const menuDesc = document.getElementById("menuDesc");
  const menuCategory = document.getElementById("menuCategory");
  const menuImg = document.getElementById("menuImg");

  openModal(menuModal);
  editMenuIndex = null;
  menuName.value = "";
  menuPrice.value = "";
  menuDesc.value = "";
  if (menuCategory) menuCategory.value = "single";
  setCheckedOptionValues(".menu-option", []);
  if (menuImg) menuImg.value = "";
}
function closeMenuModal(){ 
  const menuModal = document.getElementById("menuModal");
  closeModal(menuModal);
}

function closeEditMenuModal(){
  const editModal = document.getElementById("editMenuModal");
  closeModal(editModal);
}

function closeEditCookModal(){
  const editModal = document.getElementById("editCookModal");
  closeModal(editModal);
}

/* ================= COOK ================= */
async function loadCooks(){
  try {
    const data = await apiRequest(COOKS_API_BASE);
    cookRows = Array.isArray(data.cooks) ? data.cooks : [];
    persistCookRows(cookRows);
  } catch (err) {
    cookRows = normalizeCookRowsFromStorage();
  }

  const cooks = cookRows;
  let div = document.getElementById("cooks");
  if (!div) return;

  div.innerHTML = `
    <div class="flex items-center justify-between mt-6 mb-4">
      <h2 class="text-2xl font-bold">Cooks</h2>
      <button class="btn bg-[#7a4e2f] text-[#fbf5ee] border-none hover:bg-[#5f4028]" onclick="openCookModal()">+ Add Cook</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
  `;

  let list = div.querySelector(".grid");

  cooks.forEach((c,i)=>{
    const isActive = String(c.status || "").toLowerCase() === "active";
    list.innerHTML += `
      <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow">
        <div class="card-body flex flex-col items-center text-center">
          <b class="text-lg">${escapeHtml(c.full_name || c.name || c.cook_id)}</b>
          <div class="opacity-70">ID: ${escapeHtml(c.cook_id || c.id || "-")}</div>
          <div class="mt-3">
            <div class="flex items-center gap-3">
              <span>Status</span>
              <button class="btn btn-sm ${isActive ? "btn-success" : "btn-error"}" aria-pressed="${isActive}" onclick="toggleCook(${i})">
                ${isActive ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>
          <div class="card-actions justify-center mt-4">
            <button class="btn btn-sm bg-[#fbf5ee] text-[#5f4028] border border-[#e6d7c7] hover:bg-[#f3eadf]" onclick="editCook(${i})">Edit</button>
            <button class="btn btn-sm bg-[#efe4d8] text-[#5f4028] border border-[#e6d7c7] hover:bg-[#f3eadf]" onclick="deleteCook(${i})">Delete</button>
          </div>
        </div>
      </div>
    `;
  });
}

function openCookModal(){
  const cookModal = document.getElementById("cookModal");
  const cookName = document.getElementById("cookName");
  const cookId = document.getElementById("cookId");
  const cookPass = document.getElementById("cookPass");

  openModal(cookModal);
  cookName.value = "";
  cookId.value = "";
  cookPass.value = "";
}

function closeCookModal(){
  const cookModal = document.getElementById("cookModal");
  closeModal(cookModal);
}

async function addCook(){
  const cookName = document.getElementById("cookName");
  const cookId = document.getElementById("cookId");
  const cookPass = document.getElementById("cookPass");

  const fullName = String(cookName.value || "").trim();
  const cook_id = String(cookId.value || "").trim();
  const password = String(cookPass.value || "").trim();

  if(!fullName || !cook_id || !password){
    alert("Please fill all fields");
    return;
  }

  try {
    await apiRequest(COOKS_API_BASE, {
      method: "POST",
      body: JSON.stringify({ cook_id, password, full_name: fullName, status: "active" })
    });
    closeCookModal();
    await loadCooks();
  } catch (err) {
    alert(err.message || "Unable to add cook");
  }
}

async function toggleCook(i){
  const current = cookRows[i];
  if (!current || !current.cook_id) return;
  const isActive = String(current.status || "").toLowerCase() === "active";
  const nextStatus = isActive ? "inactive" : "active";

  try {
    await apiRequest(`${COOKS_API_BASE}/${encodeURIComponent(current.cook_id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus })
    });
    await loadCooks();
  } catch (err) {
    alert(err.message || "Unable to update cook status");
  }
}

async function deleteCook(i){
  const current = cookRows[i];
  if (!current || !current.cook_id) return;
  if(confirm("Delete this cook?")){
    try {
      await apiRequest(`${COOKS_API_BASE}/${encodeURIComponent(current.cook_id)}`, {
        method: "DELETE"
      });
      await loadCooks();
    } catch (err) {
      alert(err.message || "Unable to delete cook");
    }
  }
}

function editCook(i){
  const current = cookRows[i];
  if (!current) return;
  const editCookName = document.getElementById("editCookName");
  const editCookId = document.getElementById("editCookId");
  const editCookPass = document.getElementById("editCookPass");
  const editCookModal = document.getElementById("editCookModal");

  editCookIndex = i;
  editCookName.value = current.full_name || current.name || "";
  editCookId.value = current.cook_id || current.id || "";
  editCookPass.value = "";
  editCookPass.placeholder = "Leave blank to keep current password";
  openModal(editCookModal);
}

async function updateCook(){
  if (editCookIndex === null || editCookIndex === undefined) return;

  const editCookName = document.getElementById("editCookName");
  const editCookId = document.getElementById("editCookId");
  const editCookPass = document.getElementById("editCookPass");
  const editCookModal = document.getElementById("editCookModal");
  const target = cookRows[editCookIndex];
  const cookId = String(editCookId?.value || target?.cook_id || "").trim();

  if(!editCookName.value || !cookId){
    alert("Please fill required fields");
    return;
  }

  const payload = { full_name: String(editCookName.value || "").trim() };
  const nextPassword = String(editCookPass.value || "").trim();
  if (nextPassword) payload.password = nextPassword;

  try {
    await apiRequest(`${COOKS_API_BASE}/${encodeURIComponent(cookId)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    editCookIndex = null;
    closeModal(editCookModal);
    await loadCooks();
  } catch (err) {
    alert(err.message || "Unable to update cook");
  }
}

/* ================= MENU ================= */
function loadMenu(){
  let menus = readMenusFromStorage();
  let div = document.getElementById("menu");

  div.innerHTML = `
    <div class="flex items-center justify-between mt-6 mb-4">
      <h2 class="text-2xl font-bold">Menu</h2>
      <button class="btn bg-[#7a4e2f] text-[#fbf5ee] border-none hover:bg-[#5f4028]" onclick="openMenuModal()">+ Add Menu</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
  `;

  let list = div.querySelector(".grid");

  menus.forEach((m,i)=>{
    const optionKeys = Array.isArray(m.optionKeys) ? m.optionKeys : [];
    const optionText = optionKeys.length
      ? optionKeys.map(formatOptionKeyLabel).join(", ")
      : "None";
    list.innerHTML += `
      <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow-sm">
        <div class="card-body p-4 gap-2">
          ${resolveMenuImage(m.name, m.img) ? `<img src="${resolveMenuImage(m.name, m.img)}" class="w-full h-28 rounded-lg object-cover border border-[#e6d7c7]" />` : ""}
          <div class="flex items-start justify-between gap-2">
            <div class="font-bold text-base leading-tight">${m.name}</div>
            <div class="text-sm font-semibold text-[#7a4e2f] whitespace-nowrap">${m.price} Baht</div>
          </div>
          <div class="text-xs text-[#5f4028] space-y-1">
            <div><span class="opacity-70">Category:</span> ${m.category || "single"}</div>
            <div><span class="opacity-70">Options:</span> ${optionText}</div>
            <div><span class="opacity-70">Status:</span> ${m.available ? "Available" : "Disabled"}</div>
          </div>
          <div class="text-xs text-[#5f4028] bg-[#fffaf5] border border-[#e6d7c7] rounded-lg px-2 py-1 min-h-[52px]">
            ${m.desc || "-"}
          </div>
          <div class="flex items-center justify-between mt-1">
            <button class="btn btn-xs ${m.available ? "btn-success" : "btn-error"}" aria-pressed="${m.available}" onclick="toggleMenu(${i})">
              ${m.available ? "Enabled" : "Disabled"}
            </button>
            <div class="card-actions">
              <button class="btn btn-xs bg-[#fbf5ee] text-[#5f4028] border border-[#e6d7c7] hover:bg-[#f3eadf]" onclick="editMenu(${i})">Edit</button>
              <button class="btn btn-xs bg-[#efe4d8] text-[#5f4028] border border-[#e6d7c7] hover:bg-[#f3eadf]" onclick="deleteMenu(${i})">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `;
  });
}

function addMenu(){
  const menuName = document.getElementById("menuName");
  const menuPrice = document.getElementById("menuPrice");
  const menuDesc = document.getElementById("menuDesc");
  const menuCategory = document.getElementById("menuCategory");
  const menuImg = document.getElementById("menuImg");
  const menuModal = document.getElementById("menuModal");
  const menuOptionKeys = getCheckedOptionValues(".menu-option");

  if(!menuName.value || !menuPrice.value){
    alert("Please fill all fields");
    return;
  }

  let menus = readMenusFromStorage();

  const isEdit = editMenuIndex !== null && editMenuIndex !== undefined;
  const existing = isEdit ? menus[editMenuIndex] : null;

  function saveData(imgData){
    const imgToUse = imgData !== null && imgData !== undefined
      ? imgData
      : resolveMenuImage(menuName.value, existing ? existing.img : "");

    const newItem = {
      id: existing ? existing.id : Date.now(),
      name: menuName.value,
      price: menuPrice.value,
      desc: menuDesc.value,
      category: menuCategory ? menuCategory.value : (existing ? existing.category : "single"),
      optionKeys: menuOptionKeys,
      hasOptions: menuOptionKeys.length > 0,
      img: resolveMenuImage(menuName.value, imgToUse || ""),
      available: existing ? existing.available : true
    };

    if (isEdit) menus[editMenuIndex] = newItem;
    else menus.push(newItem);

    try {
      saveMenusToStorage(menus);
    } catch (e) {
      if (newItem.img) {
        if (isEdit) menus[editMenuIndex] = { ...newItem, img: "" };
        else menus.pop();
        newItem.img = "";
        if (!isEdit) menus.push(newItem);
        try {
          saveMenusToStorage(menus);
        } catch (e2) {
          alert("Storage is full. Remove old items and try again.");
          return;
        }
      } else {
        alert("Storage is full. Remove old items and try again.");
        return;
      }
    }

    menuName.value = "";
    menuPrice.value = "";
    menuDesc.value = "";
    if (menuCategory) menuCategory.value = "single";
    setCheckedOptionValues(".menu-option", []);
    menuImg.value = "";
    editMenuIndex = null;

    closeModal(menuModal);
    loadMenu();
  }

  if(menuImg && menuImg.files[0]){
    const file = menuImg.files[0];
    const maxBytes = 300 * 1024; // target size

    const compressImage = (file, cb) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 600;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);

          let quality = 0.8;
          let dataUrl = canvas.toDataURL("image/jpeg", quality);
          let byteLen = Math.ceil((dataUrl.length * 3) / 4);

          while (byteLen > maxBytes && quality > 0.4) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL("image/jpeg", quality);
            byteLen = Math.ceil((dataUrl.length * 3) / 4);
          }

          cb(byteLen <= maxBytes ? dataUrl : null);
        };
        img.onerror = () => cb(null);
        img.src = e.target.result;
      };
      reader.onerror = () => cb(null);
      reader.readAsDataURL(file);
    };

    compressImage(file, (dataUrl) => {
      if (!dataUrl) {
        alert("Image too large to save. Saving without image.");
        saveData(null);
      } else {
        saveData(dataUrl);
      }
    });
  }else{
    saveData(null);
  }
}

function editMenu(i){
  let menus = readMenusFromStorage();

  const editMenuName = document.getElementById("editMenuName");
  const editMenuPrice = document.getElementById("editMenuPrice");
  const editMenuDesc = document.getElementById("editMenuDesc");
  const editMenuCategory = document.getElementById("editMenuCategory");
  const editMenuModal = document.getElementById("editMenuModal");

  editMenuIndex = i;
  editMenuName.value = menus[i].name || "";
  editMenuPrice.value = menus[i].price || "";
  editMenuDesc.value = menus[i].desc || "";
  if (editMenuCategory) editMenuCategory.value = menus[i].category || "single";
  setCheckedOptionValues(".edit-menu-option", menus[i].optionKeys || []);
  openModal(editMenuModal);
}

function updateMenu(){
  if (editMenuIndex === null || editMenuIndex === undefined) return;

  const editMenuName = document.getElementById("editMenuName");
  const editMenuPrice = document.getElementById("editMenuPrice");
  const editMenuDesc = document.getElementById("editMenuDesc");
  const editMenuCategory = document.getElementById("editMenuCategory");
  const editMenuModal = document.getElementById("editMenuModal");
  const editMenuOptionKeys = getCheckedOptionValues(".edit-menu-option");

  if(!editMenuName.value || !editMenuPrice.value){
    alert("Please fill all fields");
    return;
  }

  let menus = readMenusFromStorage();
  menus[editMenuIndex] = {
    ...menus[editMenuIndex],
    name: editMenuName.value,
    price: editMenuPrice.value,
    desc: editMenuDesc.value,
    category: editMenuCategory ? editMenuCategory.value : (menus[editMenuIndex].category || "single"),
    optionKeys: editMenuOptionKeys,
    hasOptions: editMenuOptionKeys.length > 0
  };

  saveMenusToStorage(menus);
  editMenuIndex = null;
  closeModal(editMenuModal);
  loadMenu();
}

function deleteMenu(i){
  let menus = readMenusFromStorage();
  if(confirm("Delete this menu?")){
    menus.splice(i,1);
    saveMenusToStorage(menus);
    loadMenu();
  }
}

function toggleMenu(i){
  let menus = readMenusFromStorage();
  if (!menus[i]) return;

  menus[i].available = !menus[i].available;
  saveMenusToStorage(menus);
  loadMenu();

  const menuId = Number.parseInt(String(menus[i].id || ""), 10);
  if (!Number.isInteger(menuId) || menuId <= 0) {
    return;
  }

  apiRequest(`${MENUS_API_BASE}/${menuId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ available: menus[i].available })
  }).catch((err) => {
    alert(`Menu status saved locally but DB update failed: ${err.message}`);
  });
}

/* ================= ORDERS ================= */
function loadOrders(){
  let orders = JSON.parse(localStorage.getItem("orders")) || [];

  orders.sort((a,b)=> new Date(b.time) - new Date(a.time));

  let div = document.getElementById("orders");
  div.innerHTML = "<h2 class='text-2xl font-bold mt-6 mb-4'>Orders</h2>";

  orders.forEach((o,i)=>{

    let itemsHTML = (o.items || []).map(it=>`
      - ${it.name} x${it.qty}
    `).join("<br>");

    div.innerHTML += `
      <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow mb-4">
        <div class="card-body">
          <b>Table: ${o.table || "-"}</b><br>
          Order #${o.id}<br>
          ${new Date(o.time).toLocaleString()}<br><br>

          ${itemsHTML}<br><br>

          Total: ${o.total} Baht<br>
          <div class="mt-2 flex items-center gap-3">
            <span class="text-sm font-semibold">Status</span>
            <span class="px-3 py-1 rounded-full text-xs font-bold ${getOrderStatusClass(o.status)}">${String(o.status || "pending").toUpperCase()}</span>
          </div>
        </div>
      </div>
    `;
  });
}

function nextStatusById(orderId){
  let orders = JSON.parse(localStorage.getItem("orders")) || [];
  let idx = orders.findIndex(o => String(o.id) === String(orderId));
  if(idx === -1) return;

  if(orders[idx].status === "pending") orders[idx].status = "cooking";
  else if(orders[idx].status === "cooking") orders[idx].status = "done";

  localStorage.setItem("orders", JSON.stringify(orders));
  loadOrders();
}

function setOrderStatus(orderId, status){
  let orders = JSON.parse(localStorage.getItem("orders")) || [];
  let idx = orders.findIndex(o => String(o.id) === String(orderId));
  if(idx === -1) return;
  orders[idx].status = status;
  localStorage.setItem("orders", JSON.stringify(orders));
  loadOrders();
}

/* ================= PAYMENTS ================= */
function loadPayments(){
  let payments = JSON.parse(localStorage.getItem("payments")) || [];
  const sortedPayments = [...payments].sort((a,b)=> new Date(b.time || 0) - new Date(a.time || 0));
  let div = document.getElementById("payment");

  div.innerHTML = "<h2 class='text-2xl font-bold mt-6 mb-4'>Payments</h2>";

  sortedPayments.forEach(p=>{

    let itemsHTML = (p.items || []).map(i=>`
      - ${i.name} x${i.qty} (${i.price} Baht)
    `).join("<br>");

    div.innerHTML += `
      <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow mb-4">
        <div class="card-body">
          <b>Table: ${p.table || "-"}</b><br>
          Order #${p.orderId}<br><br>

          ${itemsHTML}<br><br>

          Total: ${p.amount} Baht<br>
          ${new Date(p.time).toLocaleString()}
        </div>
      </div>
    `;
  });
}

/* ================= REVIEWS ================= */
function loadReviews(){
  let reviews = JSON.parse(localStorage.getItem("reviews")) || [];
  let div = document.getElementById("reviews");

  const sortedReviews = reviews.sort((a,b)=> new Date(b.time || 0) - new Date(a.time || 0));
  const avg = sortedReviews.length
    ? (sortedReviews.reduce((s,r)=>s+Number(r.rating || 0),0)/sortedReviews.length).toFixed(1)
    : "0.0";
  const escapeText = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const formatReviewTime = (value) => {
    const d = new Date(value || 0);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  };

  if (!sortedReviews.length) {
    div.innerHTML = `
      <h2 class='text-2xl font-bold mt-6 mb-4'>Reviews</h2>
      <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow">
        <div class="card-body">
          <div class="text-sm text-[#a97a52]">Average Rating</div>
          <div class="text-2xl font-extrabold text-[#5f4028]">${avg}</div>
          <div class="text-sm text-[#a97a52] mt-2">No reviews yet</div>
        </div>
      </div>
    `;
    return;
  }

  div.innerHTML = `
    <h2 class='text-2xl font-bold mt-6 mb-4'>Reviews</h2>
    <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow mb-4">
      <div class="card-body">
        <div class="text-sm text-[#a97a52]">Average Rating</div>
        <div class="text-2xl font-extrabold text-[#5f4028]">${avg} / 5</div>
      </div>
    </div>
    ${sortedReviews.map((review) => `
      <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow mb-4">
        <div class="card-body">
          <div class="flex items-center justify-between gap-3">
            <div class="font-bold text-[#5f4028]">⭐ ${Number(review.rating || 0)} / 5</div>
            <div class="text-xs text-[#a97a52]">${formatReviewTime(review.time)}</div>
          </div>
          <div class="text-sm text-[#5f4028] mt-2">${escapeText(review.comment || "-")}</div>
          <div class="text-xs text-[#a97a52] mt-1">Table: ${escapeText(review.table || "-")}</div>
        </div>
      </div>
    `).join("")}
  `;
}

/* ================= DASHBOARD ================= */
function loadDashboard(){
  let orders = JSON.parse(localStorage.getItem("orders")) || [];
  let payments = JSON.parse(localStorage.getItem("payments")) || [];
  let reviews = JSON.parse(localStorage.getItem("reviews")) || [];

  const filteredOrders = orders.filter((o) => isInDashboardRange(o.time));
  const filteredPayments = payments.filter((p) => isInDashboardRange(p.time));
  const filteredReviews = reviews.filter((r) => isInDashboardRange(r.time));

  let totalPayment = filteredPayments.reduce((s,p)=>s+Number(p.amount || 0),0);
  let avgRating = filteredReviews.length 
    ? (filteredReviews.reduce((s,r)=>s+Number(r.rating || 0),0)/filteredReviews.length).toFixed(1)
    : 0;

  const servedOrders = filteredOrders.filter((o) => isServedOrderStatus(o.status));

  const customerSet = new Set();
  filteredOrders.forEach((o) => {
    const key = getRecordCustomerKey(o);
    if (key) customerSet.add(key);
  });
  filteredPayments.forEach((p) => {
    const key = getRecordCustomerKey(p);
    if (key) customerSet.add(key);
  });

  const menuCounts = {};
  servedOrders.forEach(o => {
    const items = Array.isArray(o.items) ? o.items : [];
    items.forEach(it => {
      if (!it || !it.name) return;
      menuCounts[it.name] = (menuCounts[it.name] || 0) + (it.qty || 0);
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

  let div = document.getElementById("dashboard");
  const hasFilter = Boolean(dashboardFilter.start || dashboardFilter.end);
  const rangeLabel = hasFilter
    ? `${dashboardFilter.start || "Any"} to ${dashboardFilter.end || "Any"}`
    : "All dates";

  div.innerHTML = `
    <h2 class='text-2xl font-bold mt-6 mb-4'>Dashboard</h2>
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
        <div class='mt-2 text-sm opacity-70'>Range: ${rangeLabel}</div>
      </div>
    </div>
    <div class='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
      <div class='card bg-[#fbf5ee] border border-[#e6d7c7] shadow'><div class='card-body'>Customers: ${customerSet.size}</div></div>
      <div class='card bg-[#fbf5ee] border border-[#e6d7c7] shadow'><div class='card-body'>Total Revenue: ${totalPayment} Baht</div></div>
      <div class='card bg-[#fbf5ee] border border-[#e6d7c7] shadow'><div class='card-body'>Average Rating: ${avgRating}</div></div>
      <div class='card bg-[#fbf5ee] border border-[#e6d7c7] shadow'><div class='card-body'>Top Menu Served: ${topMenu}${topMenuCount ? ` (${topMenuCount})` : ""}</div></div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  bindEnter(["adminUser", "adminPass"], login);
  bindEnter(["cookName", "cookId", "cookPass"], addCook);
  bindEnter(["editCookName", "editCookPass"], updateCook);
  bindEnter(["menuName", "menuPrice", "menuDesc"], addMenu);
  bindEnter(["editMenuName", "editMenuPrice", "editMenuDesc"], updateMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (!e.target || !e.target.id) return;
    if (e.target.id === "dashboardStartDate" || e.target.id === "dashboardEndDate") {
      e.preventDefault();
      applyDashboardDateFilter();
    }
  });

  const loginPage = document.getElementById("loginPage");
  const app = document.getElementById("app");
  const userType = localStorage.getItem("user_type");
  const adminLoggedIn = localStorage.getItem("admin_logged_in") === "true";

  if (userType === "cook") {
    window.location.href = "cook.html";
    return;
  }

  if (adminLoggedIn || userType === "admin") {
    loginPage.classList.add("hidden");
    app.classList.remove("hidden");
    loginPage.style.display = "none";
    app.style.display = "block";
    loadAll();
    applyInitialRoute();
  }
});
