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
        'message' => 'Please provide Cook ID, password, and full name'
    ], 400);
}

if (strlen($password) < 4) {
    jsonResponse([
        'success' => false,
        'message' => 'Password must be at least 4 characters'
    ], 400);
}

try {
    // Check whether this cook_id already exists
    $stmt = $pdo->prepare("SELECT id FROM cooks WHERE cook_id = ?");
    $stmt->execute([$cook_id]);
    
    if ($stmt->rowCount() > 0) {
        jsonResponse([
            'success' => false, 
            'message' => 'This Cook ID already exists'
        ], 409);
    }
    
    // Hash password
    $password_hash = password_hash($password, PASSWORD_ARGON2ID);
    
    // Save data
    $stmt = $pdo->prepare("
        INSERT INTO cooks (cook_id, password_hash, full_name, phone, status, created_at) 
        VALUES (?, ?, ?, ?, 'active', NOW())
    ");
    
    $result = $stmt->execute([$cook_id, $password_hash, $full_name, $phone]);
    
    if ($result) {
        jsonResponse([
            'success' => true,
            'message' => "Registration for $cook_id successful!",
            'cook_id' => $cook_id,
            'full_name' => $full_name
        ]);
    } else {
        jsonResponse([
            'success' => false,
            'message' => 'Unable to save data'
        ], 500);
    }
    
} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ], 500);
}
