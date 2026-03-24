<?php
// เชื่อมฐานข้อมูลตรงๆ (ไม่ใช้ config.php เพราะมัน set Content-Type: application/json ทำให้ HTML พัง)
$host   = 'localhost';
$dbname = 'restaurant_system';
$db_user = 'root';
$db_pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db_ok = true;
} catch (PDOException $e) {
    $db_ok = false;
    $db_error = $e->getMessage();
}

// สร้าง hash จริงจาก PHP runtime
$admin_hash = password_hash('admin123', PASSWORD_DEFAULT);
$cook_hash  = password_hash('cook123',  PASSWORD_DEFAULT);

// อัปเดตฐานข้อมูลอัตโนมัติ
$results = [];
if ($db_ok) {
    try {
        $pdo->prepare("UPDATE admin SET password_hash = ? WHERE username = 'admin'")
            ->execute([$admin_hash]);
        $results[] = ['ok' => true, 'msg' => 'อัปเดต admin สำเร็จ'];

        $pdo->prepare("UPDATE cooks SET password_hash = ? WHERE cook_id IN ('COOK001','COOK002')")
            ->execute([$cook_hash]);
        $results[] = ['ok' => true, 'msg' => 'อัปเดต COOK001, COOK002 สำเร็จ'];
    } catch (Exception $e) {
        $results[] = ['ok' => false, 'msg' => 'Error: ' . $e->getMessage()];
    }
}
?>
<!DOCTYPE html>
<html lang="th">

<head>
    <meta charset="UTF-8">
    <title>สร้างรหัสผ่าน</title>
    <style>
        body {
            font-family: sans-serif;
            max-width: 720px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
        }

        pre {
            background: #f4f4f4;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 13px;
        }

        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 4px;
        }

        .ok {
            color: #16a34a;
        }

        .err {
            color: #dc2626;
        }

        h2 {
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 6px;
            margin-top: 28px;
        }
    </style>
</head>

<body>

    <h1>🔐 สร้างและอัปเดตรหัสผ่านระบบ</h1>

    <h2>สถานะฐานข้อมูล</h2>
    <?php if ($db_ok): ?>
        <p class="ok">✅ เชื่อมต่อฐานข้อมูลสำเร็จ</p>
        <?php foreach ($results as $r): ?>
            <p class="<?= $r['ok'] ? 'ok' : 'err' ?>"><?= $r['ok'] ? '✅' : '❌' ?> <?= htmlspecialchars($r['msg']) ?></p>
        <?php endforeach; ?>
    <?php else: ?>
        <p class="err">❌ เชื่อมต่อ DB ไม่ได้: <?= htmlspecialchars($db_error) ?></p>
        <p>ตรวจสอบ: Apache และ MySQL เปิดอยู่ใน XAMPP ไหม?</p>
    <?php endif; ?>

    <h2>Hash ที่สร้างขึ้น (runtime)</h2>
    <p><strong>admin123:</strong><br><code><?= htmlspecialchars($admin_hash) ?></code></p>
    <p><strong>cook123:</strong><br><code><?= htmlspecialchars($cook_hash) ?></code></p>

    <h2>SQL สำรอง (รันใน phpMyAdmin ถ้าต้องการ)</h2>
    <pre>UPDATE admin SET password_hash = '<?= htmlspecialchars($admin_hash) ?>' WHERE username = 'admin';
UPDATE cooks SET password_hash = '<?= htmlspecialchars($cook_hash) ?>' WHERE cook_id = 'COOK001';
UPDATE cooks SET password_hash = '<?= htmlspecialchars($cook_hash) ?>' WHERE cook_id = 'COOK002';</pre>

    <h2>ทดสอบ password_verify</h2>
    <p class="<?= password_verify('admin123', $admin_hash) ? 'ok' : 'err' ?>">
        <?= password_verify('admin123', $admin_hash) ? '✅' : '❌' ?> admin123 verify ผ่าน
    </p>
    <p class="<?= password_verify('cook123', $cook_hash) ? 'ok' : 'err' ?>">
        <?= password_verify('cook123', $cook_hash) ? '✅' : '❌' ?> cook123 verify ผ่าน
    </p>

    <?php if ($db_ok && !empty($results) && $results[0]['ok']): ?>
        <hr>
        <p>🎉 <strong>เสร็จแล้ว!</strong> ไปทดสอบ login ได้เลย →
            <a href="/restaurant-system/index.html">http://localhost/restaurant-system/index.html</a>
        </p>
    <?php endif; ?>

</body>

</html>