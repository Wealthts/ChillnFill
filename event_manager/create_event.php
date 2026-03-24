<?php
require_once 'includes/config.php';

if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}

$success = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = sanitize($_POST['title']);
    $description = sanitize($_POST['description']);
    $event_date = $_POST['event_date'];
    $event_time = $_POST['event_time'];
    $venue = sanitize($_POST['venue']);
    $max_attendees = $_POST['max_attendees'];
    $ticket_price = $_POST['ticket_price'];
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO events (organizer_id, title, description, event_date, event_time, venue, max_attendees, ticket_price) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $_SESSION['user_id'],
            $title,
            $description,
            $event_date,
            $event_time,
            $venue,
            $max_attendees,
            $ticket_price
        ]);
        
        $success = "Event '$title' created successfully!";
        
        // Clear form
        $_POST = [];
        
    } catch (PDOException $e) {
        $error = "Error: " . $e->getMessage();
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Event - Event Management</title>
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
        <h1>Create New Event</h1>
        
        <?php if ($success): ?>
            <div class="alert alert-success"><?php echo $success; ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="alert alert-error"><?php echo $error; ?></div>
        <?php endif; ?>
        
        <div class="card">
            <form method="POST" action="">
                <div class="row">
                    <div class="col-6">
                        <div class="form-group">
                            <label class="form-label">Event Title *</label>
                            <input type="text" name="title" class="form-control" value="<?php echo $_POST['title'] ?? ''; ?>" required>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="form-group">
                            <label class="form-label">Venue *</label>
                            <input type="text" name="venue" class="form-control" value="<?php echo $_POST['venue'] ?? ''; ?>" required>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-6">
                        <div class="form-group">
                            <label class="form-label">Date *</label>
                            <input type="date" name="event_date" class="form-control" value="<?php echo $_POST['event_date'] ?? ''; ?>" required>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="form-group">
                            <label class="form-label">Time *</label>
                            <input type="time" name="event_time" class="form-control" value="<?php echo $_POST['event_time'] ?? ''; ?>" required>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-6">
                        <div class="form-group">
                            <label class="form-label">Maximum Attendees</label>
                            <input type="number" name="max_attendees" class="form-control" value="<?php echo $_POST['max_attendees'] ?? ''; ?>" min="1">
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="form-group">
                            <label class="form-label">Ticket Price (USD)</label>
                            <input type="number" name="ticket_price" class="form-control" value="<?php echo $_POST['ticket_price'] ?? '0'; ?>" step="0.01" min="0">
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Event Description</label>
                    <textarea name="description" class="form-control" rows="5"><?php echo $_POST['description'] ?? ''; ?></textarea>
                </div>
                
                <button type="submit" class="btn btn-primary">Create Event</button>
                <a href="dashboard.php" class="btn" style="background: #6c757d; color: white; margin-left: 1rem;">Cancel</a>
            </form>
        </div>
    </main>
</body>
</html>