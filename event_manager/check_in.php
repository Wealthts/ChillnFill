<?php
require_once 'includes/config.php';

if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}

$event_id = $_GET['event_id'] ?? null;
$events = [];
$attendees = [];
$current_event = null;

// Fetch organizer's events
try {
    $stmt = $pdo->prepare("SELECT * FROM events WHERE organizer_id = ? ORDER BY event_date DESC");
    $stmt->execute([$_SESSION['user_id']]);
    $events = $stmt->fetchAll();
} catch (PDOException $e) {
    die("Error: " . $e->getMessage());
}

// If event is selected
if ($event_id) {
    try {
        // Verify event ownership
        $stmt = $pdo->prepare("SELECT * FROM events WHERE event_id = ? AND organizer_id = ?");
        $stmt->execute([$event_id, $_SESSION['user_id']]);
        $current_event = $stmt->fetch();
        
        if ($current_event) {
            // Fetch attendees
            $stmt = $pdo->prepare("SELECT * FROM attendees WHERE event_id = ? ORDER BY registration_date DESC");
            $stmt->execute([$event_id]);
            $attendees = $stmt->fetchAll();
        }
    } catch (PDOException $e) {
        die("Error: " . $e->getMessage());
    }
}

// Manual check-in
if (isset($_POST['check_in'])) {
    $attendee_id = $_POST['attendee_id'];
    
    try {
        $stmt = $pdo->prepare("UPDATE attendees SET checked_in = TRUE, check_in_time = NOW() WHERE attendee_id = ? AND event_id = ?");
        $stmt->execute([$attendee_id, $event_id]);
        
        header("Location: check_in.php?event_id=$event_id&success=Check-in successful");
        exit;
    } catch (PDOException $e) {
        header("Location: check_in.php?event_id=$event_id&error=Check-in error");
        exit;
    }
}

// QR Code check-in (simplified)
if (isset($_POST['qrcode_email'])) {
    $email = sanitize($_POST['qrcode_email']);
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM attendees WHERE event_id = ? AND email = ?");
        $stmt->execute([$event_id, $email]);
        $attendee = $stmt->fetch();
        
        if ($attendee) {
            if ($attendee['checked_in']) {
                $error = "Attendee already checked in at " . date('g:i A', strtotime($attendee['check_in_time']));
            } else {
                $stmt = $pdo->prepare("UPDATE attendees SET checked_in = TRUE, check_in_time = NOW() WHERE attendee_id = ?");
                $stmt->execute([$attendee['attendee_id']]);
                $success = "Check-in successful for: " . $attendee['full_name'];
            }
        } else {
            $error = "No registration found with this email";
        }
    } catch (PDOException $e) {
        $error = "Check-in error";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Check-in System - Event Management</title>
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
                    <li><a href="check_in.php" style="font-weight: bold;">Check-in</a></li>
                    <li><a href="logout.php">Logout</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main class="container" style="margin-top: 2rem;">
        <h1>Check-in System</h1>
        
        <?php if (isset($_GET['success'])): ?>
            <div class="alert alert-success"><?php echo sanitize($_GET['success']); ?></div>
        <?php endif; ?>
        
        <?php if (isset($_GET['error'])): ?>
            <div class="alert alert-error"><?php echo sanitize($_GET['error']); ?></div>
        <?php endif; ?>
        
        <?php if (isset($success)): ?>
            <div class="alert alert-success"><?php echo $success; ?></div>
        <?php endif; ?>
        
        <?php if (isset($error)): ?>
            <div class="alert alert-error"><?php echo $error; ?></div>
        <?php endif; ?>

        <div class="row">
            <div class="col-4">
                <div class="card">
                    <h3>Select Event</h3>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <?php foreach ($events as $event): ?>
                            <a href="check_in.php?event_id=<?php echo $event['event_id']; ?>" 
                               class="btn <?php echo $event_id == $event['event_id'] ? 'btn-primary' : ''; ?>" 
                               style="text-align: left;">
                                <?php echo sanitize($event['title']); ?>
                                <br>
                                <small><?php echo date('M j, Y', strtotime($event['event_date'])); ?> - <?php echo sanitize($event['venue']); ?></small>
                            </a>
                        <?php endforeach; ?>
                    </div>
                </div>

                <?php if ($current_event): ?>
                    <div class="card">
                        <h3>Check-in Statistics</h3>
                        <?php
                            $total_attendees = count($attendees);
                            $checked_in = array_filter($attendees, function($a) { return $a['checked_in']; });
                            $checked_in_count = count($checked_in);
                            $attendance_rate = $total_attendees > 0 ? round(($checked_in_count / $total_attendees) * 100, 1) : 0;
                        ?>
                        <div style="text-align: center;">
                            <div class="stat-number"><?php echo $checked_in_count; ?>/<?php echo $total_attendees; ?></div>
                            <div class="stat-label">Attendees Checked In</div>
                            <div style="margin-top: 1rem;">
                                <div style="background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden;">
                                    <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); height: 100%; width: <?php echo $attendance_rate; ?>%;"></div>
                                </div>
                                <small><?php echo $attendance_rate; ?>% Attendance Rate</small>
                            </div>
                        </div>
                    </div>
                <?php endif; ?>
            </div>

            <div class="col-8">
                <?php if ($current_event): ?>
                    <div class="card">
                        <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1rem;">
                            <h2>Check-in: <?php echo sanitize($current_event['title']); ?></h2>
                            <span class="btn btn-success"><?php echo date('F j, Y', strtotime($current_event['event_date'])); ?></span>
                        </div>

                        <!-- QR Code Check-in (Simplified) -->
                        <div class="card" style="background: #f8f9fa; margin-bottom: 1.5rem;">
                            <h3>📱 QR Code Check-in</h3>
                            <form method="POST" action="">
                                <div class="form-group">
                                    <label class="form-label">Scan or enter email:</label>
                                    <input type="email" name="qrcode_email" class="form-control" placeholder="Attendee email" required>
                                </div>
                                <button type="submit" name="qrcode_checkin" class="btn btn-success">Check-in</button>
                            </form>
                        </div>

                        <!-- Attendees List -->
                        <h3>Registered Attendees</h3>
                        <?php if ($attendees): ?>
                            <div style="overflow-x: auto;">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Full Name</th>
                                            <th>Email</th>
                                            <th>Company</th>
                                            <th>Registration Date</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($attendees as $attendee): ?>
                                            <tr>
                                                <td><?php echo sanitize($attendee['full_name']); ?></td>
                                                <td><?php echo sanitize($attendee['email']); ?></td>
                                                <td><?php echo sanitize($attendee['company']); ?></td>
                                                <td><?php echo date('M j, Y g:i A', strtotime($attendee['registration_date'])); ?></td>
                                                <td>
                                                    <?php if ($attendee['checked_in']): ?>
                                                        <span style="color: #28a745; font-weight: bold;">✓ Checked In</span>
                                                        <br>
                                                        <small><?php echo date('g:i A', strtotime($attendee['check_in_time'])); ?></small>
                                                    <?php else: ?>
                                                        <span style="color: #dc3545;">Pending Check-in</span>
                                                    <?php endif; ?>
                                                </td>
                                                <td>
                                                    <?php if (!$attendee['checked_in']): ?>
                                                        <form method="POST" action="" style="display: inline;">
                                                            <input type="hidden" name="attendee_id" value="<?php echo $attendee['attendee_id']; ?>">
                                                            <button type="submit" name="check_in" class="btn btn-success" style="padding: 0.5rem; font-size: 0.8rem;">Check-in</button>
                                                        </form>
                                                    <?php else: ?>
                                                        <span style="color: #28a745;">✓ Completed</span>
                                                    <?php endif; ?>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        <?php else: ?>
                            <p style="text-align: center; color: #666; padding: 2rem;">No registered attendees yet</p>
                        <?php endif; ?>
                    </div>
                <?php else: ?>
                    <div class="card">
                        <div style="text-align: center; padding: 3rem; color: #666;">
                            <h3>Select Event to Start Check-in</h3>
                            <p>Please select an event from the left menu to manage check-ins</p>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </main>
</body>
</html>