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
const bcrypt = require("bcryptjs");
const argon2 = require("argon2");

const app = express();
const PORT = Number(process.env.PORT || 3000);

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
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function normalizeCookStatus(value, fallback = "active") {
  const raw = String(value ?? "").trim().toLowerCase();
  if (["active", "enabled", "enable", "1", "true"].includes(raw)) return "active";
  if (["inactive", "disabled", "disable", "0", "false"].includes(raw)) return "inactive";
  return fallback;
}

function mapCookRow(row) {
  return {
    id: row.id,
    cook_id: row.cook_id,
    full_name: row.full_name,
    phone: row.phone,
    status: row.status,
    created_at: row.created_at
  };
}

function normalizeSessionId(raw, tableNumber = 0) {
  const id = toText(raw);
  if (id) return id;
  return `GUEST_TABLE_${toInt(tableNumber, 0)}`;
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

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INT PRIMARY KEY AUTO_INCREMENT,
      state_key VARCHAR(50) UNIQUE NOT NULL,
      state_value LONGTEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_id INT NOT NULL,
      menu_id INT DEFAULT NULL,
      item_name VARCHAR(150) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      notes TEXT DEFAULT NULL,
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

  if (String(hash).startsWith("$2")) {
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }

  return false;
}

async function upsertCustomerSession(conn, sessionId, tableNumber) {
  await conn.query(
    `
      INSERT INTO customer_sessions (session_id, table_number, status)
      VALUES (?, ?, 'active')
      ON DUPLICATE KEY UPDATE
        table_number = VALUES(table_number),
        status = 'active',
        last_activity = CURRENT_TIMESTAMP
    `,
    [sessionId, toInt(tableNumber, 0)]
  );
}

async function syncRelationalTables(payload) {
  if (!pool || typeof pool.getConnection !== "function") return;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let menuRows = [];
    try {
      const [rows] = await conn.query("SELECT id, name FROM menu ORDER BY id ASC");
      menuRows = rows;
    } catch {
      menuRows = [];
    }
    const menuIds = new Set(menuRows.map((r) => Number(r.id)));
    const menuByName = new Map(menuRows.map((r) => [String(r.name || "").trim().toLowerCase(), Number(r.id)]));
    const fallbackMenuId = menuRows.length ? Number(menuRows[0].id) : null;

    if (Array.isArray(payload.payments)) {
      for (const p of payload.payments) {
        const paymentRef = toText(p?.id);
        if (!paymentRef) continue;

        const sessionId = normalizeSessionId(p?.userId ?? payload?.session?.user_id, p?.table ?? payload?.session?.table_number);
        const tableNumber = toInt(p?.table ?? payload?.session?.table_number, 0);
        await upsertCustomerSession(conn, sessionId, tableNumber);

        const [rows] = await conn.query("SELECT id FROM payments WHERE payment_reference = ? LIMIT 1", [paymentRef]);
        if (rows.length === 0) {
          await conn.query(
            `
              INSERT INTO payments (payment_reference, session_id, table_number, amount, method, status, created_at, review_submitted_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              paymentRef,
              sessionId,
              tableNumber,
              toNumber(p?.amount, 0),
              toText(p?.method, "Cash"),
              toText(p?.status, "paid"),
              toMysqlDate(p?.time),
              toMysqlDate(p?.reviewSubmittedAt)
            ]
          );
        }
      }
    }

    if (Array.isArray(payload.orders)) {
      for (const o of payload.orders) {
        const orderNumber = toText(o?.id);
        if (!orderNumber) continue;

        const sessionId = normalizeSessionId(o?.userId ?? payload?.session?.user_id, o?.table ?? payload?.session?.table_number);
        const tableNumber = toInt(o?.table ?? payload?.session?.table_number, 0);
        await upsertCustomerSession(conn, sessionId, tableNumber);

        let linkedPaymentId = null;
        const paymentRef = toText(o?.paymentId);
        if (paymentRef) {
          const [paymentRows] = await conn.query("SELECT id FROM payments WHERE payment_reference = ? LIMIT 1", [paymentRef]);
          if (paymentRows.length > 0) {
            linkedPaymentId = paymentRows[0].id;
          }
        }

        const [orderRows] = await conn.query("SELECT id FROM orders WHERE order_number = ? LIMIT 1", [orderNumber]);
        let orderId;
        if (orderRows.length > 0) {
          orderId = orderRows[0].id;
          await conn.query(
            `
              UPDATE orders
              SET session_id = ?, table_number = ?, total_amount = ?, status = ?, payment_id = ?,
                  payment_status = ?, payment_method = ?, paid_at = ?, review_submitted_at = ?
              WHERE id = ?
            `,
            [
              sessionId,
              tableNumber,
              toNumber(o?.total, 0),
              toText(o?.status, "pending"),
              linkedPaymentId,
              toText(o?.paymentStatus),
              toText(o?.paymentMethod),
              toMysqlDate(o?.paidAt),
              toMysqlDate(o?.reviewSubmittedAt),
              orderId
            ]
          );
        } else {
          const [ins] = await conn.query(
            `
              INSERT INTO orders (
                order_number, session_id, table_number, total_amount, status, notes,
                payment_id, payment_status, payment_method, paid_at, review_submitted_at, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              orderNumber,
              sessionId,
              tableNumber,
              toNumber(o?.total, 0),
              toText(o?.status, "pending"),
              "",
              linkedPaymentId,
              toText(o?.paymentStatus),
              toText(o?.paymentMethod),
              toMysqlDate(o?.paidAt),
              toMysqlDate(o?.reviewSubmittedAt),
              toMysqlDate(o?.time)
            ]
          );
          orderId = ins.insertId;
        }

        const items = Array.isArray(o?.items) ? o.items : [];
        for (const item of items) {
          const qty = Math.max(1, toInt(item?.qty, 1));
          const unitPrice = toNumber(item?.price, 0);
          const subtotal = qty * unitPrice;
          const notes = [toText(item?.optionsText), toText(item?.customerNote)].filter(Boolean).join(" | ");
          const itemName = toText(item?.name, "Unknown Item");

          let menuId = toInt(item?.menuId, 0);
          if (!menuIds.has(menuId)) {
            const byName = menuByName.get(itemName.toLowerCase());
            menuId = menuIds.has(byName) ? byName : fallbackMenuId;
          }

          const [exists] = await conn.query(
            `
              SELECT id FROM order_items
              WHERE order_id = ? AND item_name = ? AND quantity = ? AND unit_price = ? AND subtotal = ? AND notes = ?
              LIMIT 1
            `,
            [orderId, itemName, qty, unitPrice, subtotal, notes]
          );
          if (exists.length > 0) continue;

          await conn.query(
            `
              INSERT INTO order_items (order_id, menu_id, item_name, quantity, unit_price, subtotal, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [orderId, menuId, itemName, qty, unitPrice, subtotal, notes]
          );
        }
      }
    }

    if (Array.isArray(payload.reviews)) {
      for (const r of payload.reviews) {
        const paymentRef = toText(r?.paymentId);
        if (!paymentRef) continue;

        const [payRows] = await conn.query("SELECT id FROM payments WHERE payment_reference = ? LIMIT 1", [paymentRef]);
        if (payRows.length === 0) continue;
        const paymentId = payRows[0].id;

        const sessionId = normalizeSessionId(r?.userId ?? payload?.session?.user_id, r?.table ?? payload?.session?.table_number);
        const tableNumber = toInt(r?.table ?? payload?.session?.table_number, 0);
        await upsertCustomerSession(conn, sessionId, tableNumber);

        const [exists] = await conn.query(
          "SELECT id FROM reviews WHERE payment_id = ? AND session_id = ? LIMIT 1",
          [paymentId, sessionId]
        );

        if (exists.length > 0) {
          await conn.query(
            `
              UPDATE reviews
              SET rating = ?, comment = ?, table_number = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            [Math.max(0, Math.min(5, toInt(r?.rating, 0))), toText(r?.comment), tableNumber, exists[0].id]
          );
        } else {
          await conn.query(
            `
              INSERT INTO reviews (payment_id, session_id, table_number, rating, comment, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `,
            [paymentId, sessionId, tableNumber, Math.max(0, Math.min(5, toInt(r?.rating, 0))), toText(r?.comment), toMysqlDate(r?.time)]
          );
        }
      }
    }

    if (Array.isArray(payload.cooks)) {
      for (const c of payload.cooks) {
        const cookId = toText(c?.cook_id ?? c?.id);
        if (!cookId) continue;

        const fullName = toText(c?.full_name ?? c?.name);
        const password = toText(c?.password);
        const status = normalizeCookStatus(c?.status, null) || (c?.active === false ? "inactive" : "active");

        const [exists] = await conn.query("SELECT id FROM cooks WHERE cook_id = ? LIMIT 1", [cookId]);
        if (exists.length > 0) {
          const updates = [];
          const params = [];

          if (fullName) {
            updates.push("full_name = ?");
            params.push(fullName);
          }

          if (status) {
            updates.push("status = ?");
            params.push(status);
          }

          if (password) {
            const passwordHash = await hashPassword(password);
            updates.push("password_hash = ?");
            params.push(passwordHash);
          }

          if (updates.length > 0) {
            params.push(exists[0].id);
            await conn.query(`UPDATE cooks SET ${updates.join(", ")} WHERE id = ?`, params);
          }
          continue;
        }

        if (!password) continue;
        const passwordHash = await hashPassword(password);
        await conn.query(
          "INSERT INTO cooks (cook_id, password_hash, full_name, phone, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
          [cookId, passwordHash, fullName || cookId, null, status || "active"]
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function syncState(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { status: 400, body: { success: false, message: "Invalid JSON payload" } };
  }

  const sql = `
    INSERT INTO app_state (state_key, state_value)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE
      state_value = VALUES(state_value),
      updated_at = CURRENT_TIMESTAMP
  `;

  const saved = [];
  for (const key of ["menus", "orders", "payments", "reviews", "cooks", "session"]) {
    if (!(key in payload)) continue;
    await pool.query(sql, [key, JSON.stringify(payload[key])]);
    saved.push(key);
  }

  await syncRelationalTables(payload);

  return {
    status: 200,
    body: {
      success: true,
      saved_keys: saved,
      saved_at: new Date().toISOString()
    }
  };
}

async function getState() {
  const [rows] = await pool.query("SELECT state_key, state_value, updated_at FROM app_state ORDER BY state_key ASC");
  const data = {};
  for (const row of rows) {
    data[row.state_key] = {
      value: safeJsonParse(row.state_value, row.state_value),
      updated_at: row.updated_at
    };
  }
  return data;
}

app.use(express.json({ limit: "10mb" }));
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

app.use(express.static(path.join(__dirname, "views")));
app.use(express.static(path.join(__dirname)));

app.get("/api/health", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT NOW() AS now_time");
    res.json({ success: true, database: activeDbConfig.database, now: rows[0]?.now_time || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/state/sync", async (req, res) => {
  try {
    const out = await syncState(req.body);
    res.status(out.status).json(out.body);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/state", async (_req, res) => {
  try {
    const data = await getState();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get(["/api/get_session.php", "/restaurant-system/api/get_session.php"], (req, res) => {
  res.json({ logged_in: Boolean(req.session?.user_type), user_type: req.session?.user_type || null });
});

app.post("/restaurant-system/api/customer_login.php", async (req, res) => {
  try {
    const tableNumber = toInt(req.body?.table_number, 0);
    if (!tableNumber) {
      return res.status(400).json({ success: false, message: "Please enter table number" });
    }

    const sessionId = `CUST_${Math.floor(Date.now() / 1000)}_${Math.floor(1000 + Math.random() * 9000)}`;
    await pool.query(
      "INSERT INTO customer_sessions (session_id, table_number, status) VALUES (?, ?, 'active')",
      [sessionId, tableNumber]
    );

    req.session.user_type = "customer";
    req.session.session_id = sessionId;
    req.session.table_number = tableNumber;

    res.json({
      success: true,
      user_id: sessionId,
      timestamp: toMysqlDate(new Date()),
      table_number: tableNumber,
      message: "Login successful"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/restaurant-system/api/cook_register.php", async (req, res) => {
  try {
    const cookId = toText(req.body?.cook_id);
    const password = toText(req.body?.password);
    const fullName = toText(req.body?.full_name);
    const phone = toText(req.body?.phone);

    if (!cookId || !password || !fullName) {
      return res.status(400).json({ success: false, message: "Please provide Cook ID, password, and full name" });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, message: "Password must be at least 4 characters" });
    }

    const [exists] = await pool.query("SELECT id FROM cooks WHERE cook_id = ? LIMIT 1", [cookId]);
    if (exists.length > 0) {
      return res.status(409).json({ success: false, message: "This Cook ID already exists" });
    }

    const passwordHash = await hashPassword(password);
    await pool.query(
      "INSERT INTO cooks (cook_id, password_hash, full_name, phone, status, created_at) VALUES (?, ?, ?, ?, 'active', NOW())",
      [cookId, passwordHash, fullName, phone]
    );

    res.json({ success: true, message: `Registration for ${cookId} successful!`, cook_id: cookId, full_name: fullName });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/restaurant-system/api/cook_login.php", async (req, res) => {
  try {
    const cookId = toText(req.body?.cook_id);
    const password = toText(req.body?.password);
    if (!cookId || !password) {
      return res.status(400).json({ success: false, message: "Please enter Cook ID and password" });
    }

    const [rows] = await pool.query("SELECT * FROM cooks WHERE cook_id = ? AND status = 'active' LIMIT 1", [cookId]);
    const cook = rows[0];
    if (!cook || !(await verifyPassword(password, String(cook.password_hash || "")))) {
      return res.status(401).json({ success: false, message: "Cook ID or password is incorrect" });
    }

    req.session.user_type = "cook";
    req.session.cook_id = cook.cook_id;
    req.session.cook_name = cook.full_name;
    req.session.cook_db_id = cook.id;

    res.json({ success: true, message: "Login successful", cook_id: cook.cook_id, full_name: cook.full_name });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/restaurant-system/api/admin_login.php", async (req, res) => {
  try {
    const username = toText(req.body?.username);
    const password = toText(req.body?.password);
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Please enter username and password" });
    }

    const [rows] = await pool.query("SELECT * FROM admin WHERE username = ? LIMIT 1", [username]);
    const admin = rows[0];
    if (!admin || !(await verifyPassword(password, String(admin.password_hash || "")))) {
      return res.status(401).json({ success: false, message: "Username or password is incorrect" });
    }

    req.session.user_type = "admin";
    req.session.admin_id = admin.id;
    req.session.admin_username = admin.username;
    req.session.admin_logged_in = true;

    res.json({ success: true, message: "Admin login successful", username: admin.username });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/restaurant-system/api/staff_login.php", async (req, res) => {
  try {
    const username = toText(req.body?.username);
    const password = toText(req.body?.password);
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Please enter username and password" });
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

    const [cooks] = await pool.query("SELECT * FROM cooks WHERE cook_id = ? AND status = 'active' LIMIT 1", [username]);
    const cook = cooks[0];
    if (cook && (await verifyPassword(password, String(cook.password_hash || "")))) {
      req.session.user_type = "cook";
      req.session.cook_id = cook.cook_id;
      req.session.cook_name = cook.full_name;
      req.session.cook_db_id = cook.id;
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

app.post("/restaurant-system/api/admin_logout.php", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logout successful" });
  });
});

app.get(["/api/cooks", "/restaurant-system/api/admin_cooks.php"], async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, cook_id, full_name, phone, status, created_at FROM cooks ORDER BY id DESC"
    );
    res.json({ success: true, cooks: rows.map(mapCookRow) });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post(["/api/cooks", "/restaurant-system/api/admin_cooks.php"], async (req, res) => {
  try {
    const cookId = toText(req.body?.cook_id ?? req.body?.id);
    const password = toText(req.body?.password);
    const fullName = toText(req.body?.full_name ?? req.body?.name);
    const phone = toText(req.body?.phone);
    const status = normalizeCookStatus(req.body?.status, "active");

    if (!cookId || !password || !fullName) {
      return res.status(400).json({ success: false, message: "Please provide Cook ID, password, and full name" });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, message: "Password must be at least 4 characters" });
    }

    const [exists] = await pool.query("SELECT id FROM cooks WHERE cook_id = ? LIMIT 1", [cookId]);
    if (exists.length > 0) {
      return res.status(409).json({ success: false, message: "This Cook ID already exists" });
    }

    const passwordHash = await hashPassword(password);
    await pool.query(
      "INSERT INTO cooks (cook_id, password_hash, full_name, phone, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [cookId, passwordHash, fullName, phone, status]
    );

    const [rows] = await pool.query(
      "SELECT id, cook_id, full_name, phone, status, created_at FROM cooks WHERE cook_id = ? LIMIT 1",
      [cookId]
    );
    return res.status(201).json({ success: true, cook: rows[0] ? mapCookRow(rows[0]) : null });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.patch(["/api/cooks/:cookId/status", "/restaurant-system/api/admin_cooks.php/:cookId/status"], async (req, res) => {
  try {
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

app.put(["/api/cooks/:cookId", "/restaurant-system/api/admin_cooks.php/:cookId"], async (req, res) => {
  try {
    const cookId = toText(req.params?.cookId);
    const fullName = toText(req.body?.full_name ?? req.body?.name);
    const password = toText(req.body?.password);
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
    if (password) {
      if (password.length < 4) {
        return res.status(400).json({ success: false, message: "Password must be at least 4 characters" });
      }
      const passwordHash = await hashPassword(password);
      updates.push("password_hash = ?");
      params.push(passwordHash);
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
      "SELECT id, cook_id, full_name, phone, status, created_at FROM cooks WHERE cook_id = ? LIMIT 1",
      [cookId]
    );
    return res.json({ success: true, cook: rows[0] ? mapCookRow(rows[0]) : null });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.delete(["/api/cooks/:cookId", "/restaurant-system/api/admin_cooks.php/:cookId"], async (req, res) => {
  try {
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

app.post("/restaurant-system/api/sync_state.php", async (req, res) => {
  try {
    const out = await syncState(req.body);
    res.status(out.status).json(out.body);
  } catch (err) {
    res.status(500).json({ success: false, message: `Sync failed: ${err.message}` });
  }
});

app.get("/restaurant-system/api/get_state.php", async (_req, res) => {
  try {
    const data = await getState();
    res.json({ success: true, data, mirrors: {}, server_time: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, message: `Load state failed: ${err.message}` });
  }
});

app.all(/^\/restaurant-system\/api\/.*\.php$/, (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }
  return res.status(404).json({ success: false, message: "Endpoint not implemented" });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

async function start() {
  await resolveDatabaseConfig();
  await ensureDatabase();
  setPool(mysql.createPool({
    ...activeDbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }));
  await ensureTables();

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
