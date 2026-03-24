<?php
// setup_check.php - System Compatibility Check
echo "<h1>EventSphere Pro - System Check</h1>";

// Check PHP Version
echo "<h3>PHP Version Check:</h3>";
echo "PHP Version: " . phpversion() . "<br>";
echo "Required: 7.4 or higher<br>";
echo "Status: " . (version_compare(phpversion(), '7.4.0') >= 0 ? "✅ OK" : "❌ Too old") . "<br><br>";

// Check PHP Extensions
echo "<h3>PHP Extensions:</h3>";
$required_extensions = ['pdo', 'pdo_mysql', 'session', 'mbstring'];
foreach ($required_extensions as $ext) {
    echo "$ext: " . (extension_loaded($ext) ? "✅ Loaded" : "❌ Missing") . "<br>";
}
echo "<br>";

// Check File Structure
echo "<h3>File Structure:</h3>";
$required_files = [
    'index.php',
    'login.php', 
    'includes/config.php',
    'css/style.css'
];

foreach ($required_files as $file) {
    echo "$file: " . (file_exists($file) ? "✅ Exists" : "❌ Missing") . "<br>";
}
echo "<br>";

// Check Database Connection
echo "<h3>Database Connection:</h3>";
try {
    $pdo = new PDO("mysql:host=localhost", "root", "");
    echo "MySQL: ✅ Connected<br>";
    
    // Check if database exists
    $stmt = $pdo->query("SHOW DATABASES LIKE 'eventsphere_db'");
    echo "Database: " . ($stmt->rowCount() > 0 ? "✅ Exists" : "❌ Missing") . "<br>";
    
} catch (PDOException $e) {
    echo "MySQL: ❌ Connection failed - " . $e->getMessage() . "<br>";
}

echo "<br><h3>Next Steps:</h3>";
echo "1. Make sure your folder is in: C:\\xampp\\htdocs\\event_manager\\<br>";
echo "2. Visit: <a href='http://localhost/event_manager/'>http://localhost/event_manager/</a><br>";
echo "3. Or: <a href='http://localhost/event_manager/login.php'>http://localhost/event_manager/login.php</a>";
?>