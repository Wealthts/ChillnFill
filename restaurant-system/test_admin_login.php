<?php
require_once 'config.php';

$stmt = $pdo->prepare("SELECT * FROM admin");
$stmt->execute();
$admins = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<h2>Check Admin Data</h2>";
if (count($admins) > 0) {
    foreach ($admins as $admin) {
        echo "ID: " . $admin['id'] . "<br>";
        echo "Username: " . $admin['username'] . "<br>";
        echo "Password Hash: " . $admin['password_hash'] . "<br>";
        
        // Verify password
        $test_password = 'admin123';
        if (password_verify($test_password, $admin['password_hash'])) {
            echo "PASS: password 'admin123' is correct<br><br>";
        } else {
            echo "FAIL: password 'admin123' is incorrect<br><br>";
        }
    }
} else {
    echo "FAIL: no admin record found in database<br>";
}

echo "<h2>Simulated Login Test</h2>";
$username = 'admin';
$password = 'admin123';

$stmt = $pdo->prepare("SELECT * FROM admin WHERE username = ?");
$stmt->execute([$username]);
$admin = $stmt->fetch(PDO::FETCH_ASSOC);

if ($admin) {
    echo "Found username: $username<br>";
    if (password_verify($password, $admin['password_hash'])) {
        echo "PASS: Login successful<br>";
        
        // Set session
        $_SESSION['user_type'] = 'admin';
        $_SESSION['admin_id'] = $admin['id'];
        $_SESSION['admin_username'] = $admin['username'];
        $_SESSION['admin_logged_in'] = true;
        
        echo "PASS: Session has been set<br>";
        echo "<pre>";
        print_r($_SESSION);
        echo "</pre>";
    } else {
        echo "FAIL: Password is incorrect<br>";
    }
} else {
    echo "FAIL: Username not found: $username<br>";
}
?>
