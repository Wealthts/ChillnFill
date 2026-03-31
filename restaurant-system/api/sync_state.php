<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$data = readJsonInput();
if ($data === null || !is_array($data)) {
    jsonResponse(['success' => false, 'message' => 'Invalid JSON input'], 400);
}

function encodeStateValue($value) {
    return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function normalizeBool($value) {
    if (is_bool($value)) return $value ? 1 : 0;
    if (is_numeric($value)) return (int)$value ? 1 : 0;
    $normalized = strtolower(trim((string)$value));
    return in_array($normalized, ['1', 'true', 'yes', 'on'], true) ? 1 : 0;
}

function normalizeDateTimeValue($value) {
    $text = trim((string)($value ?? ''));
    if ($text === '') return null;
    $timestamp = strtotime($text);
    return $timestamp ? date('Y-m-d H:i:s', $timestamp) : null;
}

function deleteMissingRows(PDO $pdo, $table, $column, array $keys) {
    if (!$keys) {
        $pdo->exec("DELETE FROM {$table}");
        return;
    }

    $placeholders = implode(', ', array_fill(0, count($keys), '?'));
    $stmt = $pdo->prepare("DELETE FROM {$table} WHERE {$column} NOT IN ({$placeholders})");
    $stmt->execute(array_values($keys));
}

function menuMirrorKey($menu, $index) {
    if (isset($menu['id']) && $menu['id'] !== '') {
        return 'menu:' . (string)$menu['id'];
    }

    $name = strtolower(trim((string)($menu['name'] ?? 'menu_' . $index)));
    $category = strtolower(trim((string)($menu['category'] ?? 'single')));
    return 'menu:' . $name . '|' . $category;
}

function cookMirrorKey($cook, $index) {
    if (!empty($cook['id'])) {
        return 'cook:' . strtolower(trim((string)$cook['id']));
    }
    return 'cook:index:' . $index;
}

function reviewMirrorKey($review, $index) {
    if (!empty($review['paymentId'])) {
        return 'review:payment:' . (string)$review['paymentId'];
    }

    $seed = encodeStateValue([
        'userId' => $review['userId'] ?? '',
        'table' => $review['table'] ?? '',
        'time' => $review['time'] ?? '',
        'comment' => $review['comment'] ?? '',
        'index' => $index
    ]);
    return 'review:' . sha1($seed ?: (string)$index);
}

function ensureMirrorTables(PDO $pdo) {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS app_state (
            id INT PRIMARY KEY AUTO_INCREMENT,
            state_key VARCHAR(50) UNIQUE NOT NULL,
            state_value LONGTEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sync_sessions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            session_key VARCHAR(191) UNIQUE NOT NULL,
            user_id VARCHAR(100) DEFAULT '',
            table_number VARCHAR(20) DEFAULT '',
            user_type VARCHAR(50) DEFAULT '',
            cook_id VARCHAR(100) DEFAULT '',
            cook_name VARCHAR(100) DEFAULT '',
            admin_logged_in TINYINT(1) DEFAULT 0,
            raw_json LONGTEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sync_cooks (
            id INT PRIMARY KEY AUTO_INCREMENT,
            cook_key VARCHAR(191) UNIQUE NOT NULL,
            cook_id VARCHAR(100) DEFAULT '',
            full_name VARCHAR(100) DEFAULT '',
            password_text VARCHAR(255) DEFAULT '',
            is_active TINYINT(1) DEFAULT 1,
            raw_json LONGTEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sync_menus (
            id INT PRIMARY KEY AUTO_INCREMENT,
            menu_key VARCHAR(191) UNIQUE NOT NULL,
            menu_id VARCHAR(100) DEFAULT '',
            name VARCHAR(150) NOT NULL,
            thai_name VARCHAR(150) DEFAULT '',
            category VARCHAR(50) DEFAULT '',
            price DECIMAL(10,2) DEFAULT 0,
            description TEXT,
            image_url LONGTEXT,
            option_keys_json TEXT,
            is_available TINYINT(1) DEFAULT 1,
            raw_json LONGTEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sync_orders (
            id INT PRIMARY KEY AUTO_INCREMENT,
            order_key VARCHAR(191) UNIQUE NOT NULL,
            external_order_id VARCHAR(100) DEFAULT '',
            user_id VARCHAR(100) DEFAULT '',
            table_number VARCHAR(20) DEFAULT '',
            total_amount DECIMAL(10,2) DEFAULT 0,
            status VARCHAR(50) DEFAULT 'pending',
            payment_id VARCHAR(100) DEFAULT '',
            payment_status VARCHAR(50) DEFAULT '',
            payment_method VARCHAR(50) DEFAULT '',
            paid_at DATETIME NULL,
            review_submitted_at DATETIME NULL,
            ordered_at DATETIME NULL,
            raw_json LONGTEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sync_order_items (
            id INT PRIMARY KEY AUTO_INCREMENT,
            item_key VARCHAR(191) UNIQUE NOT NULL,
            order_key VARCHAR(191) NOT NULL,
            order_external_id VARCHAR(100) DEFAULT '',
            item_name VARCHAR(150) NOT NULL,
            quantity INT DEFAULT 0,
            unit_price DECIMAL(10,2) DEFAULT 0,
            options_text TEXT,
            customer_note TEXT,
            raw_json LONGTEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_sync_order_items_order_key (order_key)
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sync_payments (
            id INT PRIMARY KEY AUTO_INCREMENT,
            payment_key VARCHAR(191) UNIQUE NOT NULL,
            external_payment_id VARCHAR(100) DEFAULT '',
            user_id VARCHAR(100) DEFAULT '',
            table_number VARCHAR(20) DEFAULT '',
            order_ids_json TEXT,
            amount DECIMAL(10,2) DEFAULT 0,
            method VARCHAR(50) DEFAULT '',
            status VARCHAR(50) DEFAULT 'paid',
            payment_time DATETIME NULL,
            review_submitted TINYINT(1) DEFAULT 0,
            review_submitted_at DATETIME NULL,
            raw_json LONGTEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sync_reviews (
            id INT PRIMARY KEY AUTO_INCREMENT,
            review_key VARCHAR(191) UNIQUE NOT NULL,
            payment_id VARCHAR(100) DEFAULT '',
            user_id VARCHAR(100) DEFAULT '',
            table_number VARCHAR(20) DEFAULT '',
            rating INT DEFAULT 0,
            comment_text TEXT,
            review_time DATETIME NULL,
            raw_json LONGTEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
}

function syncAppState(PDO $pdo, array $data) {
    $stmt = $pdo->prepare("
        INSERT INTO app_state (state_key, state_value)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE state_value = VALUES(state_value), updated_at = CURRENT_TIMESTAMP
    ");

    $saved = [];
    foreach (['menus', 'orders', 'payments', 'reviews', 'cooks', 'session'] as $key) {
        if (!array_key_exists($key, $data)) {
            continue;
        }
        $stmt->execute([$key, encodeStateValue($data[$key])]);
        $saved[] = $key;
    }

    return $saved;
}

function syncSessionMirror(PDO $pdo, $session) {
    if (!is_array($session) || !$session) {
        return [];
    }

    $sessionKey = trim((string)($session['user_id'] ?? ''));
    if ($sessionKey === '') {
        $sessionKey = trim((string)($session['table_number'] ?? ''));
    }
    if ($sessionKey === '') {
        $sessionKey = trim((string)($session['cook_id'] ?? ''));
    }
    if ($sessionKey === '') {
        $sessionKey = normalizeBool($session['admin_logged_in'] ?? '') ? 'admin' : 'guest';
    }
    $sessionKey = 'session:' . $sessionKey;

    $stmt = $pdo->prepare("
        INSERT INTO sync_sessions (
            session_key, user_id, table_number, user_type, cook_id, cook_name, admin_logged_in, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            user_id = VALUES(user_id),
            table_number = VALUES(table_number),
            user_type = VALUES(user_type),
            cook_id = VALUES(cook_id),
            cook_name = VALUES(cook_name),
            admin_logged_in = VALUES(admin_logged_in),
            raw_json = VALUES(raw_json),
            updated_at = CURRENT_TIMESTAMP
    ");

    $stmt->execute([
        $sessionKey,
        (string)($session['user_id'] ?? ''),
        (string)($session['table_number'] ?? ''),
        (string)($session['user_type'] ?? ''),
        (string)($session['cook_id'] ?? ''),
        (string)($session['cook_name'] ?? ''),
        normalizeBool($session['admin_logged_in'] ?? ''),
        encodeStateValue($session)
    ]);

    return [$sessionKey];
}

function syncCooksMirror(PDO $pdo, $cooks) {
    $cooks = is_array($cooks) ? $cooks : [];
    $stmt = $pdo->prepare("
        INSERT INTO sync_cooks (cook_key, cook_id, full_name, password_text, is_active, raw_json)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            cook_id = VALUES(cook_id),
            full_name = VALUES(full_name),
            password_text = VALUES(password_text),
            is_active = VALUES(is_active),
            raw_json = VALUES(raw_json),
            updated_at = CURRENT_TIMESTAMP
    ");

    $keys = [];
    foreach ($cooks as $index => $cook) {
        if (!is_array($cook)) continue;
        $cookKey = cookMirrorKey($cook, $index);
        $keys[] = $cookKey;
        $active = array_key_exists('active', $cook)
            ? normalizeBool($cook['active'])
            : normalizeBool(($cook['cooking'] ?? false) || ($cook['serving'] ?? false));

        $stmt->execute([
            $cookKey,
            (string)($cook['id'] ?? ''),
            (string)($cook['name'] ?? $cook['full_name'] ?? ''),
            (string)($cook['password'] ?? ''),
            $active,
            encodeStateValue($cook)
        ]);
    }

    deleteMissingRows($pdo, 'sync_cooks', 'cook_key', $keys);
    return $keys;
}

function syncMenusMirror(PDO $pdo, $menus) {
    $menus = is_array($menus) ? $menus : [];
    $stmt = $pdo->prepare("
        INSERT INTO sync_menus (
            menu_key, menu_id, name, thai_name, category, price, description, image_url, option_keys_json, is_available, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            menu_id = VALUES(menu_id),
            name = VALUES(name),
            thai_name = VALUES(thai_name),
            category = VALUES(category),
            price = VALUES(price),
            description = VALUES(description),
            image_url = VALUES(image_url),
            option_keys_json = VALUES(option_keys_json),
            is_available = VALUES(is_available),
            raw_json = VALUES(raw_json),
            updated_at = CURRENT_TIMESTAMP
    ");

    $keys = [];
    foreach ($menus as $index => $menu) {
        if (!is_array($menu)) continue;
        $menuKey = menuMirrorKey($menu, $index);
        $keys[] = $menuKey;

        $stmt->execute([
            $menuKey,
            (string)($menu['id'] ?? ''),
            (string)($menu['name'] ?? 'Unnamed Menu'),
            (string)($menu['thaiName'] ?? ''),
            (string)($menu['category'] ?? ''),
            (float)($menu['price'] ?? 0),
            (string)($menu['desc'] ?? ''),
            (string)($menu['img'] ?? $menu['image'] ?? ''),
            encodeStateValue($menu['optionKeys'] ?? []),
            array_key_exists('available', $menu) ? normalizeBool($menu['available']) : 1,
            encodeStateValue($menu)
        ]);
    }

    deleteMissingRows($pdo, 'sync_menus', 'menu_key', $keys);
    return $keys;
}

function syncOrdersMirror(PDO $pdo, $orders) {
    $orders = is_array($orders) ? $orders : [];
    $orderStmt = $pdo->prepare("
        INSERT INTO sync_orders (
            order_key, external_order_id, user_id, table_number, total_amount, status, payment_id, payment_status, payment_method,
            paid_at, review_submitted_at, ordered_at, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            external_order_id = VALUES(external_order_id),
            user_id = VALUES(user_id),
            table_number = VALUES(table_number),
            total_amount = VALUES(total_amount),
            status = VALUES(status),
            payment_id = VALUES(payment_id),
            payment_status = VALUES(payment_status),
            payment_method = VALUES(payment_method),
            paid_at = VALUES(paid_at),
            review_submitted_at = VALUES(review_submitted_at),
            ordered_at = VALUES(ordered_at),
            raw_json = VALUES(raw_json),
            updated_at = CURRENT_TIMESTAMP
    ");

    $itemStmt = $pdo->prepare("
        INSERT INTO sync_order_items (
            item_key, order_key, order_external_id, item_name, quantity, unit_price, options_text, customer_note, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            order_key = VALUES(order_key),
            order_external_id = VALUES(order_external_id),
            item_name = VALUES(item_name),
            quantity = VALUES(quantity),
            unit_price = VALUES(unit_price),
            options_text = VALUES(options_text),
            customer_note = VALUES(customer_note),
            raw_json = VALUES(raw_json),
            updated_at = CURRENT_TIMESTAMP
    ");

    $orderKeys = [];
    $itemKeys = [];

    foreach ($orders as $orderIndex => $order) {
        if (!is_array($order)) continue;

        $externalOrderId = (string)($order['id'] ?? '');
        $orderKey = $externalOrderId !== '' ? 'order:' . $externalOrderId : 'order:index:' . $orderIndex;
        $orderKeys[] = $orderKey;

        $orderStmt->execute([
            $orderKey,
            $externalOrderId,
            (string)($order['userId'] ?? ''),
            (string)($order['table'] ?? ''),
            (float)($order['total'] ?? 0),
            (string)($order['status'] ?? 'pending'),
            (string)($order['paymentId'] ?? ''),
            (string)($order['paymentStatus'] ?? ''),
            (string)($order['paymentMethod'] ?? ''),
            normalizeDateTimeValue($order['paidAt'] ?? null),
            normalizeDateTimeValue($order['reviewSubmittedAt'] ?? null),
            normalizeDateTimeValue($order['time'] ?? null),
            encodeStateValue($order)
        ]);

        $items = is_array($order['items'] ?? null) ? $order['items'] : [];
        foreach ($items as $itemIndex => $item) {
            if (!is_array($item)) continue;
            $itemKey = $orderKey . ':item:' . $itemIndex;
            $itemKeys[] = $itemKey;

            $itemStmt->execute([
                $itemKey,
                $orderKey,
                $externalOrderId,
                (string)($item['name'] ?? ''),
                (int)($item['qty'] ?? $item['quantity'] ?? 0),
                (float)($item['price'] ?? 0),
                (string)($item['optionsText'] ?? ''),
                (string)($item['customerNote'] ?? ''),
                encodeStateValue($item)
            ]);
        }
    }

    deleteMissingRows($pdo, 'sync_orders', 'order_key', $orderKeys);
    deleteMissingRows($pdo, 'sync_order_items', 'item_key', $itemKeys);
    return ['orders' => $orderKeys, 'items' => $itemKeys];
}

function syncPaymentsMirror(PDO $pdo, $payments) {
    $payments = is_array($payments) ? $payments : [];
    $stmt = $pdo->prepare("
        INSERT INTO sync_payments (
            payment_key, external_payment_id, user_id, table_number, order_ids_json, amount, method, status,
            payment_time, review_submitted, review_submitted_at, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            external_payment_id = VALUES(external_payment_id),
            user_id = VALUES(user_id),
            table_number = VALUES(table_number),
            order_ids_json = VALUES(order_ids_json),
            amount = VALUES(amount),
            method = VALUES(method),
            status = VALUES(status),
            payment_time = VALUES(payment_time),
            review_submitted = VALUES(review_submitted),
            review_submitted_at = VALUES(review_submitted_at),
            raw_json = VALUES(raw_json),
            updated_at = CURRENT_TIMESTAMP
    ");

    $keys = [];
    foreach ($payments as $index => $payment) {
        if (!is_array($payment)) continue;
        $externalPaymentId = (string)($payment['id'] ?? '');
        $paymentKey = $externalPaymentId !== '' ? 'payment:' . $externalPaymentId : 'payment:index:' . $index;
        $keys[] = $paymentKey;

        $stmt->execute([
            $paymentKey,
            $externalPaymentId,
            (string)($payment['userId'] ?? ''),
            (string)($payment['table'] ?? ''),
            encodeStateValue($payment['orderIds'] ?? $payment['orderId'] ?? []),
            (float)($payment['amount'] ?? 0),
            (string)($payment['method'] ?? ''),
            (string)($payment['status'] ?? 'paid'),
            normalizeDateTimeValue($payment['time'] ?? null),
            normalizeBool($payment['reviewSubmitted'] ?? false),
            normalizeDateTimeValue($payment['reviewSubmittedAt'] ?? null),
            encodeStateValue($payment)
        ]);
    }

    deleteMissingRows($pdo, 'sync_payments', 'payment_key', $keys);
    return $keys;
}

function syncReviewsMirror(PDO $pdo, $reviews) {
    $reviews = is_array($reviews) ? $reviews : [];
    $stmt = $pdo->prepare("
        INSERT INTO sync_reviews (review_key, payment_id, user_id, table_number, rating, comment_text, review_time, raw_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            payment_id = VALUES(payment_id),
            user_id = VALUES(user_id),
            table_number = VALUES(table_number),
            rating = VALUES(rating),
            comment_text = VALUES(comment_text),
            review_time = VALUES(review_time),
            raw_json = VALUES(raw_json),
            updated_at = CURRENT_TIMESTAMP
    ");

    $keys = [];
    foreach ($reviews as $index => $review) {
        if (!is_array($review)) continue;
        $reviewKey = reviewMirrorKey($review, $index);
        $keys[] = $reviewKey;

        $stmt->execute([
            $reviewKey,
            (string)($review['paymentId'] ?? ''),
            (string)($review['userId'] ?? ''),
            (string)($review['table'] ?? ''),
            (int)($review['rating'] ?? 0),
            (string)($review['comment'] ?? ''),
            normalizeDateTimeValue($review['time'] ?? null),
            encodeStateValue($review)
        ]);
    }

    deleteMissingRows($pdo, 'sync_reviews', 'review_key', $keys);
    return $keys;
}

try {
    ensureMirrorTables($pdo);
    $pdo->beginTransaction();

    $savedKeys = syncAppState($pdo, $data);
    $sessionKeys = syncSessionMirror($pdo, $data['session'] ?? []);
    $cookKeys = syncCooksMirror($pdo, $data['cooks'] ?? []);
    $menuKeys = syncMenusMirror($pdo, $data['menus'] ?? []);
    $orderResult = syncOrdersMirror($pdo, $data['orders'] ?? []);
    $paymentKeys = syncPaymentsMirror($pdo, $data['payments'] ?? []);
    $reviewKeys = syncReviewsMirror($pdo, $data['reviews'] ?? []);

    $pdo->commit();

    jsonResponse([
        'success' => true,
        'message' => 'State synced successfully',
        'saved_keys' => $savedKeys,
        'saved_at' => date('c'),
        'mirror_counts' => [
            'sessions' => count($sessionKeys),
            'cooks' => count($cookKeys),
            'menus' => count($menuKeys),
            'orders' => count($orderResult['orders']),
            'order_items' => count($orderResult['items']),
            'payments' => count($paymentKeys),
            'reviews' => count($reviewKeys)
        ]
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(['success' => false, 'message' => 'Sync failed: ' . $e->getMessage()], 500);
}
