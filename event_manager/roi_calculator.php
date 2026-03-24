<?php
require_once 'includes/config.php';

if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}

$event_id = $_GET['event_id'] ?? null;
$events = [];
$roi_data = null;
$current_event = null;

// Fetch all events
try {
    $stmt = $pdo->prepare("SELECT * FROM events WHERE organizer_id = ? ORDER BY event_date DESC");
    $stmt->execute([$_SESSION['user_id']]);
    $events = $stmt->fetchAll();
} catch (PDOException $e) {
    die("Error: " . $e->getMessage());
}

// Calculate ROI
if ($event_id) {
    try {
        // Verify ownership
        $stmt = $pdo->prepare("SELECT * FROM events WHERE event_id = ? AND organizer_id = ?");
        $stmt->execute([$event_id, $_SESSION['user_id']]);
        $current_event = $stmt->fetch();
        
        if ($current_event) {
            // 🔥 FIXED: Better ticket revenue calculation
            $stmt = $pdo->prepare("
                SELECT COUNT(*) as attendee_count 
                FROM attendees 
                WHERE event_id = ?
            ");
            $stmt->execute([$event_id]);
            $attendee_data = $stmt->fetch();
            
            $ticket_revenue_amount = 0;
            $paid_attendee_count = $attendee_data['attendee_count'] ?? 0;
            
            // Calculate ticket revenue only if ticket price > 0
            if ($current_event['ticket_price'] > 0) {
                $ticket_revenue_amount = $paid_attendee_count * $current_event['ticket_price'];
            }
            
            // Sponsor revenue
            $stmt = $pdo->prepare("SELECT COALESCE(SUM(contribution), 0) as sponsor_revenue FROM sponsorships WHERE event_id = ?");
            $stmt->execute([$event_id]);
            $sponsor_data = $stmt->fetch();
            $sponsor_revenue_amount = $sponsor_data['sponsor_revenue'] ?? 0;
            
            // Expenses
            $stmt = $pdo->prepare("SELECT COALESCE(SUM(cost), 0) as total_expenses FROM expenses WHERE event_id = ?");
            $stmt->execute([$event_id]);
            $expense_data = $stmt->fetch();
            $total_expenses_amount = $expense_data['total_expenses'] ?? 0;
            
            // Calculate ROI
            $total_revenue = $ticket_revenue_amount + $sponsor_revenue_amount;
            $net_profit = $total_revenue - $total_expenses_amount;
            
            // Fix ROI percentage calculation
            if ($total_expenses_amount > 0) {
                $roi_percentage = ($net_profit / $total_expenses_amount) * 100;
            } else {
                $roi_percentage = $total_revenue > 0 ? 100 : 0;
            }
            
            $roi_data = [
                'ticket_revenue' => $ticket_revenue_amount,
                'sponsor_revenue' => $sponsor_revenue_amount,
                'total_revenue' => $total_revenue,
                'total_expenses' => $total_expenses_amount,
                'net_profit' => $net_profit,
                'roi_percentage' => $roi_percentage,
                'attendee_count' => $paid_attendee_count
            ];
        }
    } catch (PDOException $e) {
        die("Error: " . $e->getMessage());
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ROI Calculator - Event Management</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <nav class="navbar">
                <div class="logo">Event Management</div>
                <ul class="nav-links">
                    <li><a href="dashboard.php">Dashboard</a></li>
                    <li><a href="events.php">All Events</a></li>
                    <li><a href="roi_calculator.php">ROI Calculator</a></li>
                    <li><a href="logout.php">Logout</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main class="container" style="margin-top: 2rem;">
        <h1>📈 Return on Investment (ROI) Calculator</h1>
        
        <div class="row">
            <div class="col-4">
                <div class="card">
                    <h3>Select Event</h3>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <?php foreach ($events as $event): ?>
                            <a href="roi_calculator.php?event_id=<?php echo $event['event_id']; ?>" 
                               class="btn <?php echo $event_id == $event['event_id'] ? 'btn-primary' : ''; ?>" 
                               style="text-align: left;">
                                <?php echo sanitize($event['title']); ?>
                                <br>
                                <small><?php echo date('M j, Y', strtotime($event['event_date'])); ?></small>
                            </a>
                        <?php endforeach; ?>
                    </div>
                </div>
                
                <?php if ($current_event && $roi_data): ?>
                <div class="card">
                    <h3>💰 Quick Financial Summary</h3>
                    <p><strong>Ticket Price:</strong> $<?php echo number_format($current_event['ticket_price'], 2); ?></p>
                    <p><strong>Total Attendees:</strong> <?php echo $roi_data['attendee_count']; ?></p>
                    <p><strong>Total Sponsors:</strong> 
                        <?php 
                            $stmt = $pdo->prepare("SELECT COUNT(*) FROM sponsorships WHERE event_id = ?");
                            $stmt->execute([$event_id]);
                            echo $stmt->fetchColumn();
                        ?>
                    </p>
                    <p><strong>Total Expenses:</strong> 
                        <?php 
                            $stmt = $pdo->prepare("SELECT COUNT(*) FROM expenses WHERE event_id = ?");
                            $stmt->execute([$event_id]);
                            echo $stmt->fetchColumn();
                        ?>
                    </p>
                </div>
                <?php endif; ?>
            </div>

            <div class="col-8">
                <?php if ($current_event && $roi_data): ?>
                    <div class="card">
                        <h2>ROI Results: <?php echo sanitize($current_event['title']); ?></h2>
                        
                        <!-- 🔥 FIXED: Better financial overview -->
                        <div style="background: #f8f9fa; padding: 1rem; border-radius: 5px; margin-bottom: 1.5rem;">
                            <h4>Financial Summary</h4>
                            <div class="row">
                                <div class="col-6">
                                    <p><strong>Revenue Sources:</strong></p>
                                    <p>• Ticket Sales: $<?php echo number_format($roi_data['ticket_revenue'], 2); ?></p>
                                    <p>• Sponsorships: $<?php echo number_format($roi_data['sponsor_revenue'], 2); ?></p>
                                </div>
                                <div class="col-6">
                                    <p><strong>Costs:</strong></p>
                                    <p>• Total Expenses: $<?php echo number_format($roi_data['total_expenses'], 2); ?></p>
                                    <p>• Net Result: <span style="color: <?php echo $roi_data['net_profit'] >= 0 ? '#28a745' : '#dc3545'; ?>; font-weight: bold;">
                                        $<?php echo number_format($roi_data['net_profit'], 2); ?>
                                    </span></p>
                                </div>
                            </div>
                        </div>

                        <div class="stats-grid" style="margin-bottom: 2rem;">
                            <div class="stat-card">
                                <div class="stat-number" style="color: #28a745;">$<?php echo number_format($roi_data['total_revenue'], 2); ?></div>
                                <div class="stat-label">Total Revenue</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number" style="color: #dc3545;">$<?php echo number_format($roi_data['total_expenses'], 2); ?></div>
                                <div class="stat-label">Total Expenses</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number" style="color: <?php echo $roi_data['net_profit'] >= 0 ? '#28a745' : '#dc3545'; ?>">
                                    $<?php echo number_format($roi_data['net_profit'], 2); ?>
                                </div>
                                <div class="stat-label">Net Profit/Loss</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number" style="color: <?php echo $roi_data['roi_percentage'] >= 0 ? '#28a745' : '#dc3545'; ?>">
                                    <?php echo number_format($roi_data['roi_percentage'], 1); ?>%
                                </div>
                                <div class="stat-label">ROI Percentage</div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-6">
                                <div class="card">
                                    <h3>📊 Revenue Breakdown</h3>
                                    <p><strong>Ticket Revenue:</strong> $<?php echo number_format($roi_data['ticket_revenue'], 2); ?></p>
                                    <p><strong>Sponsor Revenue:</strong> $<?php echo number_format($roi_data['sponsor_revenue'], 2); ?></p>
                                    <p><strong>Total Attendees:</strong> <?php echo $roi_data['attendee_count']; ?></p>
                                    <?php if ($current_event['ticket_price'] > 0 && $roi_data['attendee_count'] > 0): ?>
                                        <p><small>(<?php echo $roi_data['attendee_count']; ?> attendees × $<?php echo number_format($current_event['ticket_price'], 2); ?> per ticket)</small></p>
                                    <?php elseif ($current_event['ticket_price'] == 0): ?>
                                        <p><small>🎫 Free event - no ticket revenue</small></p>
                                    <?php endif; ?>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="card">
                                    <h3>💡 ROI Analysis</h3>
                                    <?php if ($roi_data['roi_percentage'] > 0): ?>
                                        <div style="color: #28a745; font-weight: bold; padding: 1rem; background: #d4edda; border-radius: 5px;">
                                            ✅ <strong>Profitable Event!</strong><br>
                                            Return: <?php echo number_format($roi_data['roi_percentage'], 1); ?>%
                                        </div>
                                        <p style="margin-top: 1rem;">For every $100 invested, you got back <strong>$<?php echo number_format(100 + $roi_data['roi_percentage'], 1); ?></strong></p>
                                    <?php elseif ($roi_data['roi_percentage'] == 0): ?>
                                        <div style="color: #856404; font-weight: bold; padding: 1rem; background: #fff3cd; border-radius: 5px;">
                                            ⚖️ <strong>Break Even</strong><br>
                                            Revenue equals expenses
                                        </div>
                                    <?php else: ?>
                                        <div style="color: #721c24; font-weight: bold; padding: 1rem; background: #f8d7da; border-radius: 5px;">
                                            ❌ <strong>Event at Loss</strong><br>
                                            Loss: <?php echo number_format(abs($roi_data['roi_percentage']), 1); ?>%
                                        </div>
                                        <p style="margin-top: 1rem;">For every $100 invested, you lost <strong>$<?php echo number_format(abs($roi_data['roi_percentage']), 1); ?></strong></p>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3>🎯 Recommendations to Improve ROI</h3>
                        <div class="row">
                            <div class="col-6">
                                <h4>💸 Increase Revenue</h4>
                                <ul>
                                    <li>Increase ticket prices</li>
                                    <li>Create VIP packages</li>
                                    <li>Find more sponsors</li>
                                    <li>Sell merchandise</li>
                                </ul>
                            </div>
                            <div class="col-6">
                                <h4>📉 Reduce Costs</h4>
                                <ul>
                                    <li>Negotiate venue costs</li>
                                    <li>Optimize marketing budget</li>
                                    <li>Reduce catering expenses</li>
                                    <li>Use volunteer staff</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div style="margin-top: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                            <a href="add_expenses.php" class="btn btn-primary">➕ Add Expenses</a>
                            <a href="add_expenses.php" class="btn btn-success">🏢 Add Sponsors</a>
                            <a href="events.php?edit=<?php echo $event_id; ?>" class="btn btn-warning">🎫 Edit Ticket Price</a>
                            <a href="check_in.php?event_id=<?php echo $event_id; ?>" class="btn btn-info">👥 Manage Attendees</a>
                        </div>
                    </div>
                    
                <?php elseif ($current_event): ?>
                    <div class="card">
                        <div style="text-align: center; padding: 3rem; color: #666;">
                            <h3>📊 No Financial Data Available</h3>
                            <p>Start adding financial data to see ROI analysis</p>
                            <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center;">
                                <a href="add_expenses.php" class="btn btn-primary">➕ Add Financial Data</a>
                                <a href="events.php" class="btn">📋 Manage Events</a>
                            </div>
                        </div>
                    </div>
                <?php else: ?>
                    <div class="card">
                        <div style="text-align: center; padding: 3rem; color: #666;">
                            <h3>🎯 Select Event for ROI Analysis</h3>
                            <p>Choose an event from the menu to view detailed ROI calculations</p>
                            <div style="margin-top: 1.5rem;">
                                <a href="create_event.php" class="btn btn-primary">➕ Create New Event</a>
                            </div>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </main>
</body>
</html>