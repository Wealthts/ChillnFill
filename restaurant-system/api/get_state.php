<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
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

    jsonResponse(['success' => true, 'data' => $data]);
} catch (Exception $e) {
    jsonResponse(['success' => false, 'message' => 'Load state failed: ' . $e->getMessage()], 500);
}
