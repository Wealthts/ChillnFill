# Chill n Fill API Specification

This follows the REST API specification method from the slides: route name, HTTP method, input, response, and status codes.

Base URL: `/api`

Database setup: see `docs/database-setup.md`.

## Common Rules

- Request bodies use JSON unless the route says `multipart/form-data`.
- Authenticated staff/customer routes use the Express session cookie.
- JSON responses use this shape for failures:

```json
{
  "success": false,
  "message": "Error message"
}
```

## Health and Session

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/api/health` | Check server and database connection | No |
| GET | `/api/session` | Get current logged-in user/session | No |
| POST | `/api/logout` | Destroy current session | Session |

### GET `/api/session`

Response:

```json
{
  "logged_in": true,
  "user_type": "admin"
}
```

Status codes: `200`, `500`.

## Staff Authentication

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/api/staff/login` | Login as admin or cook | No |
| POST | `/api/admin/login` | Login as admin | No |
| POST | `/api/cook/login` | Login as cook | No |
| POST | `/api/cook/access` | Check first-time cook access | No |
| POST | `/api/cook/setup-password` | Create first cook password | No |

### POST `/api/staff/login`

Request:

```json
{
  "username": "admin",
  "password": "0000"
}
```

Response:

```json
{
  "success": true,
  "role": "admin",
  "user_type": "admin",
  "message": "Admin login successful"
}
```

Status codes: `200`, `400`, `401`, `403`, `500`.

## Menu

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/api/menu` | List available menu items | No |
| GET | `/api/menu?include_disabled=1` | List all menu items | Admin |
| POST | `/api/menu` | Create menu item | Admin |
| PUT | `/api/menu/:menuId` | Replace menu item fields | Admin |
| PATCH | `/api/menu/:menuId/status` | Enable/disable menu item | Admin |
| DELETE | `/api/menu/:menuId` | Delete menu item | Admin |

### POST `/api/menu`

Content type: `multipart/form-data`

Fields:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | text | Yes | Menu name |
| `price` | number | Yes | Must be greater than `0` |
| `desc` | text | No | Description |
| `category` | text | Yes | Example: `single`, `drink` |
| `optionKeys` | repeated text | No | Example: `spice`, `sweet`, `ice` |
| `image` | file | No | JPG, PNG, WEBP, or GIF, max 5 MB |
| `available` | boolean text | No | Defaults to true |

Response:

```json
{
  "success": true,
  "menu": {
    "id": 1,
    "name": "Pad Thai",
    "price": 80,
    "category": "single",
    "img": "/public/uploads/menu/filename.jpg",
    "available": true
  }
}
```

Status codes: `201`, `400`, `401`, `500`.

### PUT `/api/menu/:menuId`

Content type: `multipart/form-data`

Uses the same fields as `POST /api/menu`. If no new `image` file is sent, send the existing image URL in `img`.

Status codes: `200`, `400`, `401`, `404`, `500`.

## Cooks

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/api/cooks` | List cooks | Admin |
| POST | `/api/cooks` | Add cook ID and name | Admin |
| PUT | `/api/cooks/:cookId` | Update cook | Admin |
| PATCH | `/api/cooks/:cookId/status` | Enable/disable cook | Admin |
| DELETE | `/api/cooks/:cookId` | Delete cook | Admin |

### POST `/api/cooks`

Request:

```json
{
  "cook_id": "C001",
  "full_name": "Cook Name",
  "status": "active"
}
```

Status codes: `201`, `400`, `401`, `409`, `500`.

## Tables and Customer Login

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/api/tables` | List table statuses | No |
| PATCH | `/api/tables/:tableNumber/status` | Update table status | Admin |
| POST | `/api/customer/login` | Start customer table session | No |
| GET | `/api/customer/state` | Get ordering/review state | Customer |
| GET | `/api/customer/history?table_number=1` | Table payment/review history | No |

### POST `/api/customer/login`

Request:

```json
{
  "table_number": 1
}
```

Response:

```json
{
  "success": true,
  "user_id": "CUST_...",
  "table_number": 1,
  "message": "Login successful"
}
```

Status codes: `200`, `400`, `409`, `500`.

## Orders

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/api/orders` | List orders | Customer, cook, or admin |
| POST | `/api/orders` | Create order | Customer |
| GET | `/api/orders/:orderId` | Get one order | Customer, cook, or admin |
| POST | `/api/orders/:orderId/claim` | Claim whole order | Cook |
| PATCH | `/api/orders/:orderId/status` | Update order status | Cook or admin |
| POST | `/api/order-items/:itemId/claim` | Claim one item | Cook |
| PATCH | `/api/order-items/:itemId/status` | Update one item status | Cook or admin |

### POST `/api/orders`

Request:

```json
{
  "notes": "No peanuts",
  "items": [
    {
      "menu_id": 1,
      "quantity": 2,
      "notes": "Mild"
    }
  ]
}
```

Status codes: `201`, `400`, `401`, `409`, `500`.

## Payments and Reviews

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/api/payments` | Pay for selected order IDs | Customer |
| GET | `/api/payments` | List payments | Session scoped |
| POST | `/api/reviews` | Submit review for payment | Customer |
| GET | `/api/reviews` | List reviews | Session scoped |

### POST `/api/payments`

Request:

```json
{
  "order_ids": [1, 2],
  "method": "Cash"
}
```

Status codes: `201`, `400`, `401`, `404`, `409`, `500`.

### POST `/api/reviews`

Request:

```json
{
  "payment_id": 1,
  "rating": 5,
  "comment": "Great food"
}
```

Status codes: `201`, `400`, `401`, `404`, `409`, `500`.
