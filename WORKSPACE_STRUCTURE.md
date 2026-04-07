# Workspace Structure

This map explains the purpose of each first-party file in the project.

## Root

- `.env`: environment variables (database/session settings).
- `Database.sql`: SQL schema/data snapshot.
- `openapi.yaml`: API contract reference.
- `server.js`: backend API + page routes + database bootstrapping.
- `package.json`: Node scripts and dependencies.
- `package-lock.json`: exact dependency lock file.

## css

- `css/chill-auth.css`: authentication page styles.
- `css/chill-theme.css`: shared visual theme styles.

## js

- `js/admin.js`: admin dashboard logic (cooks/menu/orders/payments/reviews).
- `js/cart.js`: cart UI + quantity edits + submit order flow.
- `js/cook.js`: cook panel (orders, dashboard, reviews, item claim/status).
- `js/customer.js`: customer login + payment/review history modal.
- `js/menu.js`: menu browsing, filtering, options, add-to-cart flow.
- `js/order_status.js`: customer order-status view + auto refresh.
- `js/payment.js`: payment + review flow for current customer session.
- `js/script.js`: landing-page role/login routing and session checks.
- `js/staff.js`: staff access page (admin/cook login and first-time setup).
- `js/table.js`: table reservation flow backed by table APIs.

## views

- `views/admin.html`: admin page shell.
- `views/cart.html`: cart page shell.
- `views/cook.html`: cook page shell.
- `views/customer.html`: customer login/history page shell.
- `views/index.html`: landing page shell.
- `views/login_customer.html`: redirect compatibility page.
- `views/menu.html`: menu page shell.
- `views/order_status.html`: order status page shell.
- `views/payment.html`: payment/review page shell.
- `views/staff.html`: staff login/setup page shell.
- `views/table.html`: table reservation page shell.

## restaurant-system

- `restaurant-system/Database.sql`: database SQL used by the restaurant module.
