<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$data = readJsonInput();
if ($data === null || !is_array($data)) {
    jsonResponse(['success' => false, 'message' => 'Invalid JSON input'], 400);
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
        $stmt->execute([$key, json_encode($data[$key], JSON_UNESCAPED_UNICODE)]);
        $saved[] = $key;
    }

    jsonResponse([
        'success' => true,
        'message' => 'State synced successfully',
        'saved_keys' => $saved,
        'saved_at' => date('c')
    ]);
} catch (Exception $e) {
    jsonResponse(['success' => false, 'message' => 'Sync failed: ' . $e->getMessage()], 500);
}
