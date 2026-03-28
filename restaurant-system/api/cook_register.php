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
$full_name = $input['full_name'] ?? null;
$phone = $input['phone'] ?? null;

if (!$cook_id || !$password || !$full_name) {
    jsonResponse([
        'success' => false,
        'message' => 'กรุณากรอก Cook ID, รหัสผ่าน และชื่อ-นามสกุล'
    ], 400);
}

if (strlen($password) < 4) {
    jsonResponse([
        'success' => false,
        'message' => 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร'
    ], 400);
}

try {
    // ตรวจสอบว่ามี cook_id นี้แล้วหรือไม่
    $stmt = $pdo->prepare("SELECT id FROM cooks WHERE cook_id = ?");
    $stmt->execute([$cook_id]);
    
    if ($stmt->rowCount() > 0) {
        jsonResponse([
            'success' => false, 
            'message' => 'Cook ID นี้มีอยู่ในระบบแล้ว'
        ], 409);
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
        jsonResponse([
            'success' => true,
            'message' => "ลงทะเบียน $cook_id สำเร็จ!",
            'cook_id' => $cook_id,
            'full_name' => $full_name
        ]);
    } else {
        jsonResponse([
            'success' => false,
            'message' => 'ไม่สามารถบันทึกข้อมูลได้'
        ], 500);
    }
    
} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()
    ], 500);
}
