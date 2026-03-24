<?php
require_once 'includes/config.php';

if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}

// Automatically calculate ROI for all events
$events = $pdo->prepare("SELECT event_id, title FROM events WHERE organizer_id = ?");
$events->execute([$_SESSION['user_id']]);

$results = [];
while ($event = $events->fetch()) {
    $roi_data = calculateEventROI($pdo, $event['event_id']);
    $results[] = [
        'event' => $event['title'],
        'roi_data' => $roi_data
    ];
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auto ROI Calculator - Event Management</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <nav class="navbar">
                <div class="logo">Event Management</div>
                <ul class="nav-links">
                    <li><a href="dashboard.php">Dashboard</a></li>
                    <li><a href="auto_roi_calculator.php" style="font-weight: bold;">Auto ROI</a></li>
                    <li><a href="logout.php">Logout</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main class="container" style="margin-top: 2rem;">
        <h1>🤖 Auto ROI Calculator</h1>
        <p>Automatic ROI calculation for all events</p>
        
        <div class="card">
            <h3>Automated Calculation Results</h3>
            <?php foreach ($results as $result): ?>
                <div style="border: 1px solid #ddd; padding: 1rem; margin-bottom: 1rem; border-radius: 5px;">
                    <h4><?php echo sanitize($result['event']); ?></h4>
                    <?php if ($result['roi_data']): ?>
                        <p>Revenue: $<?php echo number_format($result['roi_data']['total_revenue'], 2); ?> | 
                           Expenses: $<?php echo number_format($result['roi_data']['total_expenses'], 2); ?> | 
                           ROI: <span style="color: <?php echo $result['roi_data']['roi_percentage'] >= 0 ? '#28a745' : '#dc3545'; ?>">
                            <?php echo number_format($result['roi_data']['roi_percentage'], 1); ?>%
                        </span></p>
                    <?php else: ?>
                        <p style="color: #666;">No financial data available</p>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
        
        <div style="margin-top: 2rem;">
            <a href="add_expenses.php" class="btn btn-primary">Add Financial Data</a>
            <a href="dashboard.php" class="btn">Back to Dashboard</a>
        </div>
    </main>
</body>
</html>