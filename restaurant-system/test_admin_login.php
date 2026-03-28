<?php
require_once 'config.php';

$stmt = $pdo->prepare("SELECT * FROM admin");
$stmt->execute();
$admins = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<h2>ตรวจสอบข้อมูล Admin</h2>";
if (count($admins) > 0) {
    foreach ($admins as $admin) {
        echo "ID: " . $admin['id'] . "<br>";
        echo "Username: " . $admin['username'] . "<br>";
        echo "Password Hash: " . $admin['password_hash'] . "<br>";
        
        // ทดสอบ verify
        $test_password = 'admin123';
        if (password_verify($test_password, $admin['password_hash'])) {
            echo "✅ รหัสผ่าน 'admin123' ถูกต้อง<br><br>";
        } else {
            echo "❌ รหัสผ่าน 'admin123' ไม่ถูกต้อง<br><br>";
        }
    }
} else {
    echo "❌ ไม่พบข้อมูล admin ในฐานข้อมูล<br>";
}

echo "<h2>ทดสอบ Login จำลอง</h2>";
$username = 'admin';
$password = 'admin123';

$stmt = $pdo->prepare("SELECT * FROM admin WHERE username = ?");
$stmt->execute([$username]);
$admin = $stmt->fetch(PDO::FETCH_ASSOC);

if ($admin) {
    echo "พบ username: $username<br>";
    if (password_verify($password, $admin['password_hash'])) {
        echo "✅ Login สำเร็จ!<br>";
        
        // ตั้ง session
        $_SESSION['user_type'] = 'admin';
        $_SESSION['admin_id'] = $admin['id'];
        $_SESSION['admin_username'] = $admin['username'];
        $_SESSION['admin_logged_in'] = true;
        
        echo "✅ Session ถูกตั้งค่าเรียบร้อย<br>";
        echo "<pre>";
        print_r($_SESSION);
        echo "</pre>";
    } else {
        echo "❌ รหัสผ่านไม่ถูกต้อง<br>";
    }
} else {
    echo "❌ ไม่พบ username: $username<br>";
}
?>