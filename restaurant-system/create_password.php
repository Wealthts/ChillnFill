<?php
// Connect to DB directly (config.php sets Content-Type: application/json which breaks this HTML page)
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

// Generate hashes from current PHP runtime
$admin_hash = password_hash('admin123', PASSWORD_ARGON2ID);
$cook_hash  = password_hash('cook123',  PASSWORD_ARGON2ID);

// Update database automatically
$results = [];
if ($db_ok) {
    try {
        $pdo->prepare("UPDATE admin SET password_hash = ? WHERE username = 'admin'")
            ->execute([$admin_hash]);
        $results[] = ['ok' => true, 'msg' => 'Admin updated successfully'];

        $pdo->prepare("UPDATE cooks SET password_hash = ? WHERE cook_id IN ('COOK001','COOK002')")
            ->execute([$cook_hash]);
        $results[] = ['ok' => true, 'msg' => 'COOK001 and COOK002 updated successfully'];
    } catch (Exception $e) {
        $results[] = ['ok' => false, 'msg' => 'Error: ' . $e->getMessage()];
    }
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Create Password Hashes</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>

<body class="max-w-3xl mx-auto my-10 px-5 leading-relaxed text-slate-800 font-sans">

    <h1 class="text-2xl font-bold">Create and Update System Password Hashes</h1>

    <h2 class="border-b border-slate-200 pb-1.5 mt-7 text-lg font-semibold">Database Status</h2>
    <?php if ($db_ok): ?>
        <p class="text-green-600">Database connection successful</p>
        <?php foreach ($results as $r): ?>
            <p class="<?= $r['ok'] ? 'text-green-600' : 'text-red-600' ?>"><?= $r['ok'] ? '✅' : '❌' ?> <?= htmlspecialchars($r['msg']) ?></p>
        <?php endforeach; ?>
    <?php else: ?>
        <p class="text-red-600">Failed to connect to DB: <?= htmlspecialchars($db_error) ?></p>
        <p>Please check that Apache and MySQL are running in XAMPP.</p>
    <?php endif; ?>

    <h2 class="border-b border-slate-200 pb-1.5 mt-7 text-lg font-semibold">Generated Hashes (Runtime)</h2>
    <p><strong>admin123:</strong><br><code class="bg-slate-100 px-1.5 py-0.5 rounded"><?= htmlspecialchars($admin_hash) ?></code></p>
    <p><strong>cook123:</strong><br><code class="bg-slate-100 px-1.5 py-0.5 rounded"><?= htmlspecialchars($cook_hash) ?></code></p>

    <h2 class="border-b border-slate-200 pb-1.5 mt-7 text-lg font-semibold">Backup SQL (run in phpMyAdmin if needed)</h2>
    <pre class="bg-slate-100 p-3 rounded-md overflow-x-auto text-[13px]">UPDATE admin SET password_hash = '<?= htmlspecialchars($admin_hash) ?>' WHERE username = 'admin';
UPDATE cooks SET password_hash = '<?= htmlspecialchars($cook_hash) ?>' WHERE cook_id = 'COOK001';
UPDATE cooks SET password_hash = '<?= htmlspecialchars($cook_hash) ?>' WHERE cook_id = 'COOK002';</pre>

    <h2 class="border-b border-slate-200 pb-1.5 mt-7 text-lg font-semibold">password_verify Test</h2>
    <p class="<?= password_verify('admin123', $admin_hash) ? 'text-green-600' : 'text-red-600' ?>">
        <?= password_verify('admin123', $admin_hash) ? 'PASS' : 'FAIL' ?> admin123 verify result
    </p>
    <p class="<?= password_verify('cook123', $cook_hash) ? 'text-green-600' : 'text-red-600' ?>">
        <?= password_verify('cook123', $cook_hash) ? 'PASS' : 'FAIL' ?> cook123 verify result
    </p>

    <?php if ($db_ok && !empty($results) && $results[0]['ok']): ?>
        <hr class="my-4 border-slate-200">
        <p><strong>Done!</strong> You can test login now:
            <a href="/restaurant-system/index.html">http://localhost/restaurant-system/index.html</a>
        </p>
    <?php endif; ?>

</body>

</html>
