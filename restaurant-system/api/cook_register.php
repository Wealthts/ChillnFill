<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config.php';

// รับข้อมูลจาก POST
$input = json_decode(file_get_contents('php://input'), true);
$cook_id = $input['cook_id'] ?? null;
$password = $input['password'] ?? null;
$full_name = $input['full_name'] ?? null;
$phone = $input['phone'] ?? null;

// ตรวจสอบข้อมูล
if (!$cook_id || !$password || !$full_name) {
    echo json_encode([
        'success' => false, 
        'message' => 'กรุณากรอก Cook ID, รหัสผ่าน และชื่อ-นามสกุล'
    ]);
    exit;
}

if (strlen($password) < 4) {
    echo json_encode([
        'success' => false, 
        'message' => 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร'
    ]);
    exit;
}

try {
    // ตรวจสอบว่ามี cook_id นี้แล้วหรือไม่
    $stmt = $pdo->prepare("SELECT id FROM cooks WHERE cook_id = ?");
    $stmt->execute([$cook_id]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode([
            'success' => false, 
            'message' => 'Cook ID นี้มีอยู่ในระบบแล้ว'
        ]);
        exit;
    }
    
    // เข้ารหัสรหัสผ่าน
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    
    // บันทึกข้อมูล
    $stmt = $pdo->prepare("
        INSERT INTO cooks (cook_id, password_hash, full_name, phone, status, created_at) 
        VALUES (?, ?, ?, ?, 'active', NOW())
    ");
    
    $result = $stmt->execute([$cook_id, $password_hash, $full_name, $phone]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => "ลงทะเบียน $cook_id สำเร็จ!",
            'cook_id' => $cook_id,
            'full_name' => $full_name
        ]);
    } else {
        echo json_encode([
            'success' => false, 
            'message' => 'ไม่สามารถบันทึกข้อมูลได้'
        ]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false, 
        'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()
    ]);
}
?>