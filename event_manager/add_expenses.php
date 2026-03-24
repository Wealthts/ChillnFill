<?php
require_once 'includes/config.php';

if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}

$success = '';
$error = '';

// ดึงอีเวนต์ทั้งหมด
try {
    $stmt = $pdo->prepare("SELECT * FROM events WHERE organizer_id = ? ORDER BY event_date DESC");
    $stmt->execute([$_SESSION['user_id']]);
    $events = $stmt->fetchAll();
} catch (PDOException $e) {
    die("Error: " . $e->getMessage());
}

// เพิ่มค่าใช้จ่าย
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_expense'])) {
    $event_id = $_POST['event_id'];
    $description = sanitize($_POST['description']);
    $cost = $_POST['cost'];
    $expense_date = $_POST['expense_date'];
    
    try {
        // ตรวจสอบว่าเป็นเจ้าของอีเวนต์
        if (!userOwnsEvent($pdo, $_SESSION['user_id'], $event_id)) {
            $error = "You don't have permission to add expenses for this event";
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO expenses (event_id, description, cost, expense_date) 
                VALUES (?, ?, ?, ?)
            ");
            
            $stmt->execute([$event_id, $description, $cost, $expense_date]);
            
            // 🔥 AUTO ROI CALCULATION - คำนวณ ROI อัตโนมัติ
            $roi_data = updateROIAfterFinancialChange($pdo, $event_id);
            
            if ($roi_data) {
                $success = "Expense added successfully! ";
                $success .= "Updated ROI: " . number_format($roi_data['roi_percentage'], 1) . "%";
                
                // เก็บข้อมูล ROI ใน session เพื่อแสดงในหน้า ROI Calculator
                $_SESSION['last_roi_data'] = $roi_data;
                $_SESSION['last_event_id'] = $event_id;
            } else {
                $success = "Expense added successfully!";
            }
        }
        
    } catch (PDOException $e) {
        $error = "Error adding expense: " . $e->getMessage();
    }
}

// เพิ่มสปอนเซอร์
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_sponsor'])) {
    $event_id = $_POST['event_id'];
    $sponsor_name = sanitize($_POST['sponsor_name']);
    $contribution = $_POST['contribution'];
    $package_type = sanitize($_POST['package_type']);
    
    try {
        // ตรวจสอบว่าเป็นเจ้าของอีเวนต์
        if (!userOwnsEvent($pdo, $_SESSION['user_id'], $event_id)) {
            $error = "You don't have permission to add sponsors for this event";
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO sponsorships (event_id, sponsor_name, contribution, package_type) 
                VALUES (?, ?, ?, ?)
            ");
            
            $stmt->execute([$event_id, $sponsor_name, $contribution, $package_type]);
            
            // 🔥 AUTO ROI CALCULATION - คำนวณ ROI อัตโนมัติ
            $roi_data = updateROIAfterFinancialChange($pdo, $event_id);
            
            if ($roi_data) {
                $success = "Sponsor added successfully! ";
                $success .= "Updated ROI: " . number_format($roi_data['roi_percentage'], 1) . "%";
                
                // เก็บข้อมูล ROI ใน session เพื่อแสดงในหน้า ROI Calculator
                $_SESSION['last_roi_data'] = $roi_data;
                $_SESSION['last_event_id'] = $event_id;
            } else {
                $success = "Sponsor added successfully!";
            }
        }
        
    } catch (PDOException $e) {
        $error = "Error adding sponsor: " . $e->getMessage();
    }
}

// 🔥 NEW: Quick Add Sample Data
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_sample_data'])) {
    $event_id = $_POST['event_id'];
    
    try {
        if (!userOwnsEvent($pdo, $_SESSION['user_id'], $event_id)) {
            $error = "You don't have permission to add data for this event";
        } else {
            // เพิ่มค่าใช้จ่ายตัวอย่าง
            $sample_expenses = [
                ['Venue Rental', 1000.00, date('Y-m-d')],
                ['Catering Service', 500.00, date('Y-m-d')],
                ['Marketing Campaign', 300.00, date('Y-m-d')],
                ['Equipment Rental', 200.00, date('Y-m-d')]
            ];
            
            foreach ($sample_expenses as $expense) {
                $stmt = $pdo->prepare("
                    INSERT IGNORE INTO expenses (event_id, description, cost, expense_date) 
                    VALUES (?, ?, ?, ?)
                ");
                $stmt->execute([$event_id, $expense[0], $expense[1], $expense[2]]);
            }
            
            // เพิ่มสปอนเซอร์ตัวอย่าง
            $sample_sponsors = [
                ['Fresh Co.', 800.00, 'Gold Package'],
                ['Clean Solutions', 400.00, 'Silver Package']
            ];
            
            foreach ($sample_sponsors as $sponsor) {
                $stmt = $pdo->prepare("
                    INSERT IGNORE INTO sponsorships (event_id, sponsor_name, contribution, package_type) 
                    VALUES (?, ?, ?, ?)
                ");
                $stmt->execute([$event_id, $sponsor[0], $sponsor[1], $sponsor[2]]);
            }
            
            // คำนวณ ROI อัตโนมัติ
            $roi_data = updateROIAfterFinancialChange($pdo, $event_id);
            
            $success = "Sample data added successfully! ";
            if ($roi_data) {
                $success .= "Current ROI: " . number_format($roi_data['roi_percentage'], 1) . "%";
                $_SESSION['last_roi_data'] = $roi_data;
                $_SESSION['last_event_id'] = $event_id;
            }
        }
        
    } catch (PDOException $e) {
        $error = "Error adding sample data: " . $e->getMessage();
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Financial Data - Event Management</title>
    <link rel="stylesheet" href="css/style.css">
    <style>
        .quick-actions {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .roi-preview {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .financial-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .summary-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
    </style>
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
        <h1>💰 Add Financial Data</h1>
        
        <!-- 🔥 NEW: Display Flash Messages -->
        <?php displayFlashMessage(); ?>
        
        <?php if ($success): ?>
            <div class="alert alert-success"><?php echo $success; ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="alert alert-error"><?php echo $error; ?></div>
        <?php endif; ?>

        <!-- 🔥 NEW: Quick Actions -->
        <div class="quick-actions">
            <?php if (isset($_SESSION['last_event_id'])): ?>
                <a href="roi_calculator.php?event_id=<?php echo $_SESSION['last_event_id']; ?>" class="btn btn-primary">
                    📈 View Latest ROI
                </a>
            <?php endif; ?>
            <a href="auto_roi_calculator.php" class="btn btn-success">
                🤖 Auto ROI Calculator
            </a>
            <a href="dashboard.php" class="btn">
                🏠 Back to Dashboard
            </a>
        </div>

        <!-- 🔥 NEW: ROI Preview -->
        <?php if (isset($_SESSION['last_roi_data'])): ?>
        <div class="roi-preview">
            <h3>📊 Latest ROI Update</h3>
            <div class="financial-summary">
                <div class="summary-card">
                    <div style="font-size: 1.5rem; font-weight: bold;">
                        $<?php echo number_format($_SESSION['last_roi_data']['total_revenue'], 2); ?>
                    </div>
                    <div>Total Revenue</div>
                </div>
                <div class="summary-card">
                    <div style="font-size: 1.5rem; font-weight: bold;">
                        $<?php echo number_format($_SESSION['last_roi_data']['total_expenses'], 2); ?>
                    </div>
                    <div>Total Expenses</div>
                </div>
                <div class="summary-card">
                    <div style="font-size: 1.5rem; font-weight: bold; color: <?php echo $_SESSION['last_roi_data']['net_profit'] >= 0 ? '#28a745' : '#dc3545'; ?>">
                        $<?php echo number_format($_SESSION['last_roi_data']['net_profit'], 2); ?>
                    </div>
                    <div>Net Profit</div>
                </div>
                <div class="summary-card">
                    <div style="font-size: 1.5rem; font-weight: bold; color: <?php echo $_SESSION['last_roi_data']['roi_percentage'] >= 0 ? '#28a745' : '#dc3545'; ?>">
                        <?php echo number_format($_SESSION['last_roi_data']['roi_percentage'], 1); ?>%
                    </div>
                    <div>ROI</div>
                </div>
            </div>
        </div>
        <?php endif; ?>

        <div class="row">
            <div class="col-6">
                <div class="card">
                    <h3>💸 Add Expense</h3>
                    <form method="POST" action="">
                        <div class="form-group">
                            <label class="form-label">Select Event</label>
                            <select name="event_id" class="form-control" required>
                                <option value="">Choose an event</option>
                                <?php foreach ($events as $event): 
                                    $event_stats = getEventStatistics($pdo, $event['event_id']);
                                ?>
                                    <option value="<?php echo $event['event_id']; ?>">
                                        <?php echo sanitize($event['title']); ?> 
                                        (<?php echo date('M j, Y', strtotime($event['event_date'])); ?>)
                                        - <?php echo $event_stats['expense_count'] ?? 0; ?> expenses
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Expense Description</label>
                            <input type="text" name="description" class="form-control" placeholder="e.g., Venue rental, Catering, Marketing" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Cost ($)</label>
                            <input type="number" name="cost" class="form-control" step="0.01" min="0" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Date</label>
                            <input type="date" name="expense_date" class="form-control" value="<?php echo date('Y-m-d'); ?>">
                        </div>
                        
                        <button type="submit" name="add_expense" class="btn btn-primary">➕ Add Expense</button>
                    </form>
                </div>
            </div>
            
            <div class="col-6">
                <div class="card">
                    <h3>🏢 Add Sponsor</h3>
                    <form method="POST" action="">
                        <div class="form-group">
                            <label class="form-label">Select Event</label>
                            <select name="event_id" class="form-control" required>
                                <option value="">Choose an event</option>
                                <?php foreach ($events as $event): 
                                    $event_stats = getEventStatistics($pdo, $event['event_id']);
                                ?>
                                    <option value="<?php echo $event['event_id']; ?>">
                                        <?php echo sanitize($event['title']); ?> 
                                        (<?php echo date('M j, Y', strtotime($event['event_date'])); ?>)
                                        - <?php echo $event_stats['sponsor_count'] ?? 0; ?> sponsors
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Sponsor Name</label>
                            <input type="text" name="sponsor_name" class="form-control" placeholder="e.g., ABC Company, XYZ Corp" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Contribution ($)</label>
                            <input type="number" name="contribution" class="form-control" step="0.01" min="0" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Package Type</label>
                            <input type="text" name="package_type" class="form-control" placeholder="e.g., Gold, Silver, Bronze">
                        </div>
                        
                        <button type="submit" name="add_sponsor" class="btn btn-success">🏢 Add Sponsor</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- 🔥 NEW: Quick Sample Data Section -->
        <div class="card">
            <h3>🚀 Quick Sample Data</h3>
            <p>Add sample financial data instantly for testing:</p>
            
            <form method="POST" action="">
                <div class="form-group">
                    <label class="form-label">Select Event for Sample Data</label>
                    <select name="event_id" class="form-control" required>
                        <option value="">Choose an event</option>
                        <?php foreach ($events as $event): ?>
                            <option value="<?php echo $event['event_id']; ?>">
                                <?php echo sanitize($event['title']); ?> (<?php echo date('M j, Y', strtotime($event['event_date'])); ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <button type="submit" name="add_sample_data" class="btn btn-warning" 
                        onclick="return confirm('This will add sample expenses and sponsors. Continue?')">
                    🎯 Add Sample Data
                </button>
            </form>
            
            <div class="row" style="margin-top: 20px;">
                <div class="col-6">
                    <h4>Sample Expenses:</h4>
                    <ul>
                        <li>Venue Rental - $1,000</li>
                        <li>Catering Service - $500</li>
                        <li>Marketing Campaign - $300</li>
                        <li>Equipment Rental - $200</li>
                        <li><strong>Total: $2,000</strong></li>
                    </ul>
                </div>
                <div class="col-6">
                    <h4>Sample Sponsors:</h4>
                    <ul>
                        <li>Fresh Co. - $800 (Gold Package)</li>
                        <li>Clean Solutions - $400 (Silver Package)</li>
                        <li><strong>Total: $1,200</strong></li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- 🔥 NEW: Event Financial Overview -->
        <div class="card">
            <h3>📈 Event Financial Overview</h3>
            <div class="row">
                <?php foreach ($events as $event): 
                    $roi_data = calculateEventROI($pdo, $event['event_id']);
                    $event_stats = getEventStatistics($pdo, $event['event_id']);
                ?>
                    <div class="col-4" style="margin-bottom: 15px;">
                        <div style="border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
                            <h4><?php echo sanitize($event['title']); ?></h4>
                            <p><small><?php echo date('M j, Y', strtotime($event['event_date'])); ?></small></p>
                            
                            <?php if ($roi_data): ?>
                                <p><strong>Revenue:</strong> <?php echo formatCurrency($roi_data['total_revenue']); ?></p>
                                <p><strong>Expenses:</strong> <?php echo formatCurrency($roi_data['total_expenses']); ?></p>
                                <p><strong>ROI:</strong> 
                                    <span style="color: <?php echo $roi_data['roi_percentage'] >= 0 ? '#28a745' : '#dc3545'; ?>">
                                        <?php echo number_format($roi_data['roi_percentage'], 1); ?>%
                                    </span>
                                </p>
                            <?php else: ?>
                                <p style="color: #666;">No financial data</p>
                            <?php endif; ?>
                            
                            <div style="margin-top: 10px;">
                                <a href="roi_calculator.php?event_id=<?php echo $event['event_id']; ?>" class="btn btn-primary" style="padding: 5px 10px; font-size: 0.8rem;">
                                    View Details
                                </a>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    </main>

    <script>
        // 🔥 NEW: Auto-focus on first input
        document.addEventListener('DOMContentLoaded', function() {
            const firstInput = document.querySelector('input[type="text"], input[type="number"], select');
            if (firstInput) {
                firstInput.focus();
            }
        });

        // 🔥 NEW: Confirm before adding sample data
        function confirmSampleData() {
            return confirm('This will add sample expenses ($2,000) and sponsors ($1,200). Do you want to continue?');
        }
    </script>
</body>
</html>