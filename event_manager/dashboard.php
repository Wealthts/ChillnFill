<?php
require_once 'includes/config.php';

// Check authentication
if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}

// Fetch statistics
try {
    // Count total events
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM events WHERE organizer_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $total_events = $stmt->fetchColumn();
    
    // Count total attendees
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM attendees a 
        JOIN events e ON a.event_id = e.event_id 
        WHERE e.organizer_id = ?
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $total_attendees = $stmt->fetchColumn();
    
    // Count checked-in attendees
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM attendees a 
        JOIN events e ON a.event_id = e.event_id 
        WHERE e.organizer_id = ? AND a.checked_in = TRUE
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $checked_in_attendees = $stmt->fetchColumn();
    
    // Fetch recent events
    $stmt = $pdo->prepare("
        SELECT * FROM events 
        WHERE organizer_id = ? 
        ORDER BY event_date DESC 
        LIMIT 5
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $recent_events = $stmt->fetchAll();
    
} catch (PDOException $e) {
    die("Error: " . $e->getMessage());
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Event Management</title>
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
                    <li><a href="create_event.php">Create Event</a></li>
                    <li><a href="logout.php">Logout</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main class="container" style="margin-top: 2rem;">
        <h1>Welcome, <?php echo $_SESSION['name']; ?>! 👋</h1>
        <p style="color: #666; margin-bottom: 2rem;">Here's your event management overview</p>
        
        <!-- Statistics -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number"><?php echo $total_events; ?></div>
                <div class="stat-label">Total Events</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?php echo $total_attendees; ?></div>
                <div class="stat-label">Total Registrations</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?php echo $checked_in_attendees; ?></div>
                <div class="stat-label">Attended</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">
                    <?php echo $total_attendees > 0 ? round(($checked_in_attendees / $total_attendees) * 100, 1) : 0; ?>%
                </div>
                <div class="stat-label">Attendance Rate</div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-6">
                <div class="card">
                    <h3 style="margin-bottom: 1rem;">Recent Events</h3>
                    <?php if ($recent_events): ?>
                        <div style="overflow-x: auto;">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Event Name</th>
                                        <th>Date</th>
                                        <th>Venue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($recent_events as $event): ?>
                                        <tr>
                                            <td><?php echo sanitize($event['title']); ?></td>
                                            <td><?php echo date('M j, Y', strtotime($event['event_date'])); ?></td>
                                            <td><?php echo sanitize($event['venue']); ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    <?php else: ?>
                        <p style="text-align: center; color: #666; padding: 2rem;">No events yet</p>
                    <?php endif; ?>
                </div>
            </div>
            
            <div class="col-6">
                <div class="card">
                    <h3 style="margin-bottom: 1rem;">Quick Actions</h3>
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <a href="create_event.php" class="btn btn-primary">Create New Event</a>
                        <a href="events.php" class="btn btn-success">Manage All Events</a>
                        <a href="check_in.php" class="btn btn-primary">Check-in System</a>
                        <a href="roi_calculator.php" class="btn btn-warning">ROI Calculator</a>
                    </div>
                </div>
                
                <div class="card">
                    <h3 style="margin-bottom: 1rem;">Tips & Guidelines</h3>
                    <ul style="padding-left: 1.5rem; color: #666;">
                        <li>Create events and set up registration</li>
                        <li>Track registrations in real-time</li>
                        <li>Use check-in system on event day</li>
                        <li>Analyze ROI after events</li>
                        <li>Engage with attendees post-event</li>
                    </ul>
                </div>
            </div>
        </div>
    </main>
</body>
</html>