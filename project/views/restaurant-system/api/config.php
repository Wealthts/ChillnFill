<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ตั้งค่าการเชื่อมต่อฐานข้อมูล
$host = 'localhost';
$dbname = 'restaurant_system';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("SET NAMES utf8");
} catch(PDOException $e) {
    die(json_encode(['success' => false, 'message' => 'Connection failed: ' . $e->getMessage()]));
}

// เริ่ม session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function jsonResponse($payload, $status = 200) {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function readJsonInput() {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return null;
    }
    return is_array($data) ? $data : [];
}

// ฟังก์ชันสร้าง order number
function generateOrderNumber() {
    return 'ORD' . date('Ymd') . rand(1000, 9999);
}
?>
