# Database Setup (phpMyAdmin)

Use this flow before starting the Node server.

1. Open phpMyAdmin and select the SQL tab.
2. Import and run `restaurant-system/database.sql`.
3. Confirm these tables exist: `admin`, `cooks`, `menu`, `customer_sessions`, `tables`, `orders`, `order_items`, `payments`, `reviews`.
4. Start the app with `npm start`.

Default admin account from seed:

- `username`: `admin`
- `password`: `0000`

Notes:

- `server.js` now validates required tables at startup instead of embedding large `CREATE TABLE` SQL blocks.
- If a table is missing, startup will fail with a message that points back to this SQL import step.
