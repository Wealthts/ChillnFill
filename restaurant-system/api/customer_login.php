<?php
require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);
$table_number = $data['table_number'] ?? null;

if (!$table_number) {
    echo json_encode(['success' => false, 'message' => 'กรุณากรอกหมายเลขโต๊ะ']);
    exit;
}

// สร้าง session ID ใหม่
$session_id = 'CUST_' . time() . '_' . rand(1000, 9999);

$stmt = $pdo->prepare("INSERT INTO customer_sessions (session_id, table_number) VALUES (?, ?)");
$stmt->execute([$session_id, $table_number]);

// เก็บ session ใน PHP session ด้วย
$_SESSION['user_type'] = 'customer';
$_SESSION['session_id'] = $session_id;
$_SESSION['table_number'] = $table_number;

echo json_encode([
    'success' => true,
    'user_id' => $session_id,
    'timestamp' => date('Y-m-d H:i:s'),
    'table_number' => $table_number,
    'message' => 'เข้าสู่ระบบสำเร็จ'
]);
?>