<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

$data = readJsonInput();
if ($data === null) {
    jsonResponse(['success' => false, 'message' => 'Invalid JSON input'], 400);
}

$username = $data['username'] ?? null;
$password = $data['password'] ?? null;

if (!$username || !$password) {
    jsonResponse(['success' => false, 'message' => 'กรุณากรอก username และรหัสผ่าน'], 400);
}

try {
    // ดึงข้อมูลแอดมินจากฐานข้อมูล
    $stmt = $pdo->prepare("SELECT * FROM admin WHERE username = ?");
    $stmt->execute([$username]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($admin && password_verify($password, $admin['password_hash'])) {
        // ล็อกอินสำเร็จ
        $_SESSION['user_type'] = 'admin';
        $_SESSION['admin_id'] = $admin['id'];
        $_SESSION['admin_username'] = $admin['username'];
        $_SESSION['admin_logged_in'] = true;
        
        jsonResponse([
            'success' => true,
            'message' => 'เข้าสู่ระบบ admin สำเร็จ',
            'username' => $admin['username']
        ]);
    } else {
        jsonResponse(['success' => false, 'message' => 'Username หรือรหัสผ่านไม่ถูกต้อง'], 401);
    }
} catch (Exception $e) {
    jsonResponse(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()], 500);
}
