<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

jsonResponse([
    'logged_in' => isset($_SESSION['user_type']),
    'user_type' => $_SESSION['user_type'] ?? null
]);
