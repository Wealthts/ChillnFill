<?php
require_once 'includes/config.php';

// Fetch public events (upcoming)
try {
    $stmt = $pdo->prepare("
        SELECT * FROM events 
        WHERE event_date >= CURDATE() 
        ORDER BY event_date ASC 
        LIMIT 6
    ");
    $stmt->execute();
    $upcoming_events = $stmt->fetchAll();
} catch (PDOException $e) {
    $upcoming_events = [];
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Management - Event Management System</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <nav class="navbar">
                <div class="logo">Event Management</div>
                <ul class="nav-links">
                    <li><a href="#events">Events</a></li>
                    <li><a href="login.php">Login</a></li>
                    <li><a href="#about">About</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <section style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4rem 0; text-align: center;">
        <div class="container">
            <h1 style="font-size: 3rem; margin-bottom: 1rem;">Event Management</h1>
            <p style="font-size: 1.2rem; margin-bottom: 2rem;">Complete Event Management System - Maximize ROI and Impact</p>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <a href="login.php" class="btn" style="background: white; color: #667eea; font-weight: bold;">Get Started</a>
                <a href="#events" class="btn" style="background: transparent; border: 2px solid white; color: white;">View Events</a>
            </div>
        </div>
    </section>

    <section id="features" style="padding: 4rem 0; background: #f8f9fa;">
        <div class="container">
            <h2 style="text-align: center; margin-bottom: 3rem;">Why Choose Event Management?</h2>
            <div class="row">
                <div class="col-4">
                    <div class="card" style="text-align: center;">
                        <h3>📈 Maximize ROI</h3>
                        <p>Track and analyze return on investment accurately</p>
                    </div>
                </div>
                <div class="col-4">
                    <div class="card" style="text-align: center;">
                        <h3>👥 Attendee Management</h3>
                        <p>Modern registration and check-in system</p>
                    </div>
                </div>
                <div class="col-4">
                    <div class="card" style="text-align: center;">
                        <h3>📊 Data Analytics</h3>
                        <p>Real-time reports and statistics</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section id="events" style="padding: 4rem 0;">
        <div class="container">
            <h2 style="text-align: center; margin-bottom: 3rem;">Upcoming Events</h2>
            
            <?php if ($upcoming_events): ?>
                <div class="row">
                    <?php foreach ($upcoming_events as $event): ?>
                        <div class="col-4">
                            <div class="card">
                                <h3><?php echo sanitize($event['title']); ?></h3>
                                <p><strong>Date:</strong> <?php echo date('F j, Y', strtotime($event['event_date'])); ?></p>
                                <p><strong>Venue:</strong> <?php echo sanitize($event['venue']); ?></p>
                                <p><strong>Fee:</strong> 
                                    <?php echo $event['ticket_price'] > 0 ? '$' . number_format($event['ticket_price'], 2) : 'Free'; ?>
                                </p>
                                <div style="margin-top: 1rem;">
                                    <a href="register.php?event_id=<?php echo $event['event_id']; ?>" class="btn btn-primary">Register Now</a>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php else: ?>
                <p style="text-align: center; color: #666;">No upcoming events at the moment</p>
            <?php endif; ?>
        </div>
    </section>

    <footer style="background: #333; color: white; padding: 2rem 0; text-align: center;">
        <div class="container">
            <p>&copy; 2024 Event Management Pro. All rights reserved.</p>
            <p>Complete event management solution for modern businesses</p>
        </div>
    </footer>
</body>
</html>