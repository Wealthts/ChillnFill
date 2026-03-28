<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$data = readJsonInput();
if ($data === null) {
    jsonResponse(['success' => false, 'message' => 'Invalid JSON input'], 400);
}

$table_number = $data['table_number'] ?? null;

if (!$table_number) {
    jsonResponse(['success' => false, 'message' => 'กรุณากรอกหมายเลขโต๊ะ'], 400);
}

try {
    $session_id = 'CUST_' . time() . '_' . rand(1000, 9999);

    $stmt = $pdo->prepare("INSERT INTO customer_sessions (session_id, table_number) VALUES (?, ?)");
    $stmt->execute([$session_id, $table_number]);

    $_SESSION['user_type'] = 'customer';
    $_SESSION['session_id'] = $session_id;
    $_SESSION['table_number'] = $table_number;

    jsonResponse([
        'success' => true,
        'user_id' => $session_id,
        'timestamp' => date('Y-m-d H:i:s'),
        'table_number' => $table_number,
        'message' => 'เข้าสู่ระบบสำเร็จ'
    ]);
} catch (Exception $e) {
    jsonResponse(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()], 500);
}
