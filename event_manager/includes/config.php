<?php
session_start();

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'eventsphere_db');

// Path Configuration
define('BASE_URL', 'http://localhost/event_manager');

// Database Connection
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}

// Authentication Functions
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function isAdmin() {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

// Security Functions
function sanitize($data) {
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

// 🔥 NEW: ROI Calculation Functions
function calculateEventROI($pdo, $event_id) {
    try {
        // Get event details
        $stmt = $pdo->prepare("SELECT ticket_price FROM events WHERE event_id = ?");
        $stmt->execute([$event_id]);
        $event = $stmt->fetch();
        
        if (!$event) return null;
        
        // Count attendees
        $stmt = $pdo->prepare("SELECT COUNT(*) as attendee_count FROM attendees WHERE event_id = ?");
        $stmt->execute([$event_id]);
        $attendee_data = $stmt->fetch();
        
        $paid_attendee_count = $attendee_data['attendee_count'] ?? 0;
        $ticket_revenue = 0;
        
        // Calculate ticket revenue
        if ($event['ticket_price'] > 0) {
            $ticket_revenue = $paid_attendee_count * $event['ticket_price'];
        }
        
        // Sponsor revenue
        $stmt = $pdo->prepare("SELECT COALESCE(SUM(contribution), 0) as sponsor_revenue FROM sponsorships WHERE event_id = ?");
        $stmt->execute([$event_id]);
        $sponsor_data = $stmt->fetch();
        $sponsor_revenue = $sponsor_data['sponsor_revenue'] ?? 0;
        
        // Expenses
        $stmt = $pdo->prepare("SELECT COALESCE(SUM(cost), 0) as total_expenses FROM expenses WHERE event_id = ?");
        $stmt->execute([$event_id]);
        $expense_data = $stmt->fetch();
        $total_expenses = $expense_data['total_expenses'] ?? 0;
        
        // Calculate totals
        $total_revenue = $ticket_revenue + $sponsor_revenue;
        $net_profit = $total_revenue - $total_expenses;
        
        // Calculate ROI percentage
        if ($total_expenses > 0) {
            $roi_percentage = ($net_profit / $total_expenses) * 100;
        } else {
            $roi_percentage = $total_revenue > 0 ? 100 : 0;
        }
        
        return [
            'ticket_revenue' => $ticket_revenue,
            'sponsor_revenue' => $sponsor_revenue,
            'total_revenue' => $total_revenue,
            'total_expenses' => $total_expenses,
            'net_profit' => $net_profit,
            'roi_percentage' => $roi_percentage,
            'attendee_count' => $paid_attendee_count
        ];
        
    } catch (PDOException $e) {
        error_log("ROI Calculation Error: " . $e->getMessage());
        return null;
    }
}

// 🔥 NEW: Auto-update ROI when adding financial data
function updateROIAfterFinancialChange($pdo, $event_id) {
    return calculateEventROI($pdo, $event_id);
}

// 🔥 NEW: Get overall financial summary for dashboard
function getDashboardFinancialSummary($pdo, $user_id) {
    try {
        $events = $pdo->prepare("SELECT event_id FROM events WHERE organizer_id = ?");
        $events->execute([$user_id]);
        
        $total_revenue = 0;
        $total_expenses = 0;
        $total_events = 0;
        $total_attendees = 0;
        
        while ($event = $events->fetch()) {
            $roi_data = calculateEventROI($pdo, $event['event_id']);
            if ($roi_data) {
                $total_revenue += $roi_data['total_revenue'];
                $total_expenses += $roi_data['total_expenses'];
            }
            $total_events++;
        }
        
        // Count total attendees
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total_attendees 
            FROM attendees a 
            JOIN events e ON a.event_id = e.event_id 
            WHERE e.organizer_id = ?
        ");
        $stmt->execute([$user_id]);
        $attendee_data = $stmt->fetch();
        $total_attendees = $attendee_data['total_attendees'] ?? 0;
        
        // Count checked-in attendees
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as checked_in_attendees 
            FROM attendees a 
            JOIN events e ON a.event_id = e.event_id 
            WHERE e.organizer_id = ? AND a.checked_in = TRUE
        ");
        $stmt->execute([$user_id]);
        $checked_in_data = $stmt->fetch();
        $checked_in_attendees = $checked_in_data['checked_in_attendees'] ?? 0;
        
        $net_profit = $total_revenue - $total_expenses;
        $overall_roi = $total_expenses > 0 ? ($net_profit / $total_expenses) * 100 : 0;
        
        return [
            'total_events' => $total_events,
            'total_attendees' => $total_attendees,
            'checked_in_attendees' => $checked_in_attendees,
            'total_revenue' => $total_revenue,
            'total_expenses' => $total_expenses,
            'net_profit' => $net_profit,
            'overall_roi' => $overall_roi
        ];
        
    } catch (PDOException $e) {
        error_log("Dashboard Summary Error: " . $e->getMessage());
        return null;
    }
}

// 🔥 NEW: Format currency helper function
function formatCurrency($amount) {
    return '$' . number_format($amount, 2);
}

// 🔥 NEW: Get event statistics
function getEventStatistics($pdo, $event_id) {
    try {
        // Count sponsors
        $stmt = $pdo->prepare("SELECT COUNT(*) as sponsor_count FROM sponsorships WHERE event_id = ?");
        $stmt->execute([$event_id]);
        $sponsor_count = $stmt->fetch()['sponsor_count'] ?? 0;
        
        // Count expenses
        $stmt = $pdo->prepare("SELECT COUNT(*) as expense_count FROM expenses WHERE event_id = ?");
        $stmt->execute([$event_id]);
        $expense_count = $stmt->fetch()['expense_count'] ?? 0;
        
        // Count checked-in attendees
        $stmt = $pdo->prepare("SELECT COUNT(*) as checked_in_count FROM attendees WHERE event_id = ? AND checked_in = TRUE");
        $stmt->execute([$event_id]);
        $checked_in_count = $stmt->fetch()['checked_in_count'] ?? 0;
        
        return [
            'sponsor_count' => $sponsor_count,
            'expense_count' => $expense_count,
            'checked_in_count' => $checked_in_count
        ];
        
    } catch (PDOException $e) {
        error_log("Event Statistics Error: " . $e->getMessage());
        return null;
    }
}

// 🔥 NEW: Check if user owns the event
function userOwnsEvent($pdo, $user_id, $event_id) {
    try {
        $stmt = $pdo->prepare("SELECT organizer_id FROM events WHERE event_id = ?");
        $stmt->execute([$event_id]);
        $event = $stmt->fetch();
        
        return $event && $event['organizer_id'] == $user_id;
        
    } catch (PDOException $e) {
        error_log("Event Ownership Check Error: " . $e->getMessage());
        return false;
    }
}

// 🔥 NEW: Redirect with message helper
function redirectWithMessage($url, $type, $message) {
    $_SESSION['flash_message'] = [
        'type' => $type,
        'message' => $message
    ];
    header("Location: $url");
    exit;
}

// 🔥 NEW: Display flash messages
function displayFlashMessage() {
    if (isset($_SESSION['flash_message'])) {
        $message = $_SESSION['flash_message'];
        $alert_class = $message['type'] === 'success' ? 'alert-success' : 'alert-error';
        
        echo "<div class='alert $alert_class'>" . sanitize($message['message']) . "</div>";
        unset($_SESSION['flash_message']);
    }
}

// 🔥 NEW: Generate random color for charts
function generateRandomColor() {
    $colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
    return $colors[array_rand($colors)];
}

// 🔥 NEW: Get recent activities
function getRecentActivities($pdo, $user_id, $limit = 5) {
    try {
        $stmt = $pdo->prepare("
            (SELECT 'event' as type, title as description, created_at as date FROM events WHERE organizer_id = ?)
            UNION ALL
            (SELECT 'attendee' as type, CONCAT('New registration: ', full_name) as description, registration_date as date FROM attendees a JOIN events e ON a.event_id = e.event_id WHERE e.organizer_id = ?)
            UNION ALL
            (SELECT 'sponsor' as type, CONCAT('New sponsor: ', sponsor_name) as description, created_at as date FROM sponsorships s JOIN events e ON s.event_id = e.event_id WHERE e.organizer_id = ?)
            ORDER BY date DESC 
            LIMIT ?
        ");
        $stmt->execute([$user_id, $user_id, $user_id, $limit]);
        return $stmt->fetchAll();
        
    } catch (PDOException $e) {
        error_log("Recent Activities Error: " . $e->getMessage());
        return [];
    }
}

// 🔥 NEW: Validate date format
function isValidDate($date, $format = 'Y-m-d') {
    $d = DateTime::createFromFormat($format, $date);
    return $d && $d->format($format) === $date;
}

// 🔥 NEW: Calculate attendance rate
function calculateAttendanceRate($pdo, $event_id) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total_attendees,
                SUM(CASE WHEN checked_in = TRUE THEN 1 ELSE 0 END) as checked_in_attendees
            FROM attendees 
            WHERE event_id = ?
        ");
        $stmt->execute([$event_id]);
        $data = $stmt->fetch();
        
        if ($data['total_attendees'] > 0) {
            return ($data['checked_in_attendees'] / $data['total_attendees']) * 100;
        }
        
        return 0;
        
    } catch (PDOException $e) {
        error_log("Attendance Rate Error: " . $e->getMessage());
        return 0;
    }
}
?>