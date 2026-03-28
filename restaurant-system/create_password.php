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
    <script src="https://cdn.tailwindcss.com"></script>
</head>

<body class="max-w-3xl mx-auto my-10 px-5 leading-relaxed text-slate-800 font-sans">

    <h1 class="text-2xl font-bold">🔐 สร้างและอัปเดตรหัสผ่านระบบ</h1>

    <h2 class="border-b border-slate-200 pb-1.5 mt-7 text-lg font-semibold">สถานะฐานข้อมูล</h2>
    <?php if ($db_ok): ?>
        <p class="text-green-600">✅ เชื่อมต่อฐานข้อมูลสำเร็จ</p>
        <?php foreach ($results as $r): ?>
            <p class="<?= $r['ok'] ? 'text-green-600' : 'text-red-600' ?>"><?= $r['ok'] ? '✅' : '❌' ?> <?= htmlspecialchars($r['msg']) ?></p>
        <?php endforeach; ?>
    <?php else: ?>
        <p class="text-red-600">❌ เชื่อมต่อ DB ไม่ได้: <?= htmlspecialchars($db_error) ?></p>
        <p>ตรวจสอบ: Apache และ MySQL เปิดอยู่ใน XAMPP ไหม?</p>
    <?php endif; ?>

    <h2 class="border-b border-slate-200 pb-1.5 mt-7 text-lg font-semibold">Hash ที่สร้างขึ้น (runtime)</h2>
    <p><strong>admin123:</strong><br><code class="bg-slate-100 px-1.5 py-0.5 rounded"><?= htmlspecialchars($admin_hash) ?></code></p>
    <p><strong>cook123:</strong><br><code class="bg-slate-100 px-1.5 py-0.5 rounded"><?= htmlspecialchars($cook_hash) ?></code></p>

    <h2 class="border-b border-slate-200 pb-1.5 mt-7 text-lg font-semibold">SQL สำรอง (รันใน phpMyAdmin ถ้าต้องการ)</h2>
    <pre class="bg-slate-100 p-3 rounded-md overflow-x-auto text-[13px]">UPDATE admin SET password_hash = '<?= htmlspecialchars($admin_hash) ?>' WHERE username = 'admin';
UPDATE cooks SET password_hash = '<?= htmlspecialchars($cook_hash) ?>' WHERE cook_id = 'COOK001';
UPDATE cooks SET password_hash = '<?= htmlspecialchars($cook_hash) ?>' WHERE cook_id = 'COOK002';</pre>

    <h2 class="border-b border-slate-200 pb-1.5 mt-7 text-lg font-semibold">ทดสอบ password_verify</h2>
    <p class="<?= password_verify('admin123', $admin_hash) ? 'text-green-600' : 'text-red-600' ?>">
        <?= password_verify('admin123', $admin_hash) ? '✅' : '❌' ?> admin123 verify ผ่าน
    </p>
    <p class="<?= password_verify('cook123', $cook_hash) ? 'text-green-600' : 'text-red-600' ?>">
        <?= password_verify('cook123', $cook_hash) ? '✅' : '❌' ?> cook123 verify ผ่าน
    </p>

    <?php if ($db_ok && !empty($results) && $results[0]['ok']): ?>
        <hr class="my-4 border-slate-200">
        <p>🎉 <strong>เสร็จแล้ว!</strong> ไปทดสอบ login ได้เลย →
            <a href="/restaurant-system/index.html">http://localhost/restaurant-system/index.html</a>
        </p>
    <?php endif; ?>

</body>

</html>
