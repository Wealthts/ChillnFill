<?php
require_once 'config.php';
echo json_encode([
    'logged_in' => isset($_SESSION['user_type']),
    'user_type' => $_SESSION['user_type'] ?? null
]);
?>
