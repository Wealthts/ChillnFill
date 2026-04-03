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
  database: process.env.DB_NAME || "restaurant_system",
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
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["active", "enabled", "enable", "1", "true"].includes(raw))
    return "active";
  if (["inactive", "disabled", "disable", "0", "false"].includes(raw))
    return "inactive";
  return fallback;
}

function normalizeMenuAvailability(value, fallback = null) {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value ? 1 : 0;

  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (
    ["1", "true", "yes", "available", "enabled", "enable", "active"].includes(
      raw,
    )
  )
    return 1;
  if (
    [
      "0",
      "false",
      "no",
      "unavailable",
      "disabled",
      "disable",
      "inactive",
    ].includes(raw)
  )
    return 0;
  return fallback;
}

function isDefaultAdminCredential(username, password) {
  return (
    toText(username).toLowerCase() === "admin" &&
    String(password ?? "") === "0000"
  );
}

function mapCookRow(row) {
  return {
    id: row.id,
    cook_id: row.cook_id,
    full_name: row.full_name,
    phone: row.phone,
    status: row.status,
    created_at: row.created_at,
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
    password: activeDbConfig.password,
  });

  await bootstrap.query(
    `CREATE DATABASE IF NOT EXISTS \`${activeDbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`,
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
        password: candidate.password,
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
    sort_order: 1,
  },
  {
    name: "Tom Yum Goong",
    thai_name: "ต้มยำกุ้ง",
    category_code: "tomyum",
    price: 120,
    description: "Clear spicy shrimp tom yum soup",
    option_keys: ["spice"],
    image_url: "../media/tomyumkung.jpg",
    sort_order: 2,
  },
  {
    name: "Pad Thai",
    thai_name: "ผัดไทย",
    category_code: "single",
    price: 70,
    description: "Thai stir-fried noodles with shrimp",
    option_keys: ["spice"],
    image_url: "../media/padthai.jpg",
    sort_order: 3,
  },
  {
    name: "Hainanese Chicken Rice",
    thai_name: "ข้าวมันไก่",
    category_code: "single",
    price: 60,
    description: "Steamed chicken rice with special sauce",
    option_keys: [],
    image_url: "../media/hainanesechickenrice.jpg",
    sort_order: 4,
  },
  {
    name: "Som Tam Thai",
    thai_name: "ส้มตำไทย",
    category_code: "salad",
    price: 55,
    description: "Spicy green papaya salad",
    option_keys: ["spice"],
    image_url: "../media/somtamthai.jpg",
    sort_order: 5,
  },
  {
    name: "Korean BBQ Beef",
    thai_name: "เนื้อย่างเกาหลี",
    category_code: "main",
    price: 180,
    description: "Korean-style marinated grilled beef",
    option_keys: ["doneness"],
    image_url: "../media/koreanbbq.jpg",
    sort_order: 6,
  },
  {
    name: "Beef Basil",
    thai_name: "กะเพราเนื้อ",
    category_code: "single",
    price: 85,
    description: "Minced beef basil with fried egg",
    option_keys: ["spice"],
    image_url: "../media/beefbasil.jpg",
    sort_order: 7,
  },
  {
    name: "Lime Juice",
    thai_name: "น้ำมะนาว",
    category_code: "drink",
    price: 25,
    description: "Fresh lime juice",
    option_keys: ["sweet", "ice"],
    image_url: "../media/limejuice.jpg",
    sort_order: 8,
  },
  {
    name: "Green Tea",
    thai_name: "ชาเขียว",
    category_code: "drink",
    price: 30,
    description: "Iced green tea",
    option_keys: ["sweet", "ice"],
    image_url: "../media/greentea.jpg",
    sort_order: 9,
  },
  {
    name: "Ice Cream",
    thai_name: "ไอศครีม",
    category_code: "dessert",
    price: 35,
    description: "Vanilla ice cream",
    option_keys: ["size"],
    image_url: "../media/Icecream.jpg",
    sort_order: 10,
  },
  {
    name: "Crispy Pork Basil",
    thai_name: "กะเพราหมูกรอบ",
    category_code: "single",
    price: 70,
    description: "Crispy pork basil rice",
    option_keys: ["spice"],
    image_url: "../media/crispyporkbasil.jpg",
    sort_order: 11,
  },
  {
    name: "Seafood Tom Yum",
    thai_name: "ต้มยำทะเล",
    category_code: "tomyum",
    price: 150,
    description: "Mixed seafood tom yum soup",
    option_keys: ["spice"],
    image_url: "../media/seafoodtomyum.jpg",
    sort_order: 12,
  },
  {
    name: "Soda",
    thai_name: "น้ำอัดลม",
    category_code: "drink",
    price: 20,
    description: "Soda, Coke, Sprite",
    option_keys: ["sweet", "ice"],
    image_url: "../media/soda.jpg",
    sort_order: 13,
  },
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
    must_set_password TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);
  await pool.query(`
  ALTER TABLE cooks
    MODIFY password_hash VARCHAR(255) NULL
`);

  await pool.query(`
  ALTER TABLE cooks
    ADD COLUMN IF NOT EXISTS must_set_password TINYINT(1) NOT NULL DEFAULT 1
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

  const [adminCounts] = await pool.query("SELECT COUNT(*) AS total FROM admin");
  if (toInt(adminCounts[0]?.total, 0) === 0) {
    const adminHash = await hashPassword("0000");
    await pool.query(
      "INSERT INTO admin (username, password_hash, created_at) VALUES (?, ?, NOW())",
      ["admin", adminHash],
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
          toInt(item.sort_order, 0),
        ],
      );
    }
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
    [sessionId, toInt(tableNumber, 0)],
  );
}

async function syncRelationalTables(payload) {
  if (!pool || typeof pool.getConnection !== "function") return;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let menuRows = [];
    try {
      const [rows] = await conn.query(
        "SELECT id, name FROM menu ORDER BY id ASC",
      );
      menuRows = rows;
    } catch {
      menuRows = [];
    }
    const menuIds = new Set(menuRows.map((r) => Number(r.id)));
    const menuByName = new Map(
      menuRows.map((r) => [
        String(r.name || "")
          .trim()
          .toLowerCase(),
        Number(r.id),
      ]),
    );
    const fallbackMenuId = menuRows.length ? Number(menuRows[0].id) : null;

    if (Array.isArray(payload.payments)) {
      for (const p of payload.payments) {
        const paymentRef = toText(p?.id);
        if (!paymentRef) continue;

        const sessionId = normalizeSessionId(
          p?.userId ?? payload?.session?.user_id,
          p?.table ?? payload?.session?.table_number,
        );
        const tableNumber = toInt(
          p?.table ?? payload?.session?.table_number,
          0,
        );
        await upsertCustomerSession(conn, sessionId, tableNumber);

        const [rows] = await conn.query(
          "SELECT id FROM payments WHERE payment_reference = ? LIMIT 1",
          [paymentRef],
        );
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
              toMysqlDate(p?.reviewSubmittedAt),
            ],
          );
        }
      }
    }

    if (Array.isArray(payload.orders)) {
      for (const o of payload.orders) {
        const orderNumber = toText(o?.id);
        if (!orderNumber) continue;

        const sessionId = normalizeSessionId(
          o?.userId ?? payload?.session?.user_id,
          o?.table ?? payload?.session?.table_number,
        );
        const tableNumber = toInt(
          o?.table ?? payload?.session?.table_number,
          0,
        );
        await upsertCustomerSession(conn, sessionId, tableNumber);

        let linkedPaymentId = null;
        const paymentRef = toText(o?.paymentId);
        if (paymentRef) {
          const [paymentRows] = await conn.query(
            "SELECT id FROM payments WHERE payment_reference = ? LIMIT 1",
            [paymentRef],
          );
          if (paymentRows.length > 0) {
            linkedPaymentId = paymentRows[0].id;
          }
        }

        const [orderRows] = await conn.query(
          "SELECT id FROM orders WHERE order_number = ? LIMIT 1",
          [orderNumber],
        );
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
              orderId,
            ],
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
              toMysqlDate(o?.time),
            ],
          );
          orderId = ins.insertId;
        }

        const items = Array.isArray(o?.items) ? o.items : [];
        for (const item of items) {
          const qty = Math.max(1, toInt(item?.qty, 1));
          const unitPrice = toNumber(item?.price, 0);
          const subtotal = qty * unitPrice;
          const notes = [toText(item?.optionsText), toText(item?.customerNote)]
            .filter(Boolean)
            .join(" | ");
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
            [orderId, itemName, qty, unitPrice, subtotal, notes],
          );
          if (exists.length > 0) continue;

          await conn.query(
            `
              INSERT INTO order_items (order_id, menu_id, item_name, quantity, unit_price, subtotal, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [orderId, menuId, itemName, qty, unitPrice, subtotal, notes],
          );
        }
      }
    }

    if (Array.isArray(payload.reviews)) {
      for (const r of payload.reviews) {
        const paymentRef = toText(r?.paymentId);
        if (!paymentRef) continue;

        const [payRows] = await conn.query(
          "SELECT id FROM payments WHERE payment_reference = ? LIMIT 1",
          [paymentRef],
        );
        if (payRows.length === 0) continue;
        const paymentId = payRows[0].id;

        const sessionId = normalizeSessionId(
          r?.userId ?? payload?.session?.user_id,
          r?.table ?? payload?.session?.table_number,
        );
        const tableNumber = toInt(
          r?.table ?? payload?.session?.table_number,
          0,
        );
        await upsertCustomerSession(conn, sessionId, tableNumber);

        const [exists] = await conn.query(
          "SELECT id FROM reviews WHERE payment_id = ? AND session_id = ? LIMIT 1",
          [paymentId, sessionId],
        );

        if (exists.length > 0) {
          await conn.query(
            `
              UPDATE reviews
              SET rating = ?, comment = ?, table_number = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            [
              Math.max(0, Math.min(5, toInt(r?.rating, 0))),
              toText(r?.comment),
              tableNumber,
              exists[0].id,
            ],
          );
        } else {
          await conn.query(
            `
              INSERT INTO reviews (payment_id, session_id, table_number, rating, comment, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
              paymentId,
              sessionId,
              tableNumber,
              Math.max(0, Math.min(5, toInt(r?.rating, 0))),
              toText(r?.comment),
              toMysqlDate(r?.time),
            ],
          );
        }
      }
    }
    //sync cooks syncRelationalTables(payload) ถ้า cook ใหม่ “ไม่มี password” จะ continue ทิ้ง และ insert ไม่ได้
    if (Array.isArray(payload.cooks)) {
  for (const c of payload.cooks) {
    const cookId = toText(c?.cook_id ?? c?.id);
    if (!cookId) continue;

    const fullName = toText(c?.full_name ?? c?.name) || cookId;
    const password = toText(c?.password);
    const status =
      normalizeCookStatus(c?.status, null) ||
      (c?.active === false ? "inactive" : "active");

    const [exists] = await conn.query(
      "SELECT id FROM cooks WHERE cook_id = ? LIMIT 1",
      [cookId]
    );

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

        updates.push("must_set_password = 0");
      }

      if (updates.length > 0) {
        params.push(exists[0].id);
        await conn.query(
          `UPDATE cooks SET ${updates.join(", ")} WHERE id = ?`,
          params
        );
      }

      continue;
    }

    let passwordHash = null;
    let mustSetPassword = 1;

    if (password) {
      passwordHash = await hashPassword(password);
      mustSetPassword = 0;
    }

    await conn.query(
      `INSERT INTO cooks (cook_id, password_hash, full_name, phone, status, must_set_password, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [cookId, passwordHash, fullName, null, status || "active", mustSetPassword]
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
//เพิ่ม helper หา cook
async function findCookByCookId(cookId) {
  const [rows] = await pool.query(
    `SELECT id, cook_id, password_hash, full_name, phone, status, must_set_password, created_at
     FROM cooks
     WHERE cook_id = ?
     LIMIT 1`,
    [toText(cookId)],
  );
  return rows[0] || null;
}

async function syncState(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      status: 400,
      body: { success: false, message: "Invalid JSON payload" },
    };
  }

  const sql = `
    INSERT INTO app_state (state_key, state_value)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE
      state_value = VALUES(state_value),
      updated_at = CURRENT_TIMESTAMP
  `;

  const saved = [];
  for (const key of [
    "menus",
    "orders",
    "payments",
    "reviews",
    "cooks",
    "session",
  ]) {
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
      saved_at: new Date().toISOString(),
    },
  };
}

async function getState() {
  const [rows] = await pool.query(
    "SELECT state_key, state_value, updated_at FROM app_state ORDER BY state_key ASC",
  );
  const data = {};
  for (const row of rows) {
    data[row.state_key] = {
      value: safeJsonParse(row.state_value, row.state_value),
      updated_at: row.updated_at,
    };
  }
  return data;
}

app.use(express.json({ limit: "10mb" }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "chill-n-fill-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 12,
    },
  }),
);

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
//แก้ login route /login ตอนนี้เช็คแค่ username/password แล้ว redirect เลย
app.post("/login", async function (req, res) {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).send("Please provide username and password");
    }

    const sql = `
      SELECT id, password_hash AS password, role, must_set_password
      FROM (
        SELECT id, username AS login_name, password_hash, 'admin' AS role, 0 AS must_set_password
        FROM admin

        UNION ALL

        SELECT id, cook_id AS login_name, password_hash, 'user' AS role, must_set_password
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

    const user = results[0];

    if (
      user.role === "user" &&
      (!user.password || Number(user.must_set_password) === 1)
    ) {
      return res.status(403).send("Please set password first");
    }

    const same = await verifyPassword(
      toText(password),
      String(user.password || ""),
    );
    if (!same) {
      return res.status(401).send("Wrong Password");
    }

    if (user.role === "admin") {
      return res.status(200).send("/inventory");
    }

    return res.status(200).send("/shop");
  } catch (err) {
    console.log(err);
    return res.status(500).send("Server Error");
  }
});
//เพิ่ม route สำหรับ cook ตั้งรหัสครั้งแรก
app.post("/api/cook/set-password", async function (req, res) {
  try {
    console.log("BODY /api/cooks =", req.body);
    const cookId = toText(req.body?.cook_id);
    const password = toText(req.body?.password);

    if (!cookId || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide cook_id and password",
      });
    }

    const cook = await findCookByCookId(cookId);

    if (!cook) {
      return res.status(404).json({
        success: false,
        message: "Cook ID not found",
      });
    }

    if (String(cook.status || "").toLowerCase() !== "active") {
      return res.status(403).json({
        success: false,
        message: "This cook account is disabled",
      });
    }

    if (!cook.must_set_password && cook.password_hash) {
      return res.status(409).json({
        success: false,
        message: "Password has already been set",
      });
    }

    await pool.query(
      `INSERT INTO cooks (cook_id, password_hash, full_name, phone, status, must_set_password, created_at)
   VALUES (?, NULL, ?, ?, ?, 1, NOW())`,
      [cookId, fullName, phone, status],
    );

    return res.status(200).json({
      success: true,
      message: "Password set successfully",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});
//ปิด route register เดิมของ cook
app.post("/api/cook/register", async function (req, res) {
  return res.status(403).json({
    success: false,
    message:
      "Cook cannot self-register. Please ask admin for a Cook ID, then use set password.",
  });
});

app.get("/admin/product", async function (req, res) {
  try {
    const sql =
      "SELECT *, (is_available = 1) AS available FROM menu ORDER BY id ASC";
    const [results] = await pool.query(sql);
    return res.status(200).json(results);
  } catch (err) {
    console.log(err);
    return res.status(500).send("Server error");
  }
});

app.patch("/api/menu/:menuId/status", async function (req, res) {
  try {
    const menuId = toInt(req.params?.menuId, 0);
    if (!menuId) {
      return res
        .status(400)
        .json({ success: false, message: "Menu ID is required" });
    }

    const available = normalizeMenuAvailability(
      req.body?.available ?? req.body?.is_available ?? req.body?.enabled,
      null,
    );
    if (available === null) {
      return res
        .status(400)
        .json({
          success: false,
          message: "available/is_available must be true or false",
        });
    }

    const [out] = await pool.query(
      "UPDATE menu SET is_available = ? WHERE id = ?",
      [available, menuId],
    );
    if (out.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Menu not found" });
    }

    return res.json({
      success: true,
      id: menuId,
      is_available: available,
      available: Boolean(available),
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: `Error: ${err.message}` });
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
  res
    .status(200)
    .sendFile(path.join(__dirname, "views", "login_customer.html"));
});

app.get("/login-cook", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "views", "login_cook.html"));
});

app.get("/register-cook", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "views", "register_cook.html"));
});

app.get("/api/health", async function (req, res) {
  try {
    const [rows] = await pool.query("SELECT NOW() AS now_time");
    res.json({
      success: true,
      database: activeDbConfig.database,
      now: rows[0]?.now_time || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/state/sync", async function (req, res) {
  try {
    const out = await syncState(req.body);
    res.status(out.status).json(out.body);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/state", async function (req, res) {
  try {
    const data = await getState();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/session", function (req, res) {
  res.json({
    logged_in: Boolean(req.session?.user_type),
    user_type: req.session?.user_type || null,
  });
});

app.post("/api/customer/login", async function (req, res) {
  try {
    const tableNumber = toInt(req.body?.table_number, 0);
    if (!tableNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter table number" });
    }

    const sessionId = `CUST_${Math.floor(Date.now() / 1000)}_${Math.floor(1000 + Math.random() * 9000)}`;
    await pool.query(
      "INSERT INTO customer_sessions (session_id, table_number, status) VALUES (?, ?, 'active')",
      [sessionId, tableNumber],
    );

    req.session.user_type = "customer";
    req.session.session_id = sessionId;
    req.session.table_number = tableNumber;

    res.json({
      success: true,
      user_id: sessionId,
      timestamp: toMysqlDate(new Date()),
      table_number: tableNumber,
      message: "Login successful",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/api/cook/register", async function (req, res) {
  try {
    const cookId = toText(req.body?.cook_id);
    const password = toText(req.body?.password);
    const fullName = toText(req.body?.full_name);
    const phone = toText(req.body?.phone);

    if (!cookId || !password || !fullName) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Please provide Cook ID, password, and full name",
        });
    }
    if (password.length < 4) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 4 characters",
        });
    }

    const [exists] = await pool.query(
      "SELECT id FROM cooks WHERE cook_id = ? LIMIT 1",
      [cookId],
    );
    if (exists.length > 0) {
      return res
        .status(409)
        .json({ success: false, message: "This Cook ID already exists" });
    }

    const passwordHash = await hashPassword(password);
    await pool.query(
      "INSERT INTO cooks (cook_id, password_hash, full_name, phone, status, created_at) VALUES (?, ?, ?, ?, 'active', NOW())",
      [cookId, passwordHash, fullName, phone],
    );

    res.json({
      success: true,
      message: `Registration for ${cookId} successful!`,
      cook_id: cookId,
      full_name: fullName,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/api/cook/login", async function (req, res) {
  try {
    const cookId = toText(req.body?.cook_id);
    const password = toText(req.body?.password);
    if (!cookId || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter Cook ID and password" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM cooks WHERE cook_id = ? AND status = 'active' LIMIT 1",
      [cookId],
    );
    const cook = rows[0];
    if (
      !cook ||
      !(await verifyPassword(password, String(cook.password_hash || "")))
    ) {
      return res
        .status(401)
        .json({ success: false, message: "Cook ID or password is incorrect" });
    }

    req.session.user_type = "cook";
    req.session.cook_id = cook.cook_id;
    req.session.cook_name = cook.full_name;
    req.session.cook_db_id = cook.id;

    res.json({
      success: true,
      message: "Login successful",
      cook_id: cook.cook_id,
      full_name: cook.full_name,
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
      return res
        .status(400)
        .json({
          success: false,
          message: "Please enter username and password",
        });
    }

    const [rows] = await pool.query(
      "SELECT * FROM admin WHERE username = ? LIMIT 1",
      [username],
    );
    const admin = rows[0];
    const allowDefaultFallback = isDefaultAdminCredential(username, password);
    const passwordMatched = admin
      ? await verifyPassword(password, String(admin.password_hash || ""))
      : false;
    if (!passwordMatched && !allowDefaultFallback) {
      return res
        .status(401)
        .json({ success: false, message: "Username or password is incorrect" });
    }

    req.session.user_type = "admin";
    req.session.admin_id = admin?.id || 0;
    req.session.admin_username = admin?.username || "admin";
    req.session.admin_logged_in = true;

    res.json({
      success: true,
      message: "Admin login successful",
      username: admin?.username || "admin",
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
      return res
        .status(400)
        .json({
          success: false,
          message: "Please enter username and password",
        });
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
        username: "admin",
      });
    }

    const [admins] = await pool.query(
      "SELECT * FROM admin WHERE username = ? LIMIT 1",
      [username],
    );
    const admin = admins[0];
    if (
      admin &&
      (await verifyPassword(password, String(admin.password_hash || "")))
    ) {
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
        username: admin.username,
      });
    }

    const [cooks] = await pool.query(
      "SELECT * FROM cooks WHERE cook_id = ? AND status = 'active' LIMIT 1",
      [username],
    );
    const cook = cooks[0];
    if (
      cook &&
      (await verifyPassword(password, String(cook.password_hash || "")))
    ) {
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
        full_name: cook.full_name,
      });
    }

    return res
      .status(401)
      .json({ success: false, message: "Username or password is incorrect" });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

function handleLogout(req, res) {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true, message: "Logout successful" });
  });
}

app.post("/api/logout", handleLogout);
app.post("/api/admin/logout", handleLogout);

app.get("/api/cooks", async function (req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT id, cook_id, full_name, phone, status, created_at FROM cooks ORDER BY id DESC",
    );
    res.json({ success: true, cooks: rows.map(mapCookRow) });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.post("/api/cooks", async function (req, res) {
  try {
    const cookId = toText(req.body?.cook_id ?? req.body?.id);
    const fullName = toText(req.body?.full_name ?? req.body?.name);
    const phone = toText(req.body?.phone);
    const status = normalizeCookStatus(req.body?.status, "active");

    if (!cookId || !fullName) {
      return res.status(400).json({
        success: false,
        message: "Please provide Cook ID and full name",
      });
    }

    const [exists] = await pool.query(
      "SELECT id FROM cooks WHERE cook_id = ? LIMIT 1",
      [cookId],
    );

    if (exists.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This Cook ID already exists",
      });
    }

    await pool.query(
      `INSERT INTO cooks (cook_id, password_hash, full_name, phone, status, must_set_password, created_at)
       VALUES (?, NULL, ?, ?, ?, 1, NOW())`,
      [cookId, fullName, phone, status],
    );

    const [rows] = await pool.query(
      "SELECT id, cook_id, full_name, phone, status, created_at FROM cooks WHERE cook_id = ? LIMIT 1",
      [cookId],
    );

    return res.status(201).json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    console.error("Create cook error:", err);
    return res.status(500).json({
      success: false,
      message: "Unable to create cook",
    });
  }
});

app.patch("/api/cooks/:cookId/status", async function (req, res) {
  try {
    const cookId = toText(req.params?.cookId);
    const status = normalizeCookStatus(
      req.body?.status,
      req.body?.active === false ? "inactive" : "active",
    );
    if (!cookId) {
      return res
        .status(400)
        .json({ success: false, message: "Cook ID is required" });
    }

    const [out] = await pool.query(
      "UPDATE cooks SET status = ? WHERE cook_id = ?",
      [status, cookId],
    );
    if (out.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Cook not found" });
    }
    return res.json({ success: true, cook_id: cookId, status });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: `Error: ${err.message}` });
  }
});

app.put("/api/cooks/:cookId", async function (req, res) {
  try {
    const cookId = toText(req.params?.cookId);
    const fullName = toText(req.body?.full_name ?? req.body?.name);
    const password = toText(req.body?.password);
    const phone = toText(req.body?.phone, null);
    const status = req.body?.status
      ? normalizeCookStatus(req.body?.status, "active")
      : null;
    if (!cookId) {
      return res
        .status(400)
        .json({ success: false, message: "Cook ID is required" });
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
        return res
          .status(400)
          .json({
            success: false,
            message: "Password must be at least 4 characters",
          });
      }
      const passwordHash = await hashPassword(password);
      updates.push("password_hash = ?");
      params.push(passwordHash);
    }

    if (updates.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    params.push(cookId);
    const [out] = await pool.query(
      `UPDATE cooks SET ${updates.join(", ")} WHERE cook_id = ?`,
      params,
    );
    if (out.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Cook not found" });
    }

    const [rows] = await pool.query(
      "SELECT id, cook_id, full_name, phone, status, created_at FROM cooks WHERE cook_id = ? LIMIT 1",
      [cookId],
    );
    return res.json({
      success: true,
      cook: rows[0] ? mapCookRow(rows[0]) : null,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: `Error: ${err.message}` });
  }
});

app.delete("/api/cooks/:cookId", async function (req, res) {
  try {
    const cookId = toText(req.params?.cookId);
    if (!cookId) {
      return res
        .status(400)
        .json({ success: false, message: "Cook ID is required" });
    }

    const [out] = await pool.query("DELETE FROM cooks WHERE cook_id = ?", [
      cookId,
    ]);
    if (out.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Cook not found" });
    }

    return res.json({ success: true, cook_id: cookId });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: `Error: ${err.message}` });
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
    // 1. Make sure the user is actually a logged-in customer
    if (req.session?.user_type !== "customer") {
      return res
        .status(401)
        .json({
          success: false,
          message: "Only logged-in customers can place orders.",
        });
    }

    const sessionId = req.session.session_id;
    const tableNumber = req.session.table_number;
    const { notes, items } = req.body || {};

    // 2. Validate the request
    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Order must contain at least one item.",
        });
    }

    // 3. Create a unique order number (using timestamp for simplicity)
    const orderNumber = Date.now().toString();

    // 4. Insert the main order into the database
    const [orderResult] = await pool.query(
      "INSERT INTO orders (order_number, session_id, table_number, status, notes) VALUES (?, ?, ?, 'pending', ?)",
      [orderNumber, sessionId, tableNumber, notes || ""],
    );

    const orderId = orderResult.insertId;

    // (Note: In a fully finished version, you would also write a loop here
    // to insert each individual item into the `order_items` table and calculate the total price).

    // 5. Send success response
    res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      order_id: orderId,
      order_number: orderNumber,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.get("/api/orders", async function (req, res) {
  try {
    // 1. Check if the user is filtering by status (e.g., /api/orders?status=pending)
    const statusFilter = req.query.status;
    let query = "SELECT * FROM orders";
    let params = [];

    if (statusFilter) {
      query += " WHERE status = ?";
      params.push(statusFilter);
    }

    // Order by newest first
    query += " ORDER BY created_at DESC";

    // 2. Fetch the main orders
    const [orders] = await pool.query(query, params);

    // 3. If we have orders, fetch their items and attach them
    if (orders.length > 0) {
      const orderIds = orders.map((o) => o.id);

      // Fetch all items that belong to the orders we just found
      const [items] = await pool.query(
        "SELECT * FROM order_items WHERE order_id IN (?)",
        [orderIds],
      );

      // Map the items into their respective order objects
      orders.forEach((order) => {
        order.items = items.filter((item) => item.order_id === order.id);
      });
    }

    // 4. Send the response
    res.status(200).json({
      success: true,
      orders: orders,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.patch("/api/orders/:orderId/status", async function (req, res) {
  try {
    const orderId = req.params.orderId;
    const newStatus = req.body.status;

    // 1. Validate the request
    if (!newStatus) {
      return res
        .status(400)
        .json({ success: false, message: "Status is required" });
    }

    // Optional: Ensure it's a valid status word
    const allowedStatuses = ["pending", "serving", "completed", "cancelled"];
    if (!allowedStatuses.includes(newStatus)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    // 2. Update the order in the database
    const [result] = await pool.query(
      "UPDATE orders SET status = ? WHERE id = ?",
      [newStatus, orderId],
    );

    // 3. Check if the order actually existed
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // 4. Send the success response
    res.status(200).json({
      success: true,
      message: `Order #${orderId} status updated to ${newStatus}`,
      order_id: orderId,
      status: newStatus,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

app.get("/api/orders/:orderId", async function (req, res) {
  try {
    const orderId = req.params.orderId;

    // 1. Fetch the main order details
    const [orders] = await pool.query("SELECT * FROM orders WHERE id = ?", [
      orderId,
    ]);

    // If the order doesn't exist, return a 404
    if (orders.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const order = orders[0];

    // 2. Fetch the items for this specific order
    const [items] = await pool.query(
      "SELECT * FROM order_items WHERE order_id = ?",
      [orderId],
    );

    // 3. Attach the items to the order object
    order.items = items;

    // 4. Send the response
    res.status(200).json({
      success: true,
      order: order,
    });
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
    const { order_id, method, amount } = req.body;

    if (!order_id || !method || amount === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required payment details" });
    }

    // Generate a unique payment reference string
    const paymentRef = Date.now().toString();
    const sessionId = req.session?.session_id || null;
    const tableNumber = req.session?.table_number || null;

    // 1. Insert into payments table
    const [paymentResult] = await pool.query(
      "INSERT INTO payments (payment_reference, session_id, table_number, amount, method, status) VALUES (?, ?, ?, ?, ?, 'paid')",
      [paymentRef, sessionId, tableNumber, amount, method],
    );
    const paymentId = paymentResult.insertId;

    // 2. Update the order to mark it as paid
    await pool.query(
      "UPDATE orders SET payment_id = ?, payment_status = 'paid', payment_method = ?, paid_at = NOW() WHERE id = ?",
      [paymentId, method, order_id],
    );

    res.status(201).json({
      success: true,
      message: "Payment processed successfully",
      payment_id: paymentId,
      payment_reference: paymentRef,
      status: "paid",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

// Get Payment History
app.get("/api/payments", async function (req, res) {
  try {
    const [payments] = await pool.query(
      "SELECT * FROM payments ORDER BY created_at DESC",
    );
    res.status(200).json({ success: true, payments });
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
      return res
        .status(400)
        .json({
          success: false,
          message: "Payment ID and rating are required",
        });
    }

    const sessionId = req.session?.session_id || null;
    const tableNumber = req.session?.table_number || null;

    // 1. Insert the review into the database
    const [reviewResult] = await pool.query(
      "INSERT INTO reviews (payment_id, session_id, table_number, rating, comment) VALUES (?, ?, ?, ?, ?)",
      [payment_id, sessionId, tableNumber, rating, comment || ""],
    );

    // 2. Mark the payment to show a review was submitted
    await pool.query(
      "UPDATE payments SET review_submitted_at = NOW() WHERE id = ?",
      [payment_id],
    );

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review_id: reviewResult.insertId,
    });
  } catch (err) {
    // If the database complains about a duplicate payment_id (user already left a review)
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({
          success: false,
          message: "Review already submitted for this payment",
        });
    }
    console.log(err);
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

// Get All Reviews
app.get("/api/reviews", async function (req, res) {
  try {
    const [reviews] = await pool.query(
      "SELECT * FROM reviews ORDER BY created_at DESC",
    );
    res.status(200).json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: `Error: ${err.message}` });
  }
});

async function start() {
  await resolveDatabaseConfig();
  await ensureDatabase();
  setPool(
    mysql.createPool({
      ...activeDbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    }),
  );
  await ensureTables();

  app.listen(PORT, () => {
    console.log(`Chill n Fill server running at http://localhost:${PORT}`);
    console.log(
      `MySQL: ${activeDbConfig.user}@${activeDbConfig.host}:${activeDbConfig.port}/${activeDbConfig.database}`,
    );
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
  hashPassword,
};
// เปลี่ยนสถานะโต๊ะเป็น "occupied"
app.post("/api/tables/occupy", async function (req, res) {
  const { table_id } = req.body; // table_id จะใช้เป็น `id` ในฐานข้อมูล

  if (!table_id) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid table ID"
    });
  }

  try {
    console.log(`Updating table ${table_id} status to occupied`);

    // ใช้ `id` แทน `table_id` ในคำสั่ง SQL
    await pool.query(
      "UPDATE tables SET status = ? WHERE id = ?",
      ["occupied", table_id]
    );

    res.status(200).json({
      success: true,
      message: "Table status updated to occupied"
    });
  } catch (err) {
    console.error("Error while updating table status:", err);
    res.status(500).json({
      success: false,
      message: "Unable to update table status"
    });
  }
});
