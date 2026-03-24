<?php
require_once 'includes/config.php';

if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}

$success_messages = [];

// หา event_id ของ Room Fresh
$stmt = $pdo->prepare("SELECT event_id FROM events WHERE title = 'Room Fresh' AND organizer_id = ?");
$stmt->execute([$_SESSION['user_id']]);
$event = $stmt->fetch();

if ($event) {
    $event_id = $event['event_id'];
    
    // เพิ่มค่าใช้จ่ายที่เหลือ
    $remaining_expenses = [
        ['Catering Service', 500.00, '2024-01-20'],
        ['Marketing Campaign', 300.00, '2024-01-10'],
        ['Equipment Rental', 200.00, '2024-01-18']
    ];
    
    foreach ($remaining_expenses as $expense) {
        $stmt = $pdo->prepare("
            INSERT IGNORE INTO expenses (event_id, description, cost, expense_date) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$event_id, $expense[0], $expense[1], $expense[2]]);
    }
    $success_messages[] = "✅ Added remaining expenses";
    
    // เพิ่มสปอนเซอร์ที่เหลือ
    $stmt = $pdo->prepare("
        INSERT IGNORE INTO sponsorships (event_id, sponsor_name, contribution, package_type) 
        VALUES (?, 'Clean Solutions', 400.00, 'Silver Package')
    ");
    $stmt->execute([$event_id]);
    $success_messages[] = "✅ Added Clean Solutions sponsor";
    
    // ตั้งราคาตั๋ว
    $stmt = $pdo->prepare("UPDATE events SET ticket_price = 50.00 WHERE event_id = ?");
    $stmt->execute([$event_id]);
    $success_messages[] = "✅ Set ticket price to $50";
    
    // เพิ่มผู้ลงทะเบียนที่จ่ายตั๋ว
    $paid_attendees = [
        ['John Smith', 'john@email.com', 'Tech Corp', 'Manager'],
        ['Sarah Johnson', 'sarah@email.com', 'Design Co', 'Designer'],
        ['Mike Brown', 'mike@email.com', 'Marketing Inc', 'Director'],
        ['Emily Davis', 'emily@email.com', 'Creative Ltd', 'Developer']
    ];
    
    foreach ($paid_attendees as $attendee) {
        $stmt = $pdo->prepare("
            INSERT IGNORE INTO attendees (event_id, full_name, email, company, position) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$event_id, $attendee[0], $attendee[1], $attendee[2], $attendee[3]]);
    }
    $success_messages[] = "✅ Added 4 paid attendees";
    
} else {
    $success_messages[] = "❌ Event 'Room Fresh' not found";
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete Financial Data - Event Management</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <nav class="navbar">
                <div class="logo">Event Management</div>
                <ul class="nav-links">
                    <li><a href="dashboard.php">Dashboard</a></li>
                    <li><a href="roi_calculator.php">ROI Calculator</a></li>
                    <li><a href="logout.php">Logout</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main class="container" style="margin-top: 2rem;">
        <h1>Complete Financial Data</h1>
        
        <div class="card">
            <h3>✅ Data Added Successfully!</h3>
            <?php foreach ($success_messages as $message): ?>
                <p><?php echo $message; ?></p>
            <?php endforeach; ?>
        </div>
        
        <div class="card">
            <h3>📊 Complete Financial Overview</h3>
            <div class="row">
                <div class="col-6">
                    <h4>💰 Expenses:</h4>
                    <ul>
                        <li>Venue Rental: $1,000</li>
                        <li>Catering Service: $500</li>
                        <li>Marketing Campaign: $300</li>
                        <li>Equipment Rental: $200</li>
                        <li><strong>Total Expenses: $2,000</strong></li>
                    </ul>
                </div>
                <div class="col-6">
                    <h4>🏢 Revenue:</h4>
                    <ul>
                        <li>Fresh Co. Sponsor: $800</li>
                        <li>Clean Solutions Sponsor: $400</li>
                        <li>Ticket Sales (4 × $50): $200</li>
                        <li><strong>Total Revenue: $1,400</strong></li>
                    </ul>
                </div>
            </div>
            
            <div style="background: #fff3cd; padding: 1rem; border-radius: 5px; margin-top: 1rem; border-left: 4px solid #ffc107;">
                <h4>🎯 ROI Analysis:</h4>
                <p><strong>Total Revenue:</strong> $1,400</p>
                <p><strong>Total Expenses:</strong> $2,000</p>
                <p><strong>Net Profit/Loss:</strong> -$600</p>
                <p><strong>ROI:</strong> -30%</p>
                <p><em>This event resulted in a loss. Consider increasing ticket prices or finding additional sponsors.</em></p>
            </div>
        </div>
        
        <div style="display: flex; gap: 1rem; margin-top: 2rem;">
            <a href="roi_calculator.php?event_id=<?php echo $event_id ?? ''; ?>" class="btn btn-primary">
                📈 View Detailed ROI Analysis
            </a>
            <a href="add_expenses.php" class="btn btn-success">
                💰 Add More Financial Data
            </a>
            <a href="dashboard.php" class="btn">
                🏠 Back to Dashboard
            </a>
        </div>
    </main>
</body>
</html>