<?php
require_once 'includes/config.php';

if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}

// หา event_id ของ Room Fresh
$stmt = $pdo->prepare("SELECT * FROM events WHERE organizer_id = ?");
$stmt->execute([$_SESSION['user_id']]);
$events = $stmt->fetchAll();

echo "<h2>Debug Financial Data</h2>";

foreach ($events as $event) {
    echo "<h3>Event: {$event['title']} (ID: {$event['event_id']})</h3>";
    
    // ตรวจสอบค่าใช้จ่าย
    $stmt = $pdo->prepare("SELECT * FROM expenses WHERE event_id = ?");
    $stmt->execute([$event['event_id']]);
    $expenses = $stmt->fetchAll();
    
    echo "<h4>Expenses:</h4>";
    if ($expenses) {
        foreach ($expenses as $expense) {
            echo "- {$expense['description']}: \${$expense['cost']}<br>";
        }
    } else {
        echo "No expenses found<br>";
    }
    
    // ตรวจสอบสปอนเซอร์
    $stmt = $pdo->prepare("SELECT * FROM sponsorships WHERE event_id = ?");
    $stmt->execute([$event['event_id']]);
    $sponsors = $stmt->fetchAll();
    
    echo "<h4>Sponsors:</h4>";
    if ($sponsors) {
        foreach ($sponsors as $sponsor) {
            echo "- {$sponsor['sponsor_name']}: \${$sponsor['contribution']} ({$sponsor['package_type']})<br>";
        }
    } else {
        echo "No sponsors found<br>";
    }
    
    echo "<hr>";
}
?>

<a href="roi_calculator.php" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Back to ROI Calculator</a>