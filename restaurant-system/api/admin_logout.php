<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

session_destroy();
jsonResponse(['success' => true, 'message' => 'Logout successful']);
