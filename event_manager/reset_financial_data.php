<?php
require_once 'includes/config.php';

if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}

// หา event_id ของ Room Fresh
$stmt = $pdo->prepare("SELECT event_id FROM events WHERE title = 'Room Fresh' AND organizer_id = ?");
$stmt->execute([$_SESSION['user_id']]);
$event = $stmt->fetch();

if ($event) {
    $event_id = $event['event_id'];
    
    // ลบข้อมูลทางการเงินเก่า
    $pdo->prepare("DELETE FROM expenses WHERE event_id = ?")->execute([$event_id]);
    $pdo->prepare("DELETE FROM sponsorships WHERE event_id = ?")->execute([$event_id]);
    
    // เพิ่มข้อมูลที่ถูกต้อง
    $expenses = [
        ['Venue Rental', 1000.00, '2024-01-15'],
        ['Catering', 500.00, '2024-01-20'],
        ['Marketing', 300.00, '2024-01-10'],
        ['Equipment', 200.00, '2024-01-18']
    ];
    
    foreach ($expenses as $expense) {
        $stmt = $pdo->prepare("INSERT INTO expenses (event_id, description, cost, expense_date) VALUES (?, ?, ?, ?)");
        $stmt->execute([$event_id, $expense[0], $expense[1], $expense[2]]);
    }
    
    $sponsors = [
        ['Fresh Co.', 800.00, 'Gold Package'],
        ['Clean Solutions', 400.00, 'Silver Package']
    ];
    
    foreach ($sponsors as $sponsor) {
        $stmt = $pdo->prepare("INSERT INTO sponsorships (event_id, sponsor_name, contribution, package_type) VALUES (?, ?, ?, ?)");
        $stmt->execute([$event_id, $sponsor[0], $sponsor[1], $sponsor[2]]);
    }
    
    // ตั้งราคาตั๋ว
    $pdo->prepare("UPDATE events SET ticket_price = 50 WHERE event_id = ?")->execute([$event_id]);
    
    echo "<h2>✅ Financial Data Reset Successfully!</h2>";
    echo "<p>All financial data for 'Room Fresh' has been reset with correct values.</p>";
    
} else {
    echo "<h2>❌ Event 'Room Fresh' not found</h2>";
}
?>

<a href="roi_calculator.php?event_id=<?php echo $event_id ?? ''; ?>" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px; display: inline-block;">
    View ROI Calculator
</a>