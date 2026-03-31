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
    jsonResponse(['success' => false, 'message' => 'Please enter username and password'], 400);
}

try {
    // Load admin from database
    $stmt = $pdo->prepare("SELECT * FROM admin WHERE username = ?");
    $stmt->execute([$username]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($admin && password_verify($password, $admin['password_hash'])) {
        // Login successful
        $_SESSION['user_type'] = 'admin';
        $_SESSION['admin_id'] = $admin['id'];
        $_SESSION['admin_username'] = $admin['username'];
        $_SESSION['admin_logged_in'] = true;
        
        jsonResponse([
            'success' => true,
            'message' => 'Admin login successful',
            'username' => $admin['username']
        ]);
    } else {
        jsonResponse(['success' => false, 'message' => 'Username or password is incorrect'], 401);
    }
} catch (Exception $e) {
    jsonResponse(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
}
