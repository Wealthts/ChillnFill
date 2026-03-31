<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

function getMirrorSummary(PDO $pdo, $table, $keyColumn) {
    $countStmt = $pdo->query("SELECT COUNT(*) AS total, MAX(updated_at) AS last_updated FROM {$table}");
    $summary = $countStmt->fetch(PDO::FETCH_ASSOC) ?: ['total' => 0, 'last_updated' => null];

    $sampleStmt = $pdo->query("SELECT * FROM {$table} ORDER BY updated_at DESC LIMIT 5");
    $rows = $sampleStmt->fetchAll(PDO::FETCH_ASSOC);

    return [
        'count' => (int)($summary['total'] ?? 0),
        'last_updated' => $summary['last_updated'] ?? null,
        'key_column' => $keyColumn,
        'latest_rows' => $rows
    ];
}

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS app_state (
            id INT PRIMARY KEY AUTO_INCREMENT,
            state_key VARCHAR(50) UNIQUE NOT NULL,
            state_value LONGTEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");

    $stmt = $pdo->query("SELECT state_key, state_value, updated_at FROM app_state ORDER BY state_key ASC");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $data = [];

    foreach ($rows as $row) {
        $data[$row['state_key']] = [
            'value' => json_decode($row['state_value'], true),
            'updated_at' => $row['updated_at']
        ];
    }

    $mirrors = [];
    $mirrorTables = [
        'sync_sessions' => 'session_key',
        'sync_cooks' => 'cook_key',
        'sync_menus' => 'menu_key',
        'sync_orders' => 'order_key',
        'sync_order_items' => 'item_key',
        'sync_payments' => 'payment_key',
        'sync_reviews' => 'review_key'
    ];

    foreach ($mirrorTables as $table => $keyColumn) {
        try {
            $mirrors[$table] = getMirrorSummary($pdo, $table, $keyColumn);
        } catch (Exception $inner) {
            $mirrors[$table] = [
                'count' => 0,
                'last_updated' => null,
                'key_column' => $keyColumn,
                'latest_rows' => [],
                'error' => $inner->getMessage()
            ];
        }
    }

    jsonResponse([
        'success' => true,
        'data' => $data,
        'mirrors' => $mirrors,
        'server_time' => date('c')
    ]);
} catch (Exception $e) {
    jsonResponse(['success' => false, 'message' => 'Load state failed: ' . $e->getMessage()], 500);
}
