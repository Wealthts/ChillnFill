<?php
require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);
$username = $data['username'] ?? null;
$password = $data['password'] ?? null;

if (!$username || !$password) {
    echo json_encode(['success' => false, 'message' => 'กรุณากรอก username และรหัสผ่าน']);
    exit;
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
        
        echo json_encode([
            'success' => true,
            'message' => 'เข้าสู่ระบบ admin สำเร็จ',
            'username' => $admin['username']
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Username หรือรหัสผ่านไม่ถูกต้อง']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()]);
}
?>