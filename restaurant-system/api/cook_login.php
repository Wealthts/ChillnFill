<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$input = readJsonInput();
if ($input === null) {
    jsonResponse(['success' => false, 'message' => 'Invalid JSON input'], 400);
}

$cook_id = $input['cook_id'] ?? null;
$password = $input['password'] ?? null;

if (!$cook_id || !$password) {
    jsonResponse([
        'success' => false,
        'message' => 'กรุณากรอก Cook ID และรหัสผ่าน'
    ], 400);
}

try {
    $stmt = $pdo->prepare("SELECT * FROM cooks WHERE cook_id = ? AND status = 'active'");
    $stmt->execute([$cook_id]);
    $cook = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($cook && password_verify($password, $cook['password_hash'])) {
        $_SESSION['user_type'] = 'cook';
        $_SESSION['cook_id'] = $cook['cook_id'];
        $_SESSION['cook_name'] = $cook['full_name'];
        $_SESSION['cook_db_id'] = $cook['id'];
        
        jsonResponse([
            'success' => true,
            'message' => 'เข้าสู่ระบบสำเร็จ',
            'cook_id' => $cook['cook_id'],
            'full_name' => $cook['full_name']
        ]);
    } else {
        jsonResponse([
            'success' => false,
            'message' => 'Cook ID หรือรหัสผ่านไม่ถูกต้อง'
        ], 401);
    }
} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()
    ], 500);
}
