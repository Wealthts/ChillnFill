<?php
require_once 'includes/config.php';

if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}

// Fetch all events
try {
    $stmt = $pdo->prepare("
        SELECT e.*, 
               COUNT(a.attendee_id) as attendee_count,
               SUM(CASE WHEN a.checked_in = TRUE THEN 1 ELSE 0 END) as checked_in_count
        FROM events e 
        LEFT JOIN attendees a ON e.event_id = a.event_id 
        WHERE e.organizer_id = ? 
        GROUP BY e.event_id 
        ORDER BY e.event_date DESC
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $events = $stmt->fetchAll();
    
} catch (PDOException $e) {
    die("Error: " . $e->getMessage());
}

// Delete event
if (isset($_GET['delete_id'])) {
    try {
        $delete_id = $_GET['delete_id'];
        
        // Verify event ownership
        $stmt = $pdo->prepare("SELECT organizer_id FROM events WHERE event_id = ?");
        $stmt->execute([$delete_id]);
        $event = $stmt->fetch();
        
        if ($event && $event['organizer_id'] == $_SESSION['user_id']) {
            // Delete related data first
            $pdo->prepare("DELETE FROM attendees WHERE event_id = ?")->execute([$delete_id]);
            $pdo->prepare("DELETE FROM expenses WHERE event_id = ?")->execute([$delete_id]);
            $pdo->prepare("DELETE FROM sponsorships WHERE event_id = ?")->execute([$delete_id]);
            
            // Delete event
            $pdo->prepare("DELETE FROM events WHERE event_id = ?")->execute([$delete_id]);
            
            header('Location: events.php?success=Event deleted successfully');
            exit;
        }
    } catch (PDOException $e) {
        header('Location: events.php?error=Error deleting event');
        exit;
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Events - Event Management</title>
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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h1>Manage All Events</h1>
            <a href="create_event.php" class="btn btn-primary">+ Create New Event</a>
        </div>

        <?php if (isset($_GET['success'])): ?>
            <div class="alert alert-success"><?php echo sanitize($_GET['success']); ?></div>
        <?php endif; ?>
        
        <?php if (isset($_GET['error'])): ?>
            <div class="alert alert-error"><?php echo sanitize($_GET['error']); ?></div>
        <?php endif; ?>

        <div class="card">
            <?php if ($events): ?>
                <div style="overflow-x: auto;">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Event Name</th>
                                <th>Date</th>
                                <th>Venue</th>
                                <th>Registrations</th>
                                <th>Attended</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($events as $event): 
                                $event_date = strtotime($event['event_date']);
                                $today = strtotime(date('Y-m-d'));
                                $status = $event_date < $today ? 'Completed' : ($event_date == $today ? 'Today' : 'Upcoming');
                                $status_class = $event_date < $today ? 'status-completed' : ($event_date == $today ? 'status-today' : 'status-upcoming');
                            ?>
                                <tr>
                                    <td>
                                        <strong><?php echo sanitize($event['title']); ?></strong>
                                        <?php if ($event['ticket_price'] > 0): ?>
                                            <br><small style="color: #28a745;">$<?php echo number_format($event['ticket_price'], 2); ?></small>
                                        <?php endif; ?>
                                    </td>
                                    <td><?php echo date('M j, Y', strtotime($event['event_date'])); ?></td>
                                    <td><?php echo sanitize($event['venue']); ?></td>
                                    <td><?php echo $event['attendee_count']; ?></td>
                                    <td>
                                        <?php echo $event['checked_in_count']; ?>
                                        <?php if ($event['attendee_count'] > 0): ?>
                                            <br><small>(<?php echo round(($event['checked_in_count'] / $event['attendee_count']) * 100, 1); ?>%)</small>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <span class="<?php echo $status_class; ?>"><?php echo $status; ?></span>
                                    </td>
                                    <td>
                                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                            <a href="event_detail.php?id=<?php echo $event['event_id']; ?>" class="btn btn-primary" style="padding: 0.5rem; font-size: 0.8rem;">View</a>
                                            <a href="edit_event.php?id=<?php echo $event['event_id']; ?>" class="btn btn-warning" style="padding: 0.5rem; font-size: 0.8rem;">Edit</a>
                                            <a href="check_in.php?event_id=<?php echo $event['event_id']; ?>" class="btn btn-success" style="padding: 0.5rem; font-size: 0.8rem;">Check-in</a>
                                            <a href="events.php?delete_id=<?php echo $event['event_id']; ?>" class="btn btn-danger" style="padding: 0.5rem; font-size: 0.8rem;" 
                                               onclick="return confirm('Are you sure you want to delete this event? This action cannot be undone.')">Delete</a>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <div style="text-align: center; padding: 3rem; color: #666;">
                    <h3>No Events Yet</h3>
                    <p>Start by creating your first event!</p>
                    <a href="create_event.php" class="btn btn-primary" style="margin-top: 1rem;">Create First Event</a>
                </div>
            <?php endif; ?>
        </div>
    </main>
</body>
</html>