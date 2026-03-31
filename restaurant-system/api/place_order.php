<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$data = readJsonInput();
if ($data === null) {
    jsonResponse(['success' => false, 'message' => 'Invalid JSON input'], 400);
}

$session_id = $data['session_id'] ?? null;
$table_number = $data['table_number'] ?? null;
$items = $data['items'] ?? [];

if (!$session_id || !$table_number) {
    jsonResponse(['success' => false, 'message' => 'Missing session or table number'], 400);
}

if (!is_array($items) || count($items) === 0) {
    jsonResponse(['success' => false, 'message' => 'No order items provided'], 400);
}

$total_amount = 0;
$normalized_items = [];

foreach ($items as $item) {
    $name = trim((string)($item['name'] ?? ''));
    $quantity = (int)($item['quantity'] ?? 0);
    $price = (float)($item['price'] ?? 0);

    if ($name === '' || $quantity <= 0 || $price < 0) {
        jsonResponse(['success' => false, 'message' => 'Invalid order item'], 400);
    }

    $subtotal = $price * $quantity;
    $total_amount += $subtotal;
    $normalized_items[] = [
        'name' => $name,
        'quantity' => $quantity,
        'price' => $price,
        'subtotal' => $subtotal,
    ];
}

try {
    $pdo->beginTransaction();

    $order_number = generateOrderNumber();

    $stmt = $pdo->prepare(
        'INSERT INTO orders (order_number, session_id, table_number, total_amount, status) VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$order_number, $session_id, $table_number, $total_amount, 'pending']);

    $order_id = $pdo->lastInsertId();

    $item_stmt = $pdo->prepare(
        'INSERT INTO order_items (order_id, menu_id, quantity, unit_price, subtotal, notes) VALUES (?, ?, ?, ?, ?, ?)'
    );

    foreach ($normalized_items as $item) {
        $notes = $item['name'];
        $item_stmt->execute([
            $order_id,
            null,
            $item['quantity'],
            $item['price'],
            $item['subtotal'],
            $notes,
        ]);
    }

    $pdo->commit();

    jsonResponse([
        'success' => true,
        'order_id' => (int)$order_id,
        'order_number' => $order_number,
        'message' => 'Order placed successfully',
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(['success' => false, 'message' => 'Failed to place order: ' . $e->getMessage()], 500);
}
