<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config.php';

$input = json_decode(file_get_contents('php://input'), true);
$cook_id = $input['cook_id'] ?? null;
$password = $input['password'] ?? null;

if (!$cook_id || !$password) {
    echo json_encode([
        'success' => false, 
        'message' => 'กรุณากรอก Cook ID และรหัสผ่าน'
    ]);
    exit;
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
        
        echo json_encode([
            'success' => true,
            'message' => 'เข้าสู่ระบบสำเร็จ',
            'cook_id' => $cook['cook_id'],
            'full_name' => $cook['full_name']
        ]);
    } else {
        echo json_encode([
            'success' => false, 
            'message' => 'Cook ID หรือรหัสผ่านไม่ถูกต้อง'
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false, 
        'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()
    ]);
}
?>