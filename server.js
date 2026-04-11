const fs = require("fs");
const path = require("path");
require("dotenv").config();

function loadLegacyEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    let m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      const key = m[1];
      const value = String(m[2] || "").replace(/^['"]|['"]$/g, "");
      if (!(key in process.env)) process.env[key] = value;
      continue;
    }

    m = line.match(/^\$env:([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/i);
    if (m) {
      const key = m[1];
      const value = String(m[2] || "").replace(/^['"]|['"]$/g, "");
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

loadLegacyEnvFile();

const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");
const argon2 = require("argon2");
const multer = require("multer");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MENU_UPLOAD_DIR = path.join(__dirname, "public", "uploads", "menu");
const MENU_UPLOAD_URL_PREFIX = "/public/uploads/menu";
const MENU_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

fs.mkdirSync(MENU_UPLOAD_DIR, { recursive: true });

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "restaurant_system"
};
let activeDbConfig = { ...dbConfig };

let pool;

function setPool(nextPool) {
  pool = nextPool;
}

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toInt(value, fallback = 0) {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function toMysqlDate(value) {
  if (!value) return null;

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function normalizeCookStatus(value, fallback = "active") {
  const raw = String(value ?? "").trim().toLowerCase();
  if (["active", "enabled", "enable", "1", "true"].includes(raw)) return "active";
  if (["inactive", "disabled", "disable", "0", "false"].includes(raw)) return "inactive";
  return fallback;
}

function normalizeMenuAvailability(value, fallback = null) {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value ? 1 : 0;

  const raw = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "available", "enabled", "enable", "active"].includes(raw)) return 1;
  if (["0", "false", "no", "unavailable", "disabled", "disable", "inactive"].includes(raw)) return 0;
  return fallback;
}

function getTableStatusSet() {
  return new Set(["available", "occupied", "inactive", "maintenance"]);
}

function normalizeTableStatus(value, fallback = "available") {
  const raw = String(value ?? "").trim().toLowerCase();
  return getTableStatusSet().has(raw) ? raw : fallback;
}

function mapTableRow(row) {
  return {
    id: row.id,
    table_number: toInt(row.table_number, 0),
    tableNumber: toInt(row.table_number, 0),
    status: normalizeTableStatus(row.status, "available"),
    reservation_name: "",
    reservationName: "",
    reservation_time: "",
    reservationTime: "",
    updated_at: row.updated_at || null
  };
}

function isDefaultAdminCredential(username, password) {
  return toText(username).toLowerCase() === "admin" && String(password ?? "") === "0000";
}

function mapCookRow(row) {
  return {
    id: row.id,
    cook_id: row.cook_id,
    full_name: row.full_name,
    phone: row.phone,
    status: row.status,
    password_ready: Boolean(row.password_ready ?? row.password_hash),
    created_at: row.created_at
  };
}

function normalizeMenuOptionKeys(value) {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const parsed = safeJsonParse(trimmed, null);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => toText(item)).filter(Boolean);
    }
    return trimmed.split(",").map((item) => toText(item)).filter(Boolean);
  }

  return [];
}

function establishCookSession(req, cook) {
  req.session.user_type = "cook";
  req.session.cook_id = cook.cook_id;
  req.session.cook_name = cook.full_name;
  req.session.cook_db_id = cook.id;
}

function mapMenuRow(row) {
  const optionKeys = normalizeMenuOptionKeys(row.option_keys);
  return {
    id: row.id,
    name: row.name,
    thaiName: row.thai_name || row.name_th || "",
    price: toNumber(row.price, 0),
    category: row.category_code || row.category || "single",
    desc: row.description || "",
    optionKeys,
    hasOptions: optionKeys.length > 0,
    img: row.image_url || "",
    image: row.image_url || "",
    available: Boolean(row.is_available),
    created_at: row.created_at
  };
}

function ensureAdminSession(req, res) {
  const isAdminUserType = req.session?.user_type === "admin";
  const hasAdminSession = Boolean(req.session?.admin_logged_in);
  if (!isAdminUserType && !hasAdminSession) {
    res.status(401).json({ success: false, message: "Admin login required" });
    return false;
  }
  return true;
}

function requireAdminSession(req, res, next) {
  if (!ensureAdminSession(req, res)) return;
  next();
}

function hasPageRole(req, roles = []) {
  const userType = toText(req.session?.user_type).toLowerCase();
  const isAdmin = userType === "admin" || Boolean(req.session?.admin_logged_in);
  if (roles.includes("admin") && isAdmin) return true;
  return roles.includes(userType);
}

function guardPageRequests(req, res, next) {
  const pagePath = String(req.path || "").toLowerCase();
  const adminPages = new Set(["/admin", "/admin.html", "/inventory", "/views/admin.html"]);
  const cookPages = new Set(["/cook", "/cook.html", "/views/cook.html"]);
  const customerPages = new Set([
    "/customer",
    "/customer.html",
    "/menu",
    "/menu.html",
    "/shop",
    "/cart",
    "/cart.html",
    "/payment",
    "/payment.html",
    "/order-status",
    "/order_status.html",
    "/views/customer.html",
    "/views/menu.html",
    "/views/cart.html",
    "/views/payment.html",
    "/views/order_status.html"
  ]);

  if (adminPages.has(pagePath) && !hasPageRole(req, ["admin"])) {
    return res.redirect(302, "/staff.html");
  }

  if (cookPages.has(pagePath) && !hasPageRole(req, ["cook", "admin"])) {
    return res.redirect(302, "/staff.html");
  }

  if (customerPages.has(pagePath) && !hasPageRole(req, ["customer"])) {
    return res.redirect(302, "/index.html#customer");
  }

  return next();
}

function getSafeUploadBaseName(fileName) {
  const parsed = path.parse(String(fileName || "menu-image"));
  const base = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "menu-image";
}

const menuImageStorage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, MENU_UPLOAD_DIR);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${getSafeUploadBaseName(file.originalname)}${ext}`);
  }
});

const uploadMenuImage = multer({
  storage: menuImageStorage,
  limits: { fileSize: MENU_UPLOAD_MAX_BYTES },
  fileFilter: function (_req, file, cb) {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    if (!allowedTypes.has(String(file.mimetype || "").toLowerCase())) {
      cb(new Error("Only JPG, PNG, WEBP, or GIF image uploads are allowed"));
      return;
    }
    cb(null, true);
  }
});

function uploadMenuImageField(req, res, next) {
  uploadMenuImage.single("image")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "Menu image must be 5MB or smaller" });
    }

    return res.status(400).json({ success: false, message: err.message || "Unable to upload menu image" });
  });
}

function getUploadedMenuImageUrl(req) {
  if (!req.file?.filename) return "";
  return `${MENU_UPLOAD_URL_PREFIX}/${req.file.filename}`;
}

function removeUploadedMenuImage(req) {
  if (!req.file?.path) return;
  fs.unlink(req.file.path, () => {});
}

function normalizeSessionId(raw, tableNumber = 0) {
  const id = toText(raw);
  if (id) return id;
  return `GUEST_TABLE_${toInt(tableNumber, 0)}`;
}

function getCustomerSessionIdleMinutes() {
  return Math.max(1, toInt(process.env.CUSTOMER_SESSION_IDLE_MINUTES, 720));
}

async function touchCustomerSession(sessionId, tableNumber, executor = pool) {
  const resolvedSessionId = toText(sessionId);
  const resolvedTableNumber = toInt(tableNumber, 0);
  if (!resolvedSessionId || !resolvedTableNumber) return false;

  const [result] = await executor.query(
    `
      UPDATE customer_sessions
      SET last_activity = CURRENT_TIMESTAMP
      WHERE session_id = ?
        AND table_number = ?
        AND status = 'active'
    `,
    [resolvedSessionId, resolvedTableNumber]
  );

  return toInt(result?.affectedRows, 0) > 0;
}

async function cleanupStaleCustomerSessions(executor = pool, idleMinutes = getCustomerSessionIdleMinutes()) {
  const resolvedIdleMinutes = Math.max(1, toInt(idleMinutes, getCustomerSessionIdleMinutes()));
  await executor.query(
    `
      UPDATE customer_sessions
      SET status = 'inactive', last_activity = CURRENT_TIMESTAMP
      WHERE status = 'active'
        AND COALESCE(last_activity, login_time, CURRENT_TIMESTAMP) < (CURRENT_TIMESTAMP - INTERVAL ${resolvedIdleMinutes} MINUTE)
    `
  );
}

async function syncTableStatusesFromCustomerSessions(executor = pool, options = {}) {
  const idleMinutes = Math.max(1, toInt(options.idleMinutes, getCustomerSessionIdleMinutes()));
  if (!options.skipCleanup) {
    await cleanupStaleCustomerSessions(executor, idleMinutes);
  }

  await executor.query(
    `
      INSERT INTO tables (table_number, status)
      SELECT DISTINCT cs.table_number, 'available'
      FROM customer_sessions cs
      LEFT JOIN tables t ON t.table_number = cs.table_number
      WHERE cs.status = 'active'
        AND cs.table_number IS NOT NULL
        AND cs.table_number > 0
        AND t.id IS NULL
    `
  );

  const [activeRows] = await executor.query(
    `
      SELECT DISTINCT table_number
      FROM customer_sessions
      WHERE status = 'active'
        AND table_number IS NOT NULL
        AND table_number > 0
    `
  );

  const activeTableNumbers = activeRows
    .map((row) => toInt(row.table_number, 0))
    .filter(Boolean);

  if (activeTableNumbers.length > 0) {
    await executor.query(
      `
        UPDATE tables
        SET status = 'occupied'
        WHERE table_number IN (?)
          AND status IN ('available', 'occupied')
      `,
      [activeTableNumbers]
    );

    await executor.query(
      `
        UPDATE tables
        SET status = 'available'
        WHERE status = 'occupied'
          AND table_number NOT IN (?)
      `,
      [activeTableNumbers]
    );
  } else {
    await executor.query(
      `
        UPDATE tables
        SET status = 'available'
        WHERE status = 'occupied'
      `
    );
  }
}

async function getCustomerContext(req) {
  if (req.session?.user_type === "customer") {
    const sessionId = normalizeSessionId(req.session?.session_id, req.session?.table_number);
    const tableNumber = toInt(req.session?.table_number, 0);
    if (!sessionId || !tableNumber) return null;

    const isActive = await touchCustomerSession(sessionId, tableNumber);
    if (!isActive) return null;

    return {
      sessionId,
      tableNumber
    };
  }

  const tableNumber = toInt(req.get("x-customer-table-number"), 0);
  const sessionId = normalizeSessionId(req.get("x-customer-session-id"), tableNumber);
  if (!tableNumber || !sessionId) return null;

  const [rows] = await pool.query(
    `
      SELECT session_id, table_number
      FROM customer_sessions
      WHERE session_id = ?
        AND table_number = ?
        AND status = 'active'
      LIMIT 1
    `,
    [sessionId, tableNumber]
  );
  if (rows.length === 0) return null;

  const dbSessionId = normalizeSessionId(rows[0].session_id, rows[0].table_number);
  const dbTableNumber = toInt(rows[0].table_number, 0);
  const isActive = await touchCustomerSession(dbSessionId, dbTableNumber);
  if (!isActive) return null;

  return {
    sessionId: dbSessionId,
    tableNumber: dbTableNumber
  };
}

function getOrderStatusSet() {
  return new Set(["pending", "cooking", "serving", "completed", "cancelled"]);
}

function normalizeOrderStatus(value, fallback = "pending") {
  const raw = String(value ?? "").trim().toLowerCase();
  return getOrderStatusSet().has(raw) ? raw : fallback;
}

function normalizeOrderItemStatus(value, fallback = "pending") {
  return normalizeOrderStatus(value, fallback);
}

async function ensureTableRecord(executor, tableNumber) {
  const normalizedTableNumber = toInt(tableNumber, 0);
  if (!normalizedTableNumber) return null;

  await executor.query(
    `
      INSERT INTO tables (table_number, status)
      VALUES (?, 'available')
      ON DUPLICATE KEY UPDATE
        table_number = VALUES(table_number)
    `,
    [normalizedTableNumber]
  );

  const [rows] = await executor.query("SELECT * FROM tables WHERE table_number = ? LIMIT 1", [normalizedTableNumber]);
  return rows[0] || null;
}

async function updateTableStatus(executor, tableNumber, nextStatus) {
  const normalizedTableNumber = toInt(tableNumber, 0);
  if (!normalizedTableNumber) return null;

  await ensureTableRecord(executor, normalizedTableNumber);

  const status = normalizeTableStatus(nextStatus, "available");
  await executor.query("UPDATE tables SET status = ? WHERE table_number = ?", [status, normalizedTableNumber]);

  const [rows] = await executor.query("SELECT * FROM tables WHERE table_number = ? LIMIT 1", [normalizedTableNumber]);
  return rows[0] || null;
}

async function getOrCreateCustomerContext(req, options = {}) {
  const existing = await getCustomerContext(req);
  if (existing || !options.allowCreateFromBody) {
    return existing;
  }

  const fallbackTableNumber = toInt(req.body?.table_number ?? req.query?.table_number, 0);
  if (!fallbackTableNumber) {
    return null;
  }

  const requestedSessionId = normalizeSessionId(
    req.body?.session_id ?? req.get("x-customer-session-id"),
    fallbackTableNumber
  );

  let sessionId = "";
  if (requestedSessionId && await canReuseCustomerSession(requestedSessionId, fallbackTableNumber)) {
    sessionId = requestedSessionId;
  } else {
    sessionId = await findReusableCustomerSession(fallbackTableNumber);
  }

  if (!sessionId) {
    sessionId = `CUST_${Math.floor(Date.now() / 1000)}_${Math.floor(1000 + Math.random() * 9000)}`;
  }

  await upsertCustomerSession(pool, sessionId, fallbackTableNumber);
  await syncTableStatusesFromCustomerSessions(pool);

  req.session.user_type = "customer";
  req.session.session_id = sessionId;
  req.session.table_number = fallbackTableNumber;

  return {
    sessionId,
    tableNumber: fallbackTableNumber,
    createdFromBody: true
  };
}

async function resolveIncomingOrderItem(item) {
  const quantity = Math.max(1, toInt(item?.quantity ?? item?.qty, 1));
  const explicitName = toText(item?.name ?? item?.item_name);
  const hasExplicitPrice = item?.price !== undefined || item?.unit_price !== undefined;
  const explicitPrice = hasExplicitPrice ? Math.max(0, toNumber(item?.price ?? item?.unit_price, 0)) : null;
  const menuId = await resolveMenuIdByItem(item);

  let itemName = explicitName;
  let unitPrice = explicitPrice;

  if (menuId && (!itemName || unitPrice === null)) {
    const [menuRows] = await pool.query("SELECT name, price FROM menu WHERE id = ? LIMIT 1", [menuId]);
    const menu = menuRows[0];
    if (menu) {
      if (!itemName) itemName = toText(menu.name);
      if (unitPrice === null) unitPrice = Math.max(0, toNumber(menu.price, 0));
    }
  }

  if (!itemName) {
    return { error: "Each order item must include a name or valid menu_id." };
  }

  return {
    menuId,
    itemName,
    quantity,
    unitPrice: unitPrice === null ? 0 : unitPrice,
    subtotal: (unitPrice === null ? 0 : unitPrice) * quantity,
    notes: [toText(item?.optionsText), toText(item?.customerNote), toText(item?.notes)]
      .filter(Boolean)
      .join(" | ")
  };
}

async function resolveMenuIdByItem(item) {
  const directMenuId = toInt(item?.menuId ?? item?.menu_id, 0);
  if (directMenuId) return directMenuId;

  const itemName = toText(item?.name ?? item?.item_name);
  if (!itemName) return null;

  const [rows] = await pool.query(
    "SELECT id FROM menu WHERE LOWER(name) = LOWER(?) OR LOWER(COALESCE(thai_name, '')) = LOWER(?) LIMIT 1",
    [itemName, itemName]
  );
  return rows[0]?.id || null;
}

function mapOrderItemRow(item) {
  const orderItemId = toInt(item?.order_item_id ?? item?.id, 0);
  const qty = toInt(item?.quantity, toInt(item?.qty, 1));
  const price = toNumber(item?.unit_price ?? item?.price, 0);
  const tableNumber = toInt(item?.table_number ?? item?.tableNumber, 0) || null;
  return {
    id: orderItemId,
    order_item_id: orderItemId,
    item_id: orderItemId,
    order_id: item.order_id,
    table_number: tableNumber,
    table: tableNumber,
    menu_id: item.menu_id ?? null,
    cook_id: item.cook_id || "",
    cookId: item.cook_id || "",
    name: toText(item.item_name ?? item.name, "Unknown Item"),
    qty,
    quantity: qty,
    price,
    unit_price: price,
    subtotal: toNumber(item.subtotal, price * qty),
    notes: toText(item.notes),
    status: normalizeOrderItemStatus(item.status, "pending"),
    started_at: item.started_at || null,
    completed_at: item.completed_at || null
  };
}

function mapOrderRow(order, items = []) {
  const mappedItems = items.map(mapOrderItemRow);
  const computedTotal = mappedItems.length
    ? mappedItems
      .filter((item) => item.status !== "cancelled")
      .reduce((sum, item) => sum + toNumber(item.subtotal, toNumber(item.unit_price, 0) * toInt(item.quantity, 0)), 0)
    : toNumber(order.total_amount, 0);
  return {
    ...order,
    table: order.table_number,
    userId: order.session_id,
    total_amount: computedTotal,
    total: computedTotal,
    time: order.created_at,
    cookId: order.cook_id || "",
    items: mappedItems
  };
}

function computeOrderRollup(items = [], fallbackStatus = "pending") {
  const normalizedItems = items.map(mapOrderItemRow);
  const activeItems = normalizedItems.filter((item) => item.status !== "cancelled");
  const distinctCookIds = [...new Set(normalizedItems.map((item) => toText(item.cook_id ?? item.cookId)).filter(Boolean))];
  const everyActiveItemAssigned = activeItems.every((item) => toText(item.cook_id ?? item.cookId));

  let status = normalizeOrderStatus(fallbackStatus, "pending");
  let completedAt = null;

  if (normalizedItems.length > 0) {
    if (activeItems.length === 0) {
      status = "cancelled";
    } else if (activeItems.every((item) => item.status === "completed")) {
      status = "completed";
      const completionTimes = activeItems
        .map((item) => toMysqlDate(item.completed_at))
        .filter(Boolean)
        .sort();
      completedAt = completionTimes[completionTimes.length - 1] || toMysqlDate(new Date());
    } else if (activeItems.every((item) => ["serving", "completed"].includes(item.status))) {
      status = "completed";
      const completionTimes = activeItems
        .map((item) => toMysqlDate(item.completed_at))
        .filter(Boolean)
        .sort();
      completedAt = completionTimes[completionTimes.length - 1] || toMysqlDate(new Date());
    } else if (activeItems.some((item) => ["cooking", "serving", "completed"].includes(item.status))) {
      status = "cooking";
    } else {
      status = "pending";
    }
  }

  return {
    status,
    cookId: everyActiveItemAssigned && distinctCookIds.length === 1 ? distinctCookIds[0] : null,
    completedAt
  };
}

async function refreshOrderSummary(orderId, executor = pool) {
  const normalizedOrderId = toInt(orderId, 0);
  if (!normalizedOrderId) return null;

  const [itemRows] = await executor.query("SELECT * FROM order_items WHERE order_id = ? ORDER BY order_item_id ASC", [normalizedOrderId]);
  const [orderRows] = await executor.query("SELECT * FROM orders WHERE id = ? LIMIT 1", [normalizedOrderId]);
  const existingOrder = orderRows[0];
  if (!existingOrder) return null;

  const rollup = computeOrderRollup(itemRows, existingOrder.status);
  const mappedItems = itemRows.map(mapOrderItemRow);
  const computedTotal = mappedItems.length
    ? mappedItems
      .filter((item) => item.status !== "cancelled")
      .reduce((sum, item) => sum + toNumber(item.subtotal, toNumber(item.unit_price, 0) * toInt(item.quantity, 0)), 0)
    : toNumber(existingOrder.total_amount, 0);
  await executor.query(
    "UPDATE orders SET cook_id = ?, status = ?, completed_at = ?, total_amount = ? WHERE id = ?",
    [rollup.cookId, rollup.status, rollup.completedAt, computedTotal, normalizedOrderId]
  );

  const [updatedOrderRows] = await executor.query("SELECT * FROM orders WHERE id = ? LIMIT 1", [normalizedOrderId]);
  return updatedOrderRows[0] ? mapOrderRow(updatedOrderRows[0], itemRows) : null;
}

function hasStaffOrderAccess(req) {
  const userType = String(req.session?.user_type || "").toLowerCase();
  return userType === "admin" || userType === "cook";
}

function mapPaymentRow(row, extras = {}) {
  const orderIds = Array.isArray(extras.orderIds)
    ? extras.orderIds.map((id) => toInt(id, 0)).filter(Boolean)
    : [];
  const mappedItems = Array.isArray(extras.items)
    ? extras.items.map((item) => ({
      order_id: toInt(item?.order_id ?? item?.orderId, 0) || null,
      orderId: toInt(item?.order_id ?? item?.orderId, 0) || null,
      name: toText(item?.name ?? item?.item_name, "Unknown Item"),
      qty: toInt(item?.quantity ?? item?.qty, 0),
      quantity: toInt(item?.quantity ?? item?.qty, 0),
      price: toNumber(item?.unit_price ?? item?.price, 0),
      unit_price: toNumber(item?.unit_price ?? item?.price, 0)
    }))
    : [];

  return {
    id: row.id,
    payment_reference: row.payment_reference,
    paymentReference: row.payment_reference,
    order_id: toInt(extras.order_id, 0) || (orderIds.length === 1 ? orderIds[0] : null),
    orderId: toInt(extras.order_id, 0) || (orderIds.length === 1 ? orderIds[0] : null),
    order_ids: orderIds,
    orderIds,
    session_id: row.session_id,
    userId: row.session_id,
    table_number: row.table_number,
    table: row.table_number,
    amount: toNumber(row.amount, 0),
    method: row.method,
    status: row.status,
    items: mappedItems,
    reviewSubmitted: Boolean(row.review_submitted_at),
    created_at: row.created_at,
    time: row.created_at,
    review_submitted_at: row.review_submitted_at,
    reviewSubmittedAt: row.review_submitted_at
  };
}

async function hydratePaymentsWithOrderDetails(paymentRows, executor = pool) {
  if (!Array.isArray(paymentRows) || paymentRows.length === 0) return [];

  const paymentIds = paymentRows.map((row) => toInt(row?.id, 0)).filter(Boolean);
  if (!paymentIds.length) return paymentRows.map((row) => mapPaymentRow(row));

  const [orderRows] = await executor.query(
    `
      SELECT id, payment_id
      FROM orders
      WHERE payment_id IN (?)
      ORDER BY created_at DESC, id DESC
    `,
    [paymentIds]
  );

  const orderIds = orderRows.map((row) => toInt(row.id, 0)).filter(Boolean);
  const [itemRows] = orderIds.length
    ? await executor.query(
      `
        SELECT order_id, item_name, quantity, unit_price
        FROM order_items
        WHERE order_id IN (?)
          AND LOWER(COALESCE(status, 'pending')) NOT IN ('cancelled', 'canceled')
        ORDER BY order_id ASC, order_item_id ASC
      `,
      [orderIds]
    )
    : [[]];

  const ordersByPaymentId = new Map();
  for (const order of orderRows) {
    const paymentId = toInt(order.payment_id, 0);
    if (!paymentId) continue;
    if (!ordersByPaymentId.has(paymentId)) {
      ordersByPaymentId.set(paymentId, []);
    }
    ordersByPaymentId.get(paymentId).push(order);
  }

  const itemsByOrderId = new Map();
  for (const item of itemRows) {
    const orderId = toInt(item.order_id, 0);
    if (!orderId) continue;
    if (!itemsByOrderId.has(orderId)) {
      itemsByOrderId.set(orderId, []);
    }
    itemsByOrderId.get(orderId).push(item);
  }

  return paymentRows.map((payment) => {
    const paymentId = toInt(payment?.id, 0);
    const linkedOrders = ordersByPaymentId.get(paymentId) || [];
    const linkedOrderIds = linkedOrders.map((order) => toInt(order.id, 0)).filter(Boolean);
    const linkedItems = linkedOrders.flatMap((order) => {
      const orderId = toInt(order.id, 0);
      const orderItems = itemsByOrderId.get(orderId) || [];
      return orderItems.map((item) => ({
        order_id: orderId,
        orderId,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price
      }));
    });

    return mapPaymentRow(payment, {
      order_id: linkedOrderIds.length === 1 ? linkedOrderIds[0] : null,
      orderIds: linkedOrderIds,
      items: linkedItems
    });
  });
}

function mapReviewRow(row) {
  return {
    id: row.id,
    payment_id: row.payment_id,
    paymentId: row.payment_id,
    session_id: row.session_id,
    userId: row.session_id,
    table_number: row.table_number,
    table: row.table_number,
    rating: toInt(row.rating, 0),
    comment: row.comment || "",
    created_at: row.created_at,
    updated_at: row.updated_at,
    time: row.created_at
  };
}

async function ensureDatabase() {
  const bootstrap = await mysql.createConnection({
    host: activeDbConfig.host,
    port: activeDbConfig.port,
    user: activeDbConfig.user,
    password: activeDbConfig.password
  });

  await bootstrap.query(
    `CREATE DATABASE IF NOT EXISTS \`${activeDbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`
  );
  await bootstrap.end();
}

async function resolveDatabaseConfig() {
  const candidates = [{ ...dbConfig }];
  if (dbConfig.user === "root" && !dbConfig.password) {
    candidates.push({ ...dbConfig, password: "root" });
  }

  let lastError = null;
  for (const candidate of candidates) {
    try {
      const conn = await mysql.createConnection({
        host: candidate.host,
        port: candidate.port,
        user: candidate.user,
        password: candidate.password
      });
      await conn.query("SELECT 1");
      await conn.end();
      activeDbConfig = candidate;
      return;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Unable to connect to MySQL");
}

const defaultMenuSeed = [
  {
    name: "Basil Fried Rice",
    thai_name: "ข้าวผัดกะเพรา",
    category_code: "single",
    price: 65,
    description: "Crispy chicken basil rice with fried egg",
    option_keys: ["spice"],
    image_url: "../media/basilfriedrice.jpg",
    sort_order: 1
  },
  {
    name: "Tom Yum Goong",
    thai_name: "ต้มยำกุ้ง",
    category_code: "tomyum",
    price: 120,
    description: "Clear spicy shrimp tom yum soup",
    option_keys: ["spice"],
    image_url: "../media/tomyumkung.jpg",
    sort_order: 2
  },
  {
    name: "Pad Thai",
    thai_name: "ผัดไทย",
    category_code: "single",
    price: 70,
    description: "Thai stir-fried noodles with shrimp",
    option_keys: ["spice"],
    image_url: "../media/padthai.jpg",
    sort_order: 3
  },
  {
    name: "Hainanese Chicken Rice",
    thai_name: "ข้าวมันไก่",
    category_code: "single",
    price: 60,
    description: "Steamed chicken rice with special sauce",
    option_keys: [],
    image_url: "../media/hainanesechickenrice.jpg",
    sort_order: 4
  },
  {
    name: "Som Tam Thai",
    thai_name: "ส้มตำไทย",
    category_code: "salad",
    price: 55,
    description: "Spicy green papaya salad",
    option_keys: ["spice"],
    image_url: "../media/somtamthai.jpg",
    sort_order: 5
  },
  {
    name: "Korean BBQ Beef",
    thai_name: "เนื้อย่างเกาหลี",
    category_code: "main",
    price: 180,
    description: "Korean-style marinated grilled beef",
    option_keys: ["doneness"],
    image_url: "../media/koreanbbq.jpg",
    sort_order: 6
  },
  {
    name: "Beef Basil",
    thai_name: "กะเพราเนื้อ",
    category_code: "single",
    price: 85,
    description: "Minced beef basil with fried egg",
    option_keys: ["spice"],
    image_url: "../media/beefbasil.jpg",
    sort_order: 7
  },
  {
    name: "Lime Juice",
    thai_name: "น้ำมะนาว",
    category_code: "drink",
    price: 25,
    description: "Fresh lime juice",
    option_keys: ["sweet", "ice"],
    image_url: "../media/limejuice.jpg",
    sort_order: 8
  },
  {
    name: "Green Tea",
    thai_name: "ชาเขียว",
    category_code: "drink",
    price: 30,
    description: "Iced green tea",
    option_keys: ["sweet", "ice"],
    image_url: "../media/greentea.jpg",
    sort_order: 9
  },
  {
    name: "Ice Cream",
    thai_name: "ไอศครีม",
    category_code: "dessert",
    price: 35,
    description: "Vanilla ice cream",
    option_keys: ["size"],
    image_url: "../media/Icecream.jpg",
    sort_order: 10
  },
  {
    name: "Crispy Pork Basil",
    thai_name: "กะเพราหมูกรอบ",
    category_code: "single",
    price: 70,
    description: "Crispy pork basil rice",
    option_keys: ["spice"],
    image_url: "../media/crispyporkbasil.jpg",
    sort_order: 11
  },
  {
    name: "Seafood Tom Yum",
    thai_name: "ต้มยำทะเล",
    category_code: "tomyum",
    price: 150,
    description: "Mixed seafood tom yum soup",
    option_keys: ["spice"],
    image_url: "../media/seafoodtomyum.jpg",
    sort_order: 12
  },
  {
    name: "Soda",
    thai_name: "น้ำอัดลม",
    category_code: "drink",
    price: 20,
    description: "Soda, Coke, Sprite",
    option_keys: ["sweet", "ice"],
    image_url: "../media/soda.jpg",
    sort_order: 13
  }
];

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cooks (
      id INT PRIMARY KEY AUTO_INCREMENT,
      cook_id VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) DEFAULT NULL,
      full_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) DEFAULT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      name_th VARCHAR(100) DEFAULT NULL,
      thai_name VARCHAR(100) DEFAULT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'single',
      category_code VARCHAR(50) DEFAULT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      description TEXT DEFAULT NULL,
      option_keys TEXT DEFAULT NULL,
      image_url LONGTEXT DEFAULT NULL,
      is_available TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_sessions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      session_id VARCHAR(100) NOT NULL,
      table_number INT NOT NULL,
      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      UNIQUE KEY uq_customer_session_id (session_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tables (
      id INT PRIMARY KEY AUTO_INCREMENT,
      table_number INT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_tables_table_number (table_number)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_number VARCHAR(30) NOT NULL,
      session_id VARCHAR(100) DEFAULT NULL,
      table_number INT DEFAULT NULL,
      cook_id VARCHAR(50) DEFAULT NULL,
      total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      notes TEXT DEFAULT NULL,
      payment_id INT DEFAULT NULL,
      payment_status VARCHAR(20) DEFAULT NULL,
      payment_method VARCHAR(50) DEFAULT NULL,
      paid_at TIMESTAMP NULL DEFAULT NULL,
      review_submitted_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL DEFAULT NULL,
      UNIQUE KEY uq_order_number (order_number)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      order_item_id INT PRIMARY KEY AUTO_INCREMENT,
      order_id INT NOT NULL,
      table_number INT DEFAULT NULL,
      menu_id INT DEFAULT NULL,
      cook_id VARCHAR(50) DEFAULT NULL,
      item_name VARCHAR(150) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      notes TEXT DEFAULT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      started_at TIMESTAMP NULL DEFAULT NULL,
      completed_at TIMESTAMP NULL DEFAULT NULL,
      INDEX idx_order_items_order_id (order_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      payment_reference VARCHAR(30) NOT NULL,
      session_id VARCHAR(100) DEFAULT NULL,
      table_number INT DEFAULT NULL,
      amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      method VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'paid',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      review_submitted_at TIMESTAMP NULL DEFAULT NULL,
      UNIQUE KEY uq_payment_reference (payment_reference)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INT PRIMARY KEY AUTO_INCREMENT,
      payment_id INT NOT NULL,
      session_id VARCHAR(100) DEFAULT NULL,
      table_number INT DEFAULT NULL,
      rating INT NOT NULL DEFAULT 0,
      comment TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const [adminCounts] = await pool.query("SELECT COUNT(*) AS total FROM admin");
  if (toInt(adminCounts[0]?.total, 0) === 0) {
    const adminHash = await hashPassword("0000");
    await pool.query(
      "INSERT INTO admin (username, password_hash, created_at) VALUES (?, ?, NOW())",
      ["admin", adminHash]
    );
  }

  const [menuCounts] = await pool.query("SELECT COUNT(*) AS total FROM menu");
  if (toInt(menuCounts[0]?.total, 0) === 0) {
    for (const item of defaultMenuSeed) {
      await pool.query(
        `
          INSERT INTO menu (
            name, name_th, thai_name, category, category_code, price,
            description, option_keys, image_url, is_available, sort_order, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())
        `,
        [
          item.name,
          item.thai_name,
          item.thai_name,
          item.category_code,
          item.category_code,
          toNumber(item.price, 0),
          item.description,
          JSON.stringify(item.option_keys || []),
          item.image_url,
          toInt(item.sort_order, 0)
        ]
      );
    }
  }

  const [tableCounts] = await pool.query("SELECT COUNT(*) AS total FROM tables");
  if (toInt(tableCounts[0]?.total, 0) === 0) {
    for (let tableNumber = 1; tableNumber <= 10; tableNumber += 1) {
      await pool.query(
        "INSERT INTO tables (table_number, status) VALUES (?, 'available')",
        [tableNumber]
      );
    }
  }

  await pool.query(
    `
      UPDATE tables
      SET status = 'available'
      WHERE LOWER(COALESCE(status, 'available')) = 'inactive'
    `
  );

  await pool.query(
    `
      UPDATE tables
      SET status = 'available'
      WHERE LOWER(COALESCE(status, 'available')) = 'reserved'
    `
  );

  await ensureOrderItemsPrimaryIdColumn();
  await ensureColumnExists("order_items", "table_number", "ALTER TABLE order_items ADD COLUMN table_number INT DEFAULT NULL AFTER order_id");
  await ensureColumnExists("order_items", "cook_id", "ALTER TABLE order_items ADD COLUMN cook_id VARCHAR(50) DEFAULT NULL AFTER menu_id");
  await ensureColumnExists("order_items", "status", "ALTER TABLE order_items ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'pending' AFTER notes");
  await ensureColumnExists("order_items", "started_at", "ALTER TABLE order_items ADD COLUMN started_at TIMESTAMP NULL DEFAULT NULL AFTER status");
  await ensureColumnExists("order_items", "completed_at", "ALTER TABLE order_items ADD COLUMN completed_at TIMESTAMP NULL DEFAULT NULL AFTER started_at");
  await pool.query("ALTER TABLE cooks MODIFY COLUMN password_hash VARCHAR(255) NULL");

  await pool.query(`
    UPDATE order_items oi
    INNER JOIN orders o ON o.id = oi.order_id
    SET
      oi.table_number = COALESCE(oi.table_number, o.table_number),
      oi.cook_id = COALESCE(oi.cook_id, o.cook_id),
      oi.status = CASE
        WHEN oi.status IS NULL OR oi.status = '' THEN COALESCE(NULLIF(o.status, ''), 'pending')
        ELSE oi.status
      END,
      oi.completed_at = COALESCE(oi.completed_at, o.completed_at)
    WHERE
      (oi.table_number IS NULL AND o.table_number IS NOT NULL)
      OR
      (oi.cook_id IS NULL AND o.cook_id IS NOT NULL)
      OR (oi.status IS NULL OR oi.status = '')
      OR (oi.status = 'pending' AND COALESCE(o.status, 'pending') <> 'pending')
      OR (oi.completed_at IS NULL AND o.completed_at IS NOT NULL)
  `);

  // Repair historical rows so per-item timestamps match the newer item-status flow.
  await pool.query(`
    UPDATE order_items oi
    INNER JOIN orders o ON o.id = oi.order_id
    SET
      oi.started_at = CASE
        WHEN oi.started_at IS NULL AND oi.status IN ('cooking', 'serving', 'completed')
          THEN COALESCE(o.updated_at, o.created_at)
        ELSE oi.started_at
      END,
      oi.completed_at = CASE
        WHEN oi.completed_at IS NULL AND oi.status IN ('serving', 'completed')
          THEN COALESCE(o.completed_at, o.updated_at, o.created_at)
        ELSE oi.completed_at
      END
    WHERE
      (oi.started_at IS NULL AND oi.status IN ('cooking', 'serving', 'completed'))
      OR (oi.completed_at IS NULL AND oi.status IN ('serving', 'completed'))
  `);
}

async function ensureColumnExists(tableName, columnName, alterSql) {
  const [rows] = await pool.query(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [activeDbConfig.database, tableName, columnName]
  );
  if (rows.length === 0) {
    await pool.query(alterSql);
  }
}

async function ensureOrderItemsPrimaryIdColumn() {
  const [rows] = await pool.query(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'order_items' AND COLUMN_NAME IN ('id', 'order_item_id')
    `,
    [activeDbConfig.database]
  );

  const columnNames = new Set(rows.map((row) => String(row.COLUMN_NAME || "").toLowerCase()));
  if (columnNames.has("order_item_id")) return;

  if (columnNames.has("id")) {
    await pool.query("ALTER TABLE order_items CHANGE COLUMN id order_item_id INT NOT NULL AUTO_INCREMENT");
  }
}

async function hashPassword(password) {
  return argon2.hash(password, { type: argon2.argon2id });
}

async function verifyPassword(password, hash) {
  if (!hash) return false;

  if (String(hash).startsWith("$argon2")) {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  return false;
}

async function upsertCustomerSession(conn, sessionId, tableNumber) {
  const resolvedSessionId = toText(sessionId);
  const resolvedTableNumber = toInt(tableNumber, 0);
  if (!resolvedSessionId || !resolvedTableNumber) return;

  await conn.query(
    `
      INSERT INTO customer_sessions (session_id, table_number, status)
      VALUES (?, ?, 'active')
      ON DUPLICATE KEY UPDATE
        table_number = VALUES(table_number),
        status = 'active',
        last_activity = CURRENT_TIMESTAMP
    `,
    [resolvedSessionId, resolvedTableNumber]
  );

  await conn.query(
    `
      UPDATE customer_sessions
      SET status = 'inactive', last_activity = CURRENT_TIMESTAMP
      WHERE table_number = ?
        AND session_id <> ?
        AND status = 'active'
    `,
    [resolvedTableNumber, resolvedSessionId]
  );
}

async function ensureHistoricalCustomerSession(conn, sessionId, tableNumber) {
  const resolvedSessionId = toText(sessionId);
  const resolvedTableNumber = toInt(tableNumber, 0);
  if (!resolvedSessionId || !resolvedTableNumber) return;

  await conn.query(
    `
      UPDATE customer_sessions
      SET
        table_number = ?,
        last_activity = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `,
    [resolvedTableNumber, resolvedSessionId]
  );
}

async function findReusableCustomerSession(tableNumber) {
  const resolvedTable = toInt(tableNumber, 0);
  if (!resolvedTable) return null;

  const [rows] = await pool.query(
    `
      SELECT cs.session_id
      FROM customer_sessions cs
      WHERE cs.table_number = ?
        AND cs.status = 'active'
        AND (
          EXISTS (
            SELECT 1
            FROM orders o
            WHERE o.session_id = cs.session_id
              AND o.table_number = cs.table_number
              AND LOWER(COALESCE(o.status, 'pending')) NOT IN ('cancelled', 'canceled')
              AND (
                o.payment_id IS NULL
                OR COALESCE(o.payment_status, '') <> 'paid'
              )
          )
          OR EXISTS (
            SELECT 1
            FROM payments p
            WHERE p.session_id = cs.session_id
              AND LOWER(COALESCE(p.status, 'paid')) = 'paid'
              AND p.review_submitted_at IS NULL
          )
        )
      ORDER BY cs.last_activity DESC, cs.id DESC
      LIMIT 1
    `,
    [resolvedTable]
  );

  return rows[0]?.session_id ? String(rows[0].session_id) : "";
}

async function canReuseCustomerSession(sessionId, tableNumber) {
  const resolvedSessionId = toText(sessionId);
  const resolvedTable = toInt(tableNumber, 0);
  if (!resolvedSessionId || !resolvedTable) return false;

  const [rows] = await pool.query(
    `
      SELECT cs.session_id
      FROM customer_sessions cs
      WHERE cs.session_id = ?
        AND cs.table_number = ?
        AND cs.status = 'active'
        AND (
          EXISTS (
            SELECT 1
            FROM orders o
            WHERE o.session_id = cs.session_id
              AND o.table_number = cs.table_number
              AND LOWER(COALESCE(o.status, 'pending')) NOT IN ('cancelled', 'canceled')
              AND (
                o.payment_id IS NULL
                OR COALESCE(o.payment_status, '') <> 'paid'
              )
          )
          OR EXISTS (
            SELECT 1
            FROM payments p
            WHERE p.session_id = cs.session_id
              AND LOWER(COALESCE(p.status, 'paid')) = 'paid'
              AND p.review_submitted_at IS NULL
          )
        )
      LIMIT 1
    `,
    [resolvedSessionId, resolvedTable]
  );

  return rows.length > 0;
}

async function getCustomerOrderingState(sessionId, executor = pool) {
  const resolvedSessionId = toText(sessionId);
  if (!resolvedSessionId) {
    return {
      orderingAllowed: false,
      pendingReview: false,
      pendingReviewPaymentId: null,
      lockedAfterReview: false
    };
  }

  const [pendingPayments] = await executor.query(
    `
      SELECT id
      FROM payments
      WHERE session_id = ?
        AND LOWER(COALESCE(status, 'paid')) = 'paid'
        AND review_submitted_at IS NULL
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [resolvedSessionId]
  );

  const [submittedReviews] = await executor.query(
    `
      SELECT id
      FROM reviews
      WHERE session_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [resolvedSessionId]
  );

  const pendingReviewPaymentId = toInt(pendingPayments[0]?.id, 0) || null;
  const pendingReview = Boolean(pendingReviewPaymentId);
  const lockedAfterReview = !pendingReview && submittedReviews.length > 0;

  return {
    orderingAllowed: !pendingReview && !lockedAfterReview,
    pendingReview,
    pendingReviewPaymentId,
    lockedAfterReview
  };
}

function getOrderingBlockedMessage(orderingState) {
  if (orderingState?.pendingReview) {
    return "Please submit the review for the latest payment before placing another order.";
  }
  if (orderingState?.lockedAfterReview) {
    return "This customer session is closed after payment and review.";
  }
  return "Ordering is not available for this session.";
}

async function buildCustomerStateResponse(customer, executor = pool) {
  const orderingState = await getCustomerOrderingState(customer.sessionId, executor);
  return {
    success: true,
    session_id: customer.sessionId,
    table_number: customer.tableNumber,
    ordering_allowed: orderingState.orderingAllowed,
    pending_review: orderingState.pendingReview,
    pending_review_payment_id: orderingState.pendingReviewPaymentId,
    locked_after_review: orderingState.lockedAfterReview
  };
}

async function markCustomerSessionInactiveIfFinished(sessionId) {
  const resolvedSessionId = toText(sessionId);
  if (!resolvedSessionId) return;

  // Keep the session active until explicit logout.
  const [sessionRows] = await pool.query(
    "SELECT table_number FROM customer_sessions WHERE session_id = ? LIMIT 1",
    [resolvedSessionId]
  );
  const tableNumber = toInt(sessionRows[0]?.table_number, 0);
  if (tableNumber) {
    await touchCustomerSession(resolvedSessionId, tableNumber);
  }
  await syncTableStatusesFromCustomerSessions(pool, { skipCleanup: true });
}

async function markCustomerSessionInactive(sessionId) {
  const resolvedSessionId = toText(sessionId);
  if (!resolvedSessionId) return;

  await pool.query(
    "UPDATE customer_sessions SET status = 'inactive', last_activity = CURRENT_TIMESTAMP WHERE session_id = ?",
    [resolvedSessionId]
  );
  await syncTableStatusesFromCustomerSessions(pool, { skipCleanup: true });
}

async function normalizeCustomerSessionStates() {
  const [rows] = await pool.query(
    `
      SELECT id, table_number
      FROM customer_sessions
      WHERE status = 'active'
      ORDER BY table_number ASC, last_activity DESC, id DESC
    `
  );

  const keepByTable = new Set();
  const duplicateIds = [];

  for (const row of rows) {
    const tableNumber = toInt(row.table_number, 0);
    if (!tableNumber) continue;

    if (!keepByTable.has(tableNumber)) {
      keepByTable.add(tableNumber);
      continue;
    }

    duplicateIds.push(toInt(row.id, 0));
  }

  if (!duplicateIds.length) return;

  await pool.query(
    "UPDATE customer_sessions SET status = 'inactive', last_activity = CURRENT_TIMESTAMP WHERE id IN (?)",
    [duplicateIds]
  );
}

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));
app.use(session({
  secret: process.env.SESSION_SECRET || "chill-n-fill-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 12
  }
}));

app.use(guardPageRequests);
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/views", express.static(path.join(__dirname, "views")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/media", express.static(path.join(__dirname, "media")));
app.use(express.static(path.join(__dirname, "views")));

app.get("/password/:raw", async function (req, res) {
  try {
    const hash = await hashPassword(req.params.raw);
    res.status(200).send(hash);
  } catch (err) {
    res.status(500).send(`Server Error: ${err.message}`);
  }
});

app.post("/login", async function (req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).send("Please provide username and password");
    }

    const sql = `
      SELECT id, password_hash AS password, role
      FROM (
        SELECT id, username AS login_name, password_hash, 'admin' AS role
        FROM admin
        UNION ALL
        SELECT id, cook_id AS login_name, password_hash, 'user' AS role
        FROM cooks
        WHERE status = 'active'
      ) u
      WHERE login_name = ?
      LIMIT 1
    `;

    const [results] = await pool.query(sql, [toText(username)]);
    if (results.length !== 1) {
      return res.status(401).send("Wrong username");
    }

    const same = await verifyPassword(toText(password), String(results[0].password || ""));
    if (!same) {
      return res.status(401).send("Wrong Password");
    }

    if (results[0].role === "admin") {
      return res.status(200).send("/inventory");
    }

    return res.status(200).send("/shop");
  } catch (err) {
    console.log(err);
    return res.status(500).send("Server Error");
  }
});

app.get("/admin/product", async function (req, res) {
  try {
    if (!ensureAdminSession(req, res)) return;

    const sql = "SELECT *, (is_available = 1) AS available FROM menu ORDER BY id ASC";
    const [results] = await pool.query(sql);
    return res.status(200).json(results);
  } catch (err) {
    console.log(err);
    return res.status(500).send("Server error");
  }
});

app.get("/api/menu", async function (req, res) {
  try {
    const isAdmin = req.session?.user_type === "admin" || Boolean(req.session?.admin_logged_in);
    const includeDisabledParam = toText(req.query?.include_disabled).toLowerCase();
    const includeDisabled = ["1", "true", "yes"].includes(includeDisabledParam) && isAdmin;
    const [rows] = includeDisabled
      ? await pool.query("SELECT * FROM menu ORDER BY sort_order ASC, id ASC")
      : await pool.query("SELECT * FROM menu WHERE is_available = 1 ORDER BY sort_order ASC, id ASC");
    return res.json({ success: true, menus: rows.map(mapMenuRow) });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/api/menu", requireAdminSession, uploadMenuImageField, async function (req, res) {
  try {
    const name = toText(req.body?.name);
    const thaiName = toText(req.body?.thaiName ?? req.body?.thai_name);
    const price = Math.max(0, toNumber(req.body?.price, 0));
    const category = toText(req.body?.category, "single");
    const desc = toText(req.body?.desc ?? req.body?.description);
    const optionKeys = normalizeMenuOptionKeys(req.body?.optionKeys ?? req.body?.option_keys);
    const imageUrl = getUploadedMenuImageUrl(req);
    const available = normalizeMenuAvailability(req.body?.available ?? req.body?.is_available ?? true, 1);

    if (!name) {
      removeUploadedMenuImage(req);
      return res.status(400).json({ success: false, message: "Menu name is required" });
    }
    if (price <= 0) {
      removeUploadedMenuImage(req);
      return res.status(400).json({ success: false, message: "Menu price must be greater than 0" });
    }

    const [maxRows] = await pool.query("SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM menu");
    const sortOrder = toInt(maxRows[0]?.max_sort, 0) + 1;

    const [result] = await pool.query(
      `
        INSERT INTO menu (
          name, name_th, thai_name, category, category_code, price,
          description, option_keys, image_url, is_available, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [name, thaiName || null, thaiName || null, category, category, price, desc, JSON.stringify(optionKeys), imageUrl || null, available, sortOrder]
    );

    const [rows] = await pool.query("SELECT * FROM menu WHERE id = ? LIMIT 1", [result.insertId]);
    return res.status(201).json({ success: true, menu: rows[0] ? mapMenuRow(rows[0]) : null });
  } catch (err) {
    removeUploadedMenuImage(req);
    return res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.put("/api/menu/:menuId", requireAdminSession, uploadMenuImageField, async function (req, res) {
  try {
    const menuId = toInt(req.params?.menuId, 0);
    if (!menuId) {
      return res.status(400).json({ success: false, message: "Menu ID is required" });
    }

    const name = toText(req.body?.name);
    const thaiName = toText(req.body?.thaiName ?? req.body?.thai_name);
    const price = Math.max(0, toNumber(req.body?.price, 0));
    const category = toText(req.body?.category, "single");
    const desc = toText(req.body?.desc ?? req.body?.description);
    const optionKeys = normalizeMenuOptionKeys(req.body?.optionKeys ?? req.body?.option_keys);
    const imageUrl = toText(getUploadedMenuImageUrl(req) || req.body?.img);
    const available = normalizeMenuAvailability(req.body?.available ?? req.body?.is_available ?? true, 1);

    if (!name) {
      removeUploadedMenuImage(req);
      return res.status(400).json({ success: false, message: "Menu name is required" });
    }
    if (price <= 0) {
      removeUploadedMenuImage(req);
      return res.status(400).json({ success: false, message: "Menu price must be greater than 0" });
    }

    const [out] = await pool.query(
      `
        UPDATE menu
        SET name = ?, name_th = ?, thai_name = ?, category = ?, category_code = ?, price = ?,
            description = ?, option_keys = ?, image_url = ?, is_available = ?
        WHERE id = ?
      `,
      [name, thaiName || null, thaiName || null, category, category, price, desc, JSON.stringify(optionKeys), imageUrl || null, available, menuId]
    );

    if (out.affectedRows === 0) {
      removeUploadedMenuImage(req);
      return res.status(404).json({ success: false, message: "Menu not found" });
    }

    const [rows] = await pool.query("SELECT * FROM menu WHERE id = ? LIMIT 1", [menuId]);
    return res.json({ success: true, menu: rows[0] ? mapMenuRow(rows[0]) : null });
  } catch (err) {
    removeUploadedMenuImage(req);
    return res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.delete("/api/menu/:menuId", async function (req, res) {
  try {
    if (!ensureAdminSession(req, res)) return;

    const menuId = toInt(req.params?.menuId, 0);
    if (!menuId) {
      return res.status(400).json({ success: false, message: "Menu ID is required" });
    }

    const [out] = await pool.query("DELETE FROM menu WHERE id = ?", [menuId]);
    if (out.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Menu not found" });
    }

    return res.json({ success: true, id: menuId });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.patch("/api/menu/:menuId/status", async function (req, res) {
  try {
    if (!ensureAdminSession(req, res)) return;

    const menuId = toInt(req.params?.menuId, 0);
    if (!menuId) {
      return res.status(400).json({ success: false, message: "Menu ID is required" });
    }

    const available = normalizeMenuAvailability(
      req.body?.available ?? req.body?.is_available ?? req.body?.enabled,
      null
    );
    if (available === null) {
      return res.status(400).json({ success: false, message: "available/is_available must be true or false" });
    }

    const [out] = await pool.query("UPDATE menu SET is_available = ? WHERE id = ?", [available, menuId]);
    if (out.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Menu not found" });
    }

    return res.json({
      success: true,
      id: menuId,
      is_available: available,
      available: Boolean(available)
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.get("/inventory", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "views", "admin.html"));
});

app.get("/shop", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "views", "menu.html"));
});

app.get("/admin", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "views", "admin.html"));
});

app.get("/menu", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "views", "menu.html"));
});

app.get("/customer", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "views", "customer.html"));
});

app.get("/cook", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "views", "cook.html"));
});

app.get("/cart", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "views", "cart.html"));
});

app.get("/payment", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "views", "payment.html"));
});

app.get("/order-status", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "views", "order_status.html"));
});

app.get("/staff", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "views", "staff.html"));
});

app.get("/table", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "views", "table.html"));
});

app.get("/login-customer", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "views", "login_customer.html"));
});

app.get("/login-cook", function (req, res) {
  res.redirect(302, "/staff.html");
});

app.get("/register-cook", function (req, res) {
  res.redirect(302, "/staff.html#first-time");
});

app.get("/login_cook.html", function (req, res) {
  res.redirect(302, "/staff.html");
});

app.get("/register_cook.html", function (req, res) {
  res.redirect(302, "/staff.html#first-time");
});

app.get("/api/health", async function (req, res) {
  try {
    const [rows] = await pool.query("SELECT NOW() AS now_time");
    res.json({ success: true, database: activeDbConfig.database, now: rows[0]?.now_time || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/session", async function (req, res) {
  try {
    const customer = await getCustomerContext(req);
    if (customer) {
      const orderingState = await getCustomerOrderingState(customer.sessionId);
      return res.json({
        logged_in: true,
        user_type: "customer",
        session_id: customer.sessionId,
        table_number: customer.tableNumber,
        ordering_allowed: orderingState.orderingAllowed,
        pending_review: orderingState.pendingReview,
        pending_review_payment_id: orderingState.pendingReviewPaymentId,
        locked_after_review: orderingState.lockedAfterReview
      });
    }

    if (toText(req.session?.user_type).toLowerCase() === "customer") {
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.json({ logged_in: false, user_type: null });
      });
      return;
    }

    res.json({
      logged_in: Boolean(req.session?.user_type),
      user_type: req.session?.user_type || null,
      admin_logged_in: Boolean(req.session?.admin_logged_in),
      admin_username: req.session?.admin_username || null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/customer/state", async function (req, res) {
  try {
    const customer = await getCustomerContext(req);
    if (!customer) {
      return res.status(401).json({ success: false, message: "Customer login required" });
    }

    res.json(await buildCustomerStateResponse(customer));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/customer/history", async function (req, res) {
  try {
    const tableNumber = toInt(req.query?.table_number, 0);
    if (!tableNumber) {
      return res.status(400).json({ success: false, message: "Table number is required" });
    }

    const [payments] = await pool.query(
      "SELECT * FROM payments WHERE table_number = ? ORDER BY created_at DESC, id DESC",
      [tableNumber]
    );
    const [reviews] = await pool.query(
      "SELECT * FROM reviews WHERE table_number = ? ORDER BY created_at DESC, id DESC",
      [tableNumber]
    );

    res.json({
      success: true,
      table_number: tableNumber,
      payments: await hydratePaymentsWithOrderDetails(payments),
      reviews: reviews.map(mapReviewRow)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/tables", async function (req, res) {
  try {
    await syncTableStatusesFromCustomerSessions(pool);
    const [rows] = await pool.query("SELECT * FROM tables ORDER BY table_number ASC");
    res.json({ success: true, tables: rows.map(mapTableRow) });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/api/tables/:tableNumber/reserve", async function (req, res) {
  return res.status(410).json({
    success: false,
    message: "Table reservation is no longer supported. Please log in directly with table number."
  });
});

app.patch("/api/tables/:tableNumber/status", async function (req, res) {
  try {
    if (!ensureAdminSession(req, res)) return;

    const tableNumber = toInt(req.params?.tableNumber, 0);
    const nextStatus = normalizeTableStatus(req.body?.status, "");
    if (!tableNumber) {
      return res.status(400).json({ success: false, message: "Table number is required" });
    }

    if (!nextStatus) {
      return res.status(400).json({ success: false, message: "Table status is required" });
    }

    const updated = await updateTableStatus(pool, tableNumber, nextStatus);

    res.json({
      success: true,
      message: `Table ${tableNumber} updated to ${nextStatus}`,
      table: updated ? mapTableRow(updated) : null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/api/customer/login", async function (req, res) {
  try {
    const tableNumber = toInt(req.body?.table_number, 0);
    const requestedSessionId = normalizeSessionId(req.body?.session_id, tableNumber);
    if (!tableNumber) {
      return res.status(400).json({ success: false, message: "Please enter table number" });
    }

    await ensureTableRecord(pool, tableNumber);
    const [tableRows] = await pool.query("SELECT status FROM tables WHERE table_number = ? LIMIT 1", [tableNumber]);
    const tableStatus = normalizeTableStatus(tableRows[0]?.status, "available");
    if (tableStatus === "inactive" || tableStatus === "maintenance") {
      return res.status(409).json({
        success: false,
        message: `Table ${tableNumber} is ${tableStatus}. Please choose another table.`
      });
    }

    let reusedSessionId = "";
    if (requestedSessionId && await canReuseCustomerSession(requestedSessionId, tableNumber)) {
      reusedSessionId = requestedSessionId;
    } else {
      reusedSessionId = await findReusableCustomerSession(tableNumber);
    }

    let sessionId = reusedSessionId;
    if (!sessionId) {
      sessionId = `CUST_${Math.floor(Date.now() / 1000)}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    await upsertCustomerSession(pool, sessionId, tableNumber);
    await syncTableStatusesFromCustomerSessions(pool, { skipCleanup: true });

    req.session.user_type = "customer";
    req.session.session_id = sessionId;
    req.session.table_number = tableNumber;

    res.json({
      success: true,
      user_id: sessionId,
      timestamp: toMysqlDate(new Date()),
      table_number: tableNumber,
      message: "Login successful",
      resumed: Boolean(reusedSessionId)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/api/cook/register", async function (req, res) {
  return res.status(403).json({
    success: false,
    message: "Cook self-registration is disabled. Please contact an admin to create your Cook ID."
  });
});

app.post("/api/cook/login", async function (req, res) {
  try {
    const cookId = toText(req.body?.cook_id);
    const password = toText(req.body?.password);
    if (!cookId || !password) {
      return res.status(400).json({ success: false, message: "Please enter Cook ID and password" });
    }

    const [rows] = await pool.query("SELECT * FROM cooks WHERE cook_id = ? LIMIT 1", [cookId]);
    const cook = rows[0];
    if (!cook) {
      return res.status(401).json({ success: false, message: "Cook ID or password is incorrect" });
    }
    if (normalizeCookStatus(cook.status, "inactive") !== "active") {
      return res.status(403).json({
        success: false,
        message: "This Cook ID is disabled. Please contact an admin."
      });
    }

    if (!toText(cook.password_hash)) {
      return res.status(403).json({
        success: false,
        requires_password_setup: true,
        cook_id: cook.cook_id,
        full_name: cook.full_name,
        message: "This Cook ID has not set a password yet"
      });
    }

    if (!(await verifyPassword(password, String(cook.password_hash || "")))) {
      return res.status(401).json({ success: false, message: "Cook ID or password is incorrect" });
    }

    establishCookSession(req, cook);

    res.json({ success: true, message: "Login successful", cook_id: cook.cook_id, full_name: cook.full_name });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/api/cook/access", async function (req, res) {
  try {
    const cookId = toText(req.body?.cook_id);
    if (!cookId) {
      return res.status(400).json({ success: false, message: "Cook ID is required" });
    }

    const [rows] = await pool.query(
      "SELECT id, cook_id, full_name, status, password_hash FROM cooks WHERE cook_id = ? LIMIT 1",
      [cookId]
    );
    const cook = rows[0];
    if (!cook || normalizeCookStatus(cook.status, "inactive") !== "active") {
      return res.status(404).json({ success: false, message: "Cook ID not found" });
    }

    return res.json({
      success: true,
      cook_id: cook.cook_id,
      full_name: cook.full_name,
      password_ready: Boolean(toText(cook.password_hash))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/api/cook/setup-password", async function (req, res) {
  try {
    const cookId = toText(req.body?.cook_id);
    const password = toText(req.body?.password);

    if (!cookId || !password) {
      return res.status(400).json({ success: false, message: "Cook ID and password are required" });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, message: "Password must be at least 4 characters" });
    }

    const [rows] = await pool.query(
      "SELECT id, cook_id, full_name, status, password_hash FROM cooks WHERE cook_id = ? LIMIT 1",
      [cookId]
    );
    const cook = rows[0];
    if (!cook || normalizeCookStatus(cook.status, "inactive") !== "active") {
      return res.status(404).json({ success: false, message: "Cook ID not found" });
    }
    if (toText(cook.password_hash)) {
      return res.status(409).json({ success: false, message: "This Cook ID has already set a password" });
    }

    const passwordHash = await hashPassword(password);
    await pool.query("UPDATE cooks SET password_hash = ? WHERE id = ?", [passwordHash, cook.id]);

    establishCookSession(req, cook);

    return res.status(201).json({
      success: true,
      message: "Password created successfully",
      cook_id: cook.cook_id,
      full_name: cook.full_name
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/api/admin/login", async function (req, res) {
  try {
    const username = toText(req.body?.username);
    const password = toText(req.body?.password);
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Please enter username and password" });
    }

    const [rows] = await pool.query("SELECT * FROM admin WHERE username = ? LIMIT 1", [username]);
    const admin = rows[0];
    const allowDefaultFallback = isDefaultAdminCredential(username, password);
    const passwordMatched = admin ? await verifyPassword(password, String(admin.password_hash || "")) : false;
    if (!passwordMatched && !allowDefaultFallback) {
      return res.status(401).json({ success: false, message: "Username or password is incorrect" });
    }

    req.session.user_type = "admin";
    req.session.admin_id = admin?.id || 0;
    req.session.admin_username = admin?.username || "admin";
    req.session.admin_logged_in = true;

    res.json({
      success: true,
      message: "Admin login successful",
      username: admin?.username || "admin"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/api/staff/login", async function (req, res) {
  try {
    const username = toText(req.body?.username);
    const password = toText(req.body?.password);
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Please enter username and password" });
    }

    if (isDefaultAdminCredential(username, password)) {
      req.session.user_type = "admin";
      req.session.admin_id = 0;
      req.session.admin_username = "admin";
      req.session.admin_logged_in = true;
      return res.json({
        success: true,
        message: "Admin login successful",
        role: "admin",
        user_type: "admin",
        user_id: "admin",
        username: "admin"
      });
    }

    const [admins] = await pool.query("SELECT * FROM admin WHERE username = ? LIMIT 1", [username]);
    const admin = admins[0];
    if (admin && (await verifyPassword(password, String(admin.password_hash || "")))) {
      req.session.user_type = "admin";
      req.session.admin_id = admin.id;
      req.session.admin_username = admin.username;
      req.session.admin_logged_in = true;
      return res.json({
        success: true,
        message: "Admin login successful",
        role: "admin",
        user_type: "admin",
        user_id: admin.username,
        username: admin.username
      });
    }

    const [cooks] = await pool.query("SELECT * FROM cooks WHERE cook_id = ? LIMIT 1", [username]);
    const cook = cooks[0];
    if (cook && normalizeCookStatus(cook.status, "inactive") !== "active") {
      return res.status(403).json({
        success: false,
        message: "This Cook ID is disabled. Please contact an admin."
      });
    }
    if (cook && !toText(cook.password_hash)) {
      return res.status(403).json({
        success: false,
        requires_password_setup: true,
        role: "cook",
        cook_id: cook.cook_id,
        full_name: cook.full_name,
        message: "This Cook ID must create a password on first login"
      });
    }
    if (cook && toText(cook.password_hash) && (await verifyPassword(password, String(cook.password_hash || "")))) {
      establishCookSession(req, cook);
      return res.json({
        success: true,
        message: "Login successful",
        role: "cook",
        user_type: "cook",
        user_id: cook.cook_id,
        cook_id: cook.cook_id,
        full_name: cook.full_name
      });
    }

    return res.status(401).json({ success: false, message: "Username or password is incorrect" });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

//Logout Function
async function handleLogout(req, res) {
  try {
    const isCustomer = toText(req.session?.user_type).toLowerCase() === "customer";
    let customerSessionId = "";
    let customerTableNumber = 0;

    if (isCustomer) {
      customerSessionId = normalizeSessionId(req.session?.session_id, req.session?.table_number);
      customerTableNumber = toInt(req.session?.table_number, 0);
    } else {
      const fallbackTableNumber = toInt(req.body?.table_number ?? req.get("x-customer-table-number"), 0);
      const fallbackSessionId = normalizeSessionId(
        req.body?.session_id ?? req.get("x-customer-session-id"),
        fallbackTableNumber
      );

      if (fallbackSessionId && fallbackTableNumber) {
        const [rows] = await pool.query(
          `
            SELECT session_id, table_number
            FROM customer_sessions
            WHERE session_id = ?
              AND table_number = ?
            LIMIT 1
          `,
          [fallbackSessionId, fallbackTableNumber]
        );

        if (rows.length > 0) {
          customerSessionId = normalizeSessionId(rows[0].session_id, rows[0].table_number);
          customerTableNumber = toInt(rows[0].table_number, 0);
        }
      }
    }

    if (customerSessionId) {
      const orderingState = await getCustomerOrderingState(customerSessionId);
      if (orderingState.pendingReview) {
        return res.status(409).json({
          success: false,
          message: "Please submit your review before logout.",
          pending_review: true,
          pending_review_payment_id: orderingState.pendingReviewPaymentId
        });
      }

      if (customerTableNumber) {
        await touchCustomerSession(customerSessionId, customerTableNumber).catch(() => {});
      }
      await markCustomerSessionInactive(customerSessionId);
    }

    if (req.session?.destroy) {
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.json({ success: true, message: "Logout successful" });
      });
      return;
    }

    res.clearCookie("connect.sid");
    res.json({ success: true, message: "Logout successful" });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
}

app.post("/api/logout", handleLogout);
app.post("/api/admin/logout", handleLogout);

app.get("/api/cooks", async function (req, res) {
  try {
    if (!ensureAdminSession(req, res)) return;

    const [rows] = await pool.query(
      "SELECT id, cook_id, full_name, phone, status, created_at, (password_hash IS NOT NULL AND password_hash <> '') AS password_ready FROM cooks ORDER BY id DESC"
    );
    res.json({ success: true, cooks: rows.map(mapCookRow) });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/api/cooks", async function (req, res) {
  try {
    if (!ensureAdminSession(req, res)) return;

    const cookId = toText(req.body?.cook_id ?? req.body?.id);
    const fullName = toText(req.body?.full_name ?? req.body?.name);
    const phone = toText(req.body?.phone);
    const status = normalizeCookStatus(req.body?.status, "active");

    if (!cookId || !fullName) {
      return res.status(400).json({ success: false, message: "Please provide Cook ID and full name" });
    }

    const [exists] = await pool.query("SELECT id FROM cooks WHERE cook_id = ? LIMIT 1", [cookId]);
    if (exists.length > 0) {
      return res.status(409).json({ success: false, message: "This Cook ID already exists" });
    }

    await pool.query(
      "INSERT INTO cooks (cook_id, password_hash, full_name, phone, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [cookId, null, fullName, phone, status]
    );

    const [rows] = await pool.query(
      "SELECT id, cook_id, full_name, phone, status, created_at, (password_hash IS NOT NULL AND password_hash <> '') AS password_ready FROM cooks WHERE cook_id = ? LIMIT 1",
      [cookId]
    );
    return res.status(201).json({ success: true, cook: rows[0] ? mapCookRow(rows[0]) : null });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.patch("/api/cooks/:cookId/status", async function (req, res) {
  try {
    if (!ensureAdminSession(req, res)) return;

    const cookId = toText(req.params?.cookId);
    const status = normalizeCookStatus(req.body?.status, req.body?.active === false ? "inactive" : "active");
    if (!cookId) {
      return res.status(400).json({ success: false, message: "Cook ID is required" });
    }

    const [out] = await pool.query("UPDATE cooks SET status = ? WHERE cook_id = ?", [status, cookId]);
    if (out.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Cook not found" });
    }
    return res.json({ success: true, cook_id: cookId, status });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.put("/api/cooks/:cookId", async function (req, res) {
  try {
    if (!ensureAdminSession(req, res)) return;

    const cookId = toText(req.params?.cookId);
    const fullName = toText(req.body?.full_name ?? req.body?.name);
    const phone = toText(req.body?.phone, null);
    const status = req.body?.status ? normalizeCookStatus(req.body?.status, "active") : null;
    if (!cookId) {
      return res.status(400).json({ success: false, message: "Cook ID is required" });
    }

    const updates = [];
    const params = [];
    if (fullName) {
      updates.push("full_name = ?");
      params.push(fullName);
    }
    if (phone !== null) {
      updates.push("phone = ?");
      params.push(phone);
    }
    if (status) {
      updates.push("status = ?");
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    params.push(cookId);
    const [out] = await pool.query(`UPDATE cooks SET ${updates.join(", ")} WHERE cook_id = ?`, params);
    if (out.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Cook not found" });
    }

    const [rows] = await pool.query(
      "SELECT id, cook_id, full_name, phone, status, created_at, (password_hash IS NOT NULL AND password_hash <> '') AS password_ready FROM cooks WHERE cook_id = ? LIMIT 1",
      [cookId]
    );
    return res.json({ success: true, cook: rows[0] ? mapCookRow(rows[0]) : null });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.delete("/api/cooks/:cookId", async function (req, res) {
  try {
    if (!ensureAdminSession(req, res)) return;

    const cookId = toText(req.params?.cookId);
    if (!cookId) {
      return res.status(400).json({ success: false, message: "Cook ID is required" });
    }

    const [out] = await pool.query("DELETE FROM cooks WHERE cook_id = ?", [cookId]);
    if (out.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Cook not found" });
    }

    return res.json({ success: true, cook_id: cookId });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.get("/", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "views", "index.html"));
});

app.get(["/login", "/login.html"], function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "views", "index.html"));
});

app.post("/api/orders", async function (req, res) {
  try {
    const customer = await getOrCreateCustomerContext(req, { allowCreateFromBody: true });
    if (!customer) {
      return res.status(401).json({ success: false, message: "Customer session or table_number is required to place orders." });
    }

    const sessionId = customer.sessionId;
    const tableNumber = customer.tableNumber;
    const orderingState = await getCustomerOrderingState(sessionId);
    if (!orderingState.orderingAllowed) {
      return res.status(409).json({
        success: false,
        message: getOrderingBlockedMessage(orderingState),
        pending_review: orderingState.pendingReview,
        pending_review_payment_id: orderingState.pendingReviewPaymentId,
        locked_after_review: orderingState.lockedAfterReview
      });
    }

    const { notes, items } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Order must contain at least one item." });
    }

    const normalizedItems = [];
    for (const item of items) {
      const normalizedItem = await resolveIncomingOrderItem(item);
      if (normalizedItem?.error) {
        return res.status(400).json({ success: false, message: normalizedItem.error });
      }

      normalizedItems.push(normalizedItem);
    }

    const requestedNotes = toText(notes);
    const conn = await pool.getConnection();
    let createdOrderId = null;
    let createdOrderNumber = "";

    try {
      await conn.beginTransaction();

      const totalAmount = normalizedItems.reduce((sum, item) => sum + toNumber(item.subtotal, 0), 0);
      const temporaryOrderNumber = `ORD-TMP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const [orderResult] = await conn.query(
        `
          INSERT INTO orders (order_number, session_id, table_number, total_amount, status, notes)
          VALUES (?, ?, ?, ?, 'pending', ?)
        `,
        [temporaryOrderNumber, sessionId, tableNumber, totalAmount, requestedNotes]
      );

      createdOrderId = orderResult.insertId;
      createdOrderNumber = `ORD-${String(createdOrderId).padStart(4, "0")}`;
      await conn.query("UPDATE orders SET order_number = ? WHERE id = ?", [createdOrderNumber, createdOrderId]);

      for (const item of normalizedItems) {
        await conn.query(
          `
            INSERT INTO order_items (order_id, table_number, menu_id, item_name, quantity, unit_price, subtotal, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [createdOrderId, tableNumber, item.menuId, item.itemName, item.quantity, item.unitPrice, item.subtotal, item.notes]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    if (!createdOrderId) {
      throw new Error("Unable to create order");
    }

    const createdOrderIds = [createdOrderId];
    const createdOrderNumbers = [createdOrderNumber];
    const [orders] = await pool.query("SELECT * FROM orders WHERE id = ? LIMIT 1", [createdOrderId]);
    const [itemRows] = await pool.query(
      "SELECT * FROM order_items WHERE order_id = ? ORDER BY order_item_id ASC",
      [createdOrderId]
    );
    const firstOrder = orders[0] ? mapOrderRow(orders[0], itemRows) : null;

    res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      order_id: createdOrderId,
      order_number: createdOrderNumber,
      order_ids: createdOrderIds,
      order_numbers: createdOrderNumbers,
      session_id: sessionId,
      table_number: tableNumber,
      order: firstOrder,
      orders: firstOrder ? [firstOrder] : []
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.get("/api/orders", async function (req, res) {
  try {
    const statusFilter = toText(req.query.status).toLowerCase();
    const cookFilter = toText(req.query.cook_id);
    const tableFilter = toInt(req.query.table_number, 0);
    let query = "SELECT * FROM orders";
    let params = [];

    const customer = await getCustomerContext(req);
    const staffAccess = hasStaffOrderAccess(req);
    if (!customer && !staffAccess) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    if (customer) {
      const sessionId = customer.sessionId;
      query += " WHERE session_id = ?";
      params.push(sessionId);
    }

    if (statusFilter) {
      query += params.length ? " AND status = ?" : " WHERE status = ?";
      params.push(statusFilter);
    }

    if (cookFilter) {
      query += params.length ? " AND cook_id = ?" : " WHERE cook_id = ?";
      params.push(cookFilter);
    }

    if (tableFilter) {
      query += params.length ? " AND table_number = ?" : " WHERE table_number = ?";
      params.push(tableFilter);
    }

    query += " ORDER BY created_at DESC";
    const [orders] = await pool.query(query, params);

    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const [items] = await pool.query(
        "SELECT * FROM order_items WHERE order_id IN (?)",
        [orderIds]
      );

      const normalizedOrders = orders.map((order) =>
        mapOrderRow(order, items.filter((item) => item.order_id === order.id))
      );

      return res.status(200).json({
        success: true,
        orders: normalizedOrders
      });
    }

    res.status(200).json({
      success: true,
      orders: []
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/api/orders/:orderId/claim", async function (req, res) {
  try {
    if (req.session?.user_type !== "cook") {
      return res.status(401).json({ success: false, message: "Only logged-in cooks can claim orders." });
    }

    const orderId = toInt(req.params.orderId, 0);
    const cookId = toText(req.session?.cook_id);
    if (!orderId || !cookId) {
      return res.status(400).json({ success: false, message: "Order ID and cook session are required." });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [currentRows] = await conn.query("SELECT * FROM orders WHERE id = ? LIMIT 1", [orderId]);
      const currentOrder = currentRows[0];
      if (!currentOrder) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      const [otherClaims] = await conn.query(
        `
          SELECT order_item_id
          FROM order_items
          WHERE order_id = ?
            AND cook_id IS NOT NULL
            AND cook_id <> ''
            AND cook_id <> ?
            AND status NOT IN ('completed', 'cancelled')
          LIMIT 1
        `,
        [orderId, cookId]
      );
      if (otherClaims.length > 0) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: "This order already has active items claimed by another cook." });
      }

      const [claimResult] = await conn.query(
        `
          UPDATE order_items
          SET
            cook_id = ?,
            status = CASE WHEN status = 'pending' THEN 'cooking' ELSE status END,
            started_at = COALESCE(started_at, NOW())
          WHERE order_id = ?
            AND (cook_id IS NULL OR cook_id = '')
            AND status NOT IN ('completed', 'cancelled')
        `,
        [cookId, orderId]
      );

      if (!claimResult.affectedRows) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: "There are no claimable items left in this order." });
      }

      const order = await refreshOrderSummary(orderId, conn);
      await conn.commit();
      return res.json({
        success: true,
        message: "Order claimed successfully",
        order
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.patch("/api/orders/:orderId/status", async function (req, res) {
  try {
    const isAdmin = req.session?.user_type === "admin";
    const isCook = req.session?.user_type === "cook";
    if (!isAdmin && !isCook) {
      return res.status(401).json({ success: false, message: "Only staff can update order status." });
    }

    const orderId = toInt(req.params.orderId, 0);
    const newStatus = normalizeOrderStatus(req.body?.status, "");

    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required" });
    }

    if (!newStatus) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    const [existingRows] = await pool.query("SELECT * FROM orders WHERE id = ? LIMIT 1", [orderId]);
    const existingOrder = existingRows[0];
    if (!existingOrder) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let updateSql = "";
      let updateParams = [];
      if (isAdmin) {
        updateSql = `
          UPDATE order_items
          SET
            status = ?,
            completed_at = CASE
              WHEN ? IN ('serving', 'completed') THEN COALESCE(completed_at, NOW())
              ELSE NULL
            END,
            started_at = CASE
              WHEN ? IN ('cooking', 'serving', 'completed') THEN COALESCE(started_at, NOW())
              ELSE started_at
            END
          WHERE order_id = ?
        `;
        updateParams = [newStatus, newStatus, newStatus, orderId];
      } else {
        const cookId = toText(req.session?.cook_id);
        const [ownershipRows] = await conn.query(
          `
            SELECT order_item_id
            FROM order_items
            WHERE order_id = ?
              AND cook_id IS NOT NULL
              AND cook_id <> ''
              AND cook_id <> ?
              AND status NOT IN ('completed', 'cancelled')
            LIMIT 1
          `,
          [orderId, cookId]
        );
        if (ownershipRows.length > 0) {
          await conn.rollback();
          return res.status(403).json({ success: false, message: "This order contains items assigned to another cook." });
        }

        updateSql = `
          UPDATE order_items
          SET
            cook_id = CASE
              WHEN (cook_id IS NULL OR cook_id = '') AND ? IN ('cooking', 'serving', 'completed', 'cancelled') THEN ?
              ELSE cook_id
            END,
            status = ?,
            completed_at = CASE
              WHEN ? IN ('serving', 'completed') THEN COALESCE(completed_at, NOW())
              ELSE NULL
            END,
            started_at = CASE
              WHEN ? IN ('cooking', 'serving', 'completed') THEN COALESCE(started_at, NOW())
              ELSE started_at
            END
          WHERE order_id = ?
            AND ((cook_id = ?) OR (cook_id IS NULL OR cook_id = ''))
        `;
        updateParams = [newStatus, cookId, newStatus, newStatus, newStatus, orderId, cookId];
      }

      const [updateResult] = await conn.query(updateSql, updateParams);
      if (!updateResult.affectedRows) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: "No order items were updated." });
      }

      const order = await refreshOrderSummary(orderId, conn);
      await conn.commit();
      res.status(200).json({
        success: true,
        message: `Order #${orderId} status updated to ${newStatus}`,
        order_id: orderId,
        status: order?.status || newStatus,
        order
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.get("/api/orders/:orderId", async function (req, res) {
  try {
    const orderId = toInt(req.params.orderId, 0);
    const customer = await getCustomerContext(req);
    const staffAccess = hasStaffOrderAccess(req);
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required" });
    }
    if (!customer && !staffAccess) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const params = [orderId];
    let query = "SELECT * FROM orders WHERE id = ?";
    if (customer) {
      query += " AND session_id = ?";
      params.push(customer.sessionId);
    }

    const [orders] = await pool.query(query, params);

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const [items] = await pool.query("SELECT * FROM order_items WHERE order_id = ?", [orderId]);
    res.status(200).json({
      success: true,
      order: mapOrderRow(orders[0], items)
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/api/order-items/:itemId/claim", async function (req, res) {
  try {
    if (req.session?.user_type !== "cook") {
      return res.status(401).json({ success: false, message: "Only logged-in cooks can claim items." });
    }

    const itemId = toInt(req.params.itemId, 0);
    const cookId = toText(req.session?.cook_id);
    if (!itemId || !cookId) {
      return res.status(400).json({ success: false, message: "Order item ID and cook session are required." });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query("SELECT * FROM order_items WHERE order_item_id = ? LIMIT 1", [itemId]);
      const currentItem = rows[0];
      if (!currentItem) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: "Order item not found" });
      }

      if (normalizeOrderItemStatus(currentItem.status) === "completed") {
        await conn.rollback();
        return res.status(409).json({ success: false, message: "Completed items cannot be claimed." });
      }

      const [claimResult] = await conn.query(
        `
          UPDATE order_items
          SET
            cook_id = ?,
            status = CASE WHEN status = 'pending' THEN 'cooking' ELSE status END,
            started_at = COALESCE(started_at, NOW())
          WHERE order_item_id = ?
            AND (cook_id IS NULL OR cook_id = '' OR cook_id = ?)
            AND status NOT IN ('completed', 'cancelled')
        `,
        [cookId, itemId, cookId]
      );

      if (!claimResult.affectedRows) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: "This item has already been claimed by another cook." });
      }

      const [updatedItemRows] = await conn.query("SELECT * FROM order_items WHERE order_item_id = ? LIMIT 1", [itemId]);
      const updatedItem = updatedItemRows[0];
      const order = await refreshOrderSummary(updatedItem.order_id, conn);

      await conn.commit();
      return res.json({
        success: true,
        message: "Order item claimed successfully",
        item: mapOrderItemRow(updatedItem),
        order
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.patch("/api/order-items/:itemId/status", async function (req, res) {
  try {
    const isAdmin = req.session?.user_type === "admin";
    const isCook = req.session?.user_type === "cook";
    if (!isAdmin && !isCook) {
      return res.status(401).json({ success: false, message: "Only staff can update item status." });
    }

    const itemId = toInt(req.params.itemId, 0);
    const newStatus = normalizeOrderItemStatus(req.body?.status, "");
    if (!itemId) {
      return res.status(400).json({ success: false, message: "Order item ID is required" });
    }
    if (!newStatus) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query("SELECT * FROM order_items WHERE order_item_id = ? LIMIT 1", [itemId]);
      const existingItem = rows[0];
      if (!existingItem) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: "Order item not found" });
      }

      if (isCook) {
        const cookId = toText(req.session?.cook_id);
        if (existingItem.cook_id && existingItem.cook_id !== cookId) {
          await conn.rollback();
          return res.status(403).json({ success: false, message: "This item belongs to another cook." });
        }

        const [updateResult] = await conn.query(
          `
            UPDATE order_items
            SET
              cook_id = CASE
                WHEN (cook_id IS NULL OR cook_id = '') AND ? IN ('cooking', 'serving', 'completed', 'cancelled') THEN ?
                ELSE cook_id
              END,
              status = ?,
              started_at = CASE
                WHEN ? IN ('cooking', 'serving', 'completed') THEN COALESCE(started_at, NOW())
                ELSE started_at
              END,
              completed_at = CASE
                WHEN ? IN ('serving', 'completed') THEN COALESCE(completed_at, NOW())
                ELSE NULL
              END
            WHERE order_item_id = ?
              AND (cook_id = ? OR cook_id IS NULL OR cook_id = '')
          `,
          [newStatus, cookId, newStatus, newStatus, newStatus, itemId, cookId]
        );
        if (!updateResult.affectedRows) {
          await conn.rollback();
          return res.status(409).json({ success: false, message: "Unable to update this item." });
        }
      } else {
        const [updateResult] = await conn.query(
          `
            UPDATE order_items
            SET
              status = ?,
              started_at = CASE
                WHEN ? IN ('cooking', 'serving', 'completed') THEN COALESCE(started_at, NOW())
                ELSE started_at
              END,
              completed_at = CASE
                WHEN ? IN ('serving', 'completed') THEN COALESCE(completed_at, NOW())
                ELSE NULL
              END
            WHERE order_item_id = ?
          `,
          [newStatus, newStatus, newStatus, itemId]
        );
        if (!updateResult.affectedRows) {
          await conn.rollback();
          return res.status(409).json({ success: false, message: "Unable to update this item." });
        }
      }

      const [updatedItemRows] = await conn.query("SELECT * FROM order_items WHERE order_item_id = ? LIMIT 1", [itemId]);
      const updatedItem = updatedItemRows[0];
      const order = await refreshOrderSummary(updatedItem.order_id, conn);

      await conn.commit();
      return res.json({
        success: true,
        message: `Order item #${itemId} status updated to ${newStatus}`,
        item: mapOrderItemRow(updatedItem),
        order
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

// PAYMENTS APIS
// ==========================================

// Process a Payment
app.post("/api/payments", async function (req, res) {
  try {
    const customer = await getCustomerContext(req);
    if (!customer) {
      return res.status(401).json({ success: false, message: "Only logged-in customers can make payments." });
    }

    const orderIds = Array.isArray(req.body?.order_ids)
      ? req.body.order_ids.map((id) => toInt(id, 0)).filter(Boolean)
      : [toInt(req.body?.order_id, 0)].filter(Boolean);
    const method = toText(req.body?.method);
    const sessionId = customer.sessionId;
    const tableNumber = customer.tableNumber;

    if (!orderIds.length || !method) {
      return res.status(400).json({ success: false, message: "Missing required payment details" });
    }

    const [orders] = await pool.query(
      "SELECT * FROM orders WHERE id IN (?) AND session_id = ? ORDER BY created_at DESC",
      [orderIds, sessionId]
    );

    if (orders.length !== orderIds.length) {
      return res.status(404).json({ success: false, message: "Some orders were not found for this session" });
    }

    const unpaidOrders = orders.filter((order) => String(order.payment_status || "").toLowerCase() !== "paid" && !order.payment_id);
    if (unpaidOrders.length !== orders.length) {
      return res.status(409).json({ success: false, message: "Some selected orders are already paid" });
    }

    const [allOutstandingOrders] = await pool.query(
      `
        SELECT id, status
        FROM orders
        WHERE session_id = ?
          AND (payment_status IS NULL OR LOWER(payment_status) <> 'paid')
          AND payment_id IS NULL
          AND LOWER(COALESCE(status, 'pending')) NOT IN ('cancelled', 'canceled')
      `,
      [sessionId]
    );

    const notReadyOrders = allOutstandingOrders.filter(
      (order) => !["serving", "completed"].includes(normalizeOrderStatus(order.status, "pending"))
    );
    if (notReadyOrders.length > 0) {
      return res.status(409).json({ success: false, message: "Payment is allowed only for orders with serving or completed status" });
    }

    const [chargeRows] = await pool.query(
      `
        SELECT order_id, SUM(subtotal) AS charge_total
        FROM order_items
        WHERE order_id IN (?)
          AND LOWER(COALESCE(status, 'pending')) NOT IN ('cancelled', 'canceled')
        GROUP BY order_id
      `,
      [orderIds]
    );
    const chargeByOrderId = new Map(chargeRows.map((row) => [toInt(row.order_id, 0), toNumber(row.charge_total, 0)]));
    const amount = unpaidOrders.reduce((sum, order) => {
      const orderId = toInt(order.id, 0);
      return sum + (chargeByOrderId.get(orderId) ?? toNumber(order.total_amount, 0));
    }, 0);
    const paymentRef = Date.now().toString();

    const conn = await pool.getConnection();
    let paymentId = 0;
    try {
      await conn.beginTransaction();

      const [paymentResult] = await conn.query(
        "INSERT INTO payments (payment_reference, session_id, table_number, amount, method, status) VALUES (?, ?, ?, ?, ?, 'paid')",
        [paymentRef, sessionId, tableNumber, amount, method]
      );
      paymentId = paymentResult.insertId;

      await conn.query(
        `
          UPDATE order_items
          SET
            status = CASE
              WHEN LOWER(COALESCE(status, 'pending')) = 'serving' THEN 'completed'
              ELSE status
            END,
            completed_at = CASE
              WHEN LOWER(COALESCE(status, 'pending')) IN ('serving', 'completed')
                THEN COALESCE(completed_at, NOW())
              ELSE completed_at
            END
          WHERE order_id IN (?)
            AND LOWER(COALESCE(status, 'pending')) NOT IN ('cancelled', 'canceled')
        `,
        [orderIds]
      );

      await conn.query(
        "UPDATE orders SET payment_id = ?, payment_status = 'paid', payment_method = ?, paid_at = NOW() WHERE id IN (?)",
        [paymentId, method, orderIds]
      );

      for (const orderId of orderIds) {
        await refreshOrderSummary(orderId, conn);
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    await markCustomerSessionInactiveIfFinished(sessionId);

    const [payments] = await pool.query("SELECT * FROM payments WHERE id = ? LIMIT 1", [paymentId]);
    const hydrated = await hydratePaymentsWithOrderDetails(payments);
    res.status(201).json({
      success: true,
      message: "Payment processed successfully",
      payment_id: paymentId,
      payment_reference: paymentRef,
      status: "paid",
      payment: hydrated[0] || null,
      order_ids: orderIds
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

// Get Payment History
app.get("/api/payments", async function (req, res) {
  try {
    let query = "SELECT * FROM payments";
    const params = [];

    const customer = await getCustomerContext(req);
    if (customer) {
      query += " WHERE session_id = ?";
      params.push(customer.sessionId);
    }

    query += " ORDER BY created_at DESC";
    const [payments] = await pool.query(query, params);
    const hydratedPayments = await hydratePaymentsWithOrderDetails(payments);
    res.status(200).json({ success: true, payments: hydratedPayments });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});


// ==========================================
// REVIEWS APIS
// ==========================================

// Submit a Review
app.post("/api/reviews", async function (req, res) {
  try {
    const { payment_id, rating, comment } = req.body;

    if (!payment_id || !rating) {
      return res.status(400).json({ success: false, message: "Payment ID and rating are required" });
    }

    const customer = await getCustomerContext(req);
    if (!customer) {
      return res.status(401).json({ success: false, message: "Only logged-in customers can submit reviews." });
    }

    const sessionId = customer.sessionId;
    const tableNumber = customer.tableNumber;

    const [paymentRows] = await pool.query("SELECT * FROM payments WHERE id = ? AND session_id = ? LIMIT 1", [payment_id, sessionId]);
    if (paymentRows.length === 0) {
      return res.status(404).json({ success: false, message: "Payment not found for this session" });
    }

    const [existingRows] = await pool.query(
      "SELECT * FROM reviews WHERE payment_id = ? AND session_id = ? LIMIT 1",
      [payment_id, sessionId]
    );

    let reviewId = 0;
    if (existingRows.length > 0) {
      reviewId = existingRows[0].id;
      await pool.query(
        "UPDATE reviews SET rating = ?, comment = ?, table_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [rating, comment || "", tableNumber, reviewId]
      );
    } else {
      const [reviewResult] = await pool.query(
        "INSERT INTO reviews (payment_id, session_id, table_number, rating, comment) VALUES (?, ?, ?, ?, ?)",
        [payment_id, sessionId, tableNumber, rating, comment || ""]
      );
      reviewId = reviewResult.insertId;
    }

    await pool.query(
      "UPDATE payments SET review_submitted_at = NOW() WHERE id = ?",
      [payment_id]
    );

    await pool.query(
      "UPDATE orders SET review_submitted_at = NOW() WHERE payment_id = ?",
      [payment_id]
    );

    await markCustomerSessionInactiveIfFinished(sessionId);

    const [reviews] = await pool.query("SELECT * FROM reviews WHERE id = ? LIMIT 1", [reviewId]);
    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review_id: reviewId,
      review: reviews[0] ? mapReviewRow(reviews[0]) : null
    });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: "Review already submitted for this payment" });
    }
    console.log(err);
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

// Get All Reviews
app.get("/api/reviews", async function (req, res) {
  try {
    let query = "SELECT * FROM reviews";
    const params = [];

    const customer = await getCustomerContext(req);
    if (customer) {
      query += " WHERE session_id = ?";
      params.push(customer.sessionId);
    }

    query += " ORDER BY created_at DESC";
    const [reviews] = await pool.query(query, params);
    res.status(200).json({ success: true, reviews: reviews.map(mapReviewRow) });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.get("/api/cook/dashboard", async function (req, res) {
  try {
    if (req.session?.user_type !== "cook" && req.session?.user_type !== "admin") {
      return res.status(401).json({ success: false, message: "Staff login required" });
    }

    const [statusRows] = await pool.query(
      `
        SELECT
          CASE
            WHEN LOWER(COALESCE(payment_status, '')) = 'paid' AND LOWER(COALESCE(status, 'pending')) = 'serving'
              THEN 'completed'
            ELSE LOWER(COALESCE(status, 'pending'))
          END AS status,
          COUNT(*) AS total
        FROM orders
        GROUP BY
          CASE
            WHEN LOWER(COALESCE(payment_status, '')) = 'paid' AND LOWER(COALESCE(status, 'pending')) = 'serving'
              THEN 'completed'
            ELSE LOWER(COALESCE(status, 'pending'))
          END
      `
    );
    const [recentOrders] = await pool.query(
      `
        SELECT *
        FROM orders
        ORDER BY created_at DESC
        LIMIT 20
      `
    );
    const [cookRows] = await pool.query(
      `
        SELECT COUNT(*) AS total_cooks,
               SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_cooks
        FROM cooks
      `
    );

    const summary = {
      pending: 0,
      cooking: 0,
      serving: 0,
      completed: 0,
      cancelled: 0,
      total_orders: 0
    };

    for (const row of statusRows) {
      const key = toText(row.status).toLowerCase();
      summary[key] = toInt(row.total, 0);
      summary.total_orders += toInt(row.total, 0);
    }

    const orderIds = recentOrders.map((order) => order.id);
    const [items] = orderIds.length
      ? await pool.query("SELECT * FROM order_items WHERE order_id IN (?)", [orderIds])
      : [[]];

    res.status(200).json({
      success: true,
      summary: {
        ...summary,
        total_cooks: toInt(cookRows[0]?.total_cooks, 0),
        active_cooks: toInt(cookRows[0]?.active_cooks, 0)
      },
      recent_orders: recentOrders.map((order) =>
        mapOrderRow(order, items.filter((item) => item.order_id === order.id))
      )
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

async function start() {
  await resolveDatabaseConfig();
  await ensureDatabase();
  setPool(mysql.createPool({
    ...activeDbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  }));
  await ensureTables();
  await normalizeCustomerSessionStates();
  await syncTableStatusesFromCustomerSessions(pool);

  app.listen(PORT, () => {
    console.log(`Chill n Fill server running at http://localhost:${PORT}`);
    console.log(`MySQL: ${activeDbConfig.user}@${activeDbConfig.host}:${activeDbConfig.port}/${activeDbConfig.database}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });
}

module.exports = {
  app,
  start,
  setPool,
  safeJsonParse,
  ensureDatabase,
  ensureTables,
  verifyPassword,
  hashPassword
};
