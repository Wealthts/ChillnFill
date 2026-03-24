 <?php
require_once 'includes/config.php';

$event = null;
$success = '';
$error = '';

// Fetch event data
if (isset($_GET['event_id'])) {
    try {
        $stmt = $pdo->prepare("SELECT * FROM events WHERE event_id = ?");
        $stmt->execute([$_GET['event_id']]);
        $event = $stmt->fetch();
        
        if (!$event) {
            $error = "Event not found";
        }
    } catch (PDOException $e) {
        $error = "Error: " . $e->getMessage();
    }
} else {
    $error = "No event specified";
}

// Check attendee limit
if ($event) {
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM attendees WHERE event_id = ?");
        $stmt->execute([$event['event_id']]);
        $current_attendees = $stmt->fetchColumn();
        
        if ($event['max_attendees'] && $current_attendees >= $event['max_attendees']) {
            $error = "This event is fully booked. We apologize for any inconvenience.";
        }
    } catch (PDOException $e) {
        $error = "Error checking availability";
    }
}

// Process registration
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $event && !$error) {
    $full_name = sanitize($_POST['full_name']);
    $email = sanitize($_POST['email']);
    $phone = sanitize($_POST['phone']);
    $company = sanitize($_POST['company']);
    $position = sanitize($_POST['position']);
    
    try {
        // Check if already registered
        $stmt = $pdo->prepare("SELECT * FROM attendees WHERE event_id = ? AND email = ?");
        $stmt->execute([$event['event_id'], $email]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            $error = "This email is already registered for this event";
        } else {
            // Register new attendee
            $stmt = $pdo->prepare("
                INSERT INTO attendees (event_id, full_name, email, phone, company, position) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $event['event_id'],
                $full_name,
                $email,
                $phone,
                $company,
                $position
            ]);
            
            $success = "Registration successful! Thank you for your interest in our event.";
            $_POST = []; // Clear form
        }
        
    } catch (PDOException $e) {
        $error = "Registration error: " . $e->getMessage();
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Registration - Event Management</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <nav class="navbar">
                <div class="logo">Event Management</div>
                <div class="nav-links">
                    <a href="index.php" style="color: white; text-decoration: none;">Home</a>
                </div>
            </nav>
        </div>
    </header>

    <main class="container" style="margin-top: 2rem;">
        <?php if ($error): ?>
            <div class="alert alert-error"><?php echo $error; ?></div>
            <div style="text-align: center; margin-top: 2rem;">
                <a href="index.php" class="btn btn-primary">Return to Home</a>
            </div>
        <?php elseif ($event): ?>
            
            <?php if ($success): ?>
                <div class="alert alert-success"><?php echo $success; ?></div>
                <div style="text-align: center; margin-top: 2rem;">
                    <a href="index.php" class="btn btn-primary">Return to Home</a>
                </div>
            <?php else: ?>
                <div class="row">
                    <div class="col-6">
                        <div class="card">
                            <h2>Event Registration</h2>
                            <h3 style="color: #667eea; margin-bottom: 1rem;"><?php echo sanitize($event['title']); ?></h3>
                            
                            <div style="background: #f8f9fa; padding: 1rem; border-radius: 5px; margin-bottom: 1.5rem;">
                                <p><strong>Date:</strong> <?php echo date('F j, Y', strtotime($event['event_date'])); ?></p>
                                <p><strong>Time:</strong> <?php echo date('g:i A', strtotime($event['event_time'])); ?></p>
                                <p><strong>Venue:</strong> <?php echo sanitize($event['venue']); ?></p>
                                <?php if ($event['ticket_price'] > 0): ?>
                                    <p><strong>Registration Fee:</strong> <span style="color: #28a745; font-weight: bold;">$<?php echo number_format($event['ticket_price'], 2); ?></span></p>
                                <?php else: ?>
                                    <p><strong>Registration Fee:</strong> <span style="color: #28a745; font-weight: bold;">Free</span></p>
                                <?php endif; ?>
                            </div>

                            <form method="POST" action="">
                                <div class="form-group">
                                    <label class="form-label">Full Name *</label>
                                    <input type="text" name="full_name" class="form-control" value="<?php echo $_POST['full_name'] ?? ''; ?>" required>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Email *</label>
                                    <input type="email" name="email" class="form-control" value="<?php echo $_POST['email'] ?? ''; ?>" required>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Phone Number</label>
                                    <input type="tel" name="phone" class="form-control" value="<?php echo $_POST['phone'] ?? ''; ?>">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Company</label>
                                    <input type="text" name="company" class="form-control" value="<?php echo $_POST['company'] ?? ''; ?>">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Position</label>
                                    <input type="text" name="position" class="form-control" value="<?php echo $_POST['position'] ?? ''; ?>">
                                </div>
                                
                                <button type="submit" class="btn btn-primary" style="width: 100%;">Register Now</button>
                            </form>
                        </div>
                    </div>
                    
                    <div class="col-6">
                        <div class="card">
                            <h3>Event Details</h3>
                            <div style="margin-top: 1rem;">
                                <?php echo nl2br(sanitize($event['description'])); ?>
                            </div>
                        </div>
                        
                        <div class="card">
                            <h3>Registration Information</h3>
                            <ul style="padding-left: 1.5rem; color: #666;">
                                <li>Please provide accurate information</li>
                                <li>You will receive a confirmation email</li>
                                <li>Bring your QR code to the event</li>
                                <li>For questions, contact the event organizer</li>
                            </ul>
                        </div>
                    </div>
                </div>
            <?php endif; ?>
            
        <?php endif; ?>
    </main>
</body>
</html>