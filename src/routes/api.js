const express = require('express');
const bcrypt = require('bcryptjs');
const { query, getConnection } = require('../config/database');

const router = express.Router();

function generateCustomerSessionId() {
  return `CUST_${Date.now()}_${Math.floor(Math.random() * 9000) + 1000}`;
}

function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 9000) + 1000;
  return `ORD${datePart}${randomPart}`;
}

function jsonResponse(res, payload, status = 200) {
  return res.status(status).json(payload);
}

router.get('/get_session.php', (req, res) => {
  jsonResponse(res, {
    logged_in: Boolean(req.session.user_type),
    user_type: req.session.user_type || null
  });
});

router.get('/menu.php', async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, name, category, price, description, image_url, is_available, created_at FROM menu WHERE is_available = TRUE ORDER BY id ASC'
    );
    jsonResponse(res, { success: true, menu: rows });
  } catch (error) {
    jsonResponse(res, { success: false, message: error.message }, 500);
  }
});

router.get('/orders.php', async (req, res) => {
  try {
    const rows = await query(
      `SELECT o.id, o.order_number, o.session_id, o.table_number, o.cook_id, o.total_amount, o.status, o.notes, o.created_at,
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', oi.id,
                  'menu_id', oi.menu_id,
                  'item_name', oi.item_name,
                  'quantity', oi.quantity,
                  'unit_price', oi.unit_price,
                  'subtotal', oi.subtotal,
                  'notes', oi.notes
                )
              ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    );
    jsonResponse(res, { success: true, orders: rows });
  } catch (error) {
    jsonResponse(res, { success: false, message: error.message }, 500);
  }
});

router.post('/customer_login.php', async (req, res) => {
  const tableNumber = Number(req.body.table_number);
  if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
    return jsonResponse(res, { success: false, message: 'Please provide a valid table number' }, 400);
  }

  try {
    const sessionId = generateCustomerSessionId();
    await query(
      'INSERT INTO customer_sessions (session_id, table_number, status) VALUES (?, ?, ?)',
      [sessionId, tableNumber, 'active']
    );

    req.session.user_type = 'customer';
    req.session.session_id = sessionId;
    req.session.table_number = tableNumber;

    jsonResponse(res, {
      success: true,
      user_id: sessionId,
      table_number: tableNumber,
      timestamp: new Date().toISOString(),
      message: 'Customer login successful'
    });
  } catch (error) {
    jsonResponse(res, { success: false, message: error.message }, 500);
  }
});

router.post('/cook_register.php', async (req, res) => {
  const cookId = String(req.body.cook_id || '').trim();
  const password = String(req.body.password || '');
  const fullName = String(req.body.full_name || '').trim();
  const phone = String(req.body.phone || '').trim();

  if (!cookId || !password || !fullName) {
    return jsonResponse(res, { success: false, message: 'Please provide cook ID, password, and full name' }, 400);
  }

  if (password.length < 4) {
    return jsonResponse(res, { success: false, message: 'Password must be at least 4 characters' }, 400);
  }

  try {
    const existing = await query('SELECT id FROM cooks WHERE cook_id = ?', [cookId]);
    if (existing.length > 0) {
      return jsonResponse(res, { success: false, message: 'Cook ID already exists' }, 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await query(
      'INSERT INTO cooks (cook_id, password_hash, full_name, phone, status) VALUES (?, ?, ?, ?, ?)',
      [cookId, passwordHash, fullName, phone || null, 'active']
    );

    jsonResponse(res, {
      success: true,
      cook_id: cookId,
      full_name: fullName,
      message: `Registered ${cookId} successfully`
    });
  } catch (error) {
    jsonResponse(res, { success: false, message: error.message }, 500);
  }
});

router.post('/cook_login.php', async (req, res) => {
  const cookId = String(req.body.cook_id || '').trim();
  const password = String(req.body.password || '');

  if (!cookId || !password) {
    return jsonResponse(res, { success: false, message: 'Please provide cook ID and password' }, 400);
  }

  try {
    const rows = await query('SELECT * FROM cooks WHERE cook_id = ? AND status = ?', [cookId, 'active']);
    const cook = rows[0];

    if (!cook) {
      return jsonResponse(res, { success: false, message: 'Cook ID or password is incorrect' }, 401);
    }

    const matches = await bcrypt.compare(password, cook.password_hash);
    if (!matches) {
      return jsonResponse(res, { success: false, message: 'Cook ID or password is incorrect' }, 401);
    }

    req.session.user_type = 'cook';
    req.session.cook_id = cook.cook_id;
    req.session.cook_name = cook.full_name;
    req.session.cook_db_id = cook.id;

    jsonResponse(res, {
      success: true,
      cook_id: cook.cook_id,
      full_name: cook.full_name,
      message: 'Cook login successful'
    });
  } catch (error) {
    jsonResponse(res, { success: false, message: error.message }, 500);
  }
});

router.post('/admin_login.php', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!username || !password) {
    return jsonResponse(res, { success: false, message: 'Please provide username and password' }, 400);
  }

  try {
    const rows = await query('SELECT * FROM admin WHERE username = ?', [username]);
    const admin = rows[0];

    if (!admin) {
      return jsonResponse(res, { success: false, message: 'Username or password is incorrect' }, 401);
    }

    const matches = await bcrypt.compare(password, admin.password_hash);
    if (!matches) {
      return jsonResponse(res, { success: false, message: 'Username or password is incorrect' }, 401);
    }

    req.session.user_type = 'admin';
    req.session.admin_id = admin.id;
    req.session.admin_username = admin.username;
    req.session.admin_logged_in = true;

    jsonResponse(res, {
      success: true,
      username: admin.username,
      message: 'Admin login successful'
    });
  } catch (error) {
    jsonResponse(res, { success: false, message: error.message }, 500);
  }
});

router.post('/staff_login.php', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!username || !password) {
    return jsonResponse(res, { success: false, message: 'Please provide username and password' }, 400);
  }

  try {
    const adminRows = await query('SELECT * FROM admin WHERE username = ?', [username]);
    const admin = adminRows[0];
    if (admin) {
      const adminOk = await bcrypt.compare(password, admin.password_hash);
      if (adminOk) {
        req.session.user_type = 'admin';
        req.session.admin_id = admin.id;
        req.session.admin_username = admin.username;

        return jsonResponse(res, {
          success: true,
          role: 'admin',
          user_type: 'admin',
          user_id: admin.username,
          message: 'Admin login successful'
        });
      }
    }

    const cookRows = await query('SELECT * FROM cooks WHERE cook_id = ? AND status = ?', [username, 'active']);
    const cook = cookRows[0];
    if (!cook) {
      return jsonResponse(res, { success: false, message: 'Username or password is incorrect' }, 401);
    }

    const cookOk = await bcrypt.compare(password, cook.password_hash);
    if (!cookOk) {
      return jsonResponse(res, { success: false, message: 'Username or password is incorrect' }, 401);
    }

    req.session.user_type = 'cook';
    req.session.cook_id = cook.cook_id;
    req.session.cook_name = cook.full_name;
    req.session.cook_db_id = cook.id;

    jsonResponse(res, {
      success: true,
      role: 'cook',
      user_type: 'cook',
      user_id: cook.cook_id,
      full_name: cook.full_name,
      message: 'Cook login successful'
    });
  } catch (error) {
    jsonResponse(res, { success: false, message: error.message }, 500);
  }
});

router.post('/admin_logout.php', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return jsonResponse(res, { success: false, message: 'Failed to logout' }, 500);
    }
    res.clearCookie('connect.sid');
    jsonResponse(res, { success: true, message: 'Logged out successfully' });
  });
});

router.post('/place_order.php', async (req, res) => {
  const sessionId = String(req.body.session_id || '').trim();
  const tableNumber = Number(req.body.table_number);
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const notes = String(req.body.notes || '').trim();

  if (!sessionId || !Number.isInteger(tableNumber) || tableNumber <= 0) {
    return jsonResponse(res, { success: false, message: 'Missing session or table number' }, 400);
  }

  if (items.length === 0) {
    return jsonResponse(res, { success: false, message: 'No order items provided' }, 400);
  }

  const normalizedItems = [];
  let totalAmount = 0;

  for (const item of items) {
    const itemName = String(item.name || '').trim();
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.price);
    const menuId = item.menu_id ? Number(item.menu_id) : null;
    const itemNotes = String(item.notes || item.optionsText || '').trim();

    if (!itemName || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      return jsonResponse(res, { success: false, message: 'Invalid order item' }, 400);
    }

    const subtotal = quantity * unitPrice;
    totalAmount += subtotal;
    normalizedItems.push({
      menuId,
      itemName,
      quantity,
      unitPrice,
      subtotal,
      itemNotes
    });
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const [sessionRows] = await connection.execute(
      'SELECT session_id FROM customer_sessions WHERE session_id = ?',
      [sessionId]
    );

    if (sessionRows.length === 0) {
      await connection.execute(
        'INSERT INTO customer_sessions (session_id, table_number, status) VALUES (?, ?, ?)',
        [sessionId, tableNumber, 'active']
      );
    }

    const orderNumber = generateOrderNumber();
    const [orderResult] = await connection.execute(
      'INSERT INTO orders (order_number, session_id, table_number, total_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [orderNumber, sessionId, tableNumber, totalAmount, 'pending', notes || null]
    );

    const orderId = orderResult.insertId;
    for (const item of normalizedItems) {
      await connection.execute(
        'INSERT INTO order_items (order_id, menu_id, item_name, quantity, unit_price, subtotal, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [orderId, item.menuId, item.itemName, item.quantity, item.unitPrice, item.subtotal, item.itemNotes || null]
      );
    }

    await connection.commit();

    jsonResponse(res, {
      success: true,
      order_id: orderId,
      order_number: orderNumber,
      total_amount: totalAmount,
      message: 'Order placed successfully'
    });
  } catch (error) {
    await connection.rollback();
    jsonResponse(res, { success: false, message: error.message }, 500);
  } finally {
    connection.release();
  }
});

module.exports = router;
