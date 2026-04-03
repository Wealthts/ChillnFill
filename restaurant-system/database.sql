-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 31, 2026 at 11:01 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12
CREATE DATABASE IF NOT EXISTS restaurant_system;
USE restaurant_system;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `restaurant_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`id`, `username`, `password_hash`, `created_at`) VALUES
(1, 'admin', '$2a$10$srpyWO6td.buQU4Qe4Kx7O1TmcJddG/mRMgXVVnqyaL1iSbX34bQy', '2026-03-30 17:16:14');

-- --------------------------------------------------------

--
-- Table structure for table `app_state`
--

CREATE TABLE `app_state` (
  `id` int(11) NOT NULL,
  `state_key` varchar(50) NOT NULL,
  `state_value` longtext NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `app_state`
--

INSERT INTO `app_state` (`id`, `state_key`, `state_value`, `updated_at`) VALUES
(1, 'session', '{\"user_id\":\"CUST_001\",\"table_number\":\"3\",\"user_type\":\"customer\",\"cook_id\":\"\",\"cook_name\":\"\",\"admin_logged_in\":\"\"}', '2026-03-30 22:21:34'),
(2, 'menus', '[{\"id\":1,\"name\":\"Basil Fried Rice\",\"thaiName\":\"ข้าวผัดกะเพรา\",\"price\":65,\"category\":\"single\",\"desc\":\"Crispy chicken basil rice with fried egg\",\"optionKeys\":[\"spice\"],\"available\":true,\"image\":\"../media/basilfriedrice.jpg\"}]', '2026-03-30 22:21:34'),
(3, 'orders', '[{\"id\":1001,\"table\":\"3\",\"userId\":\"CUST_001\",\"items\":[{\"name\":\"Basil Fried Rice\",\"qty\":2,\"price\":65}],\"total\":130,\"time\":\"2026-03-31T10:00:00.000Z\",\"status\":\"serving\",\"paymentId\":9001,\"paymentStatus\":\"paid\",\"paymentMethod\":\"cash\",\"paidAt\":\"2026-03-31T10:15:00.000Z\"}]', '2026-03-30 22:28:44'),
(4, 'payments', '[{\"id\":9001,\"orderId\":\"1001\",\"orderIds\":[1001],\"table\":\"3\",\"userId\":\"CUST_001\",\"amount\":130,\"time\":\"2026-03-31T10:15:00.000Z\",\"method\":\"cash\",\"status\":\"paid\",\"reviewSubmitted\":true,\"reviewSubmittedAt\":\"2026-03-31T10:20:00.000Z\"}]', '2026-03-30 22:30:35'),
(5, 'reviews', '[{\"rating\":5,\"comment\":\"Food was served very quickly\",\"time\":\"2026-03-31T10:20:00.000Z\",\"table\":\"3\",\"userId\":\"CUST_001\",\"paymentId\":9001}]', '2026-03-30 22:30:35'),
(6, 'cooks', '[{\"id\":\"cook01\",\"name\":\"Test Cook\",\"password\":\"1234\",\"active\":true}]', '2026-03-30 22:21:34');

-- --------------------------------------------------------

--
-- Table structure for table `cooks`
--
-- ตอนนี้ dump เดิมของ cooks กำหนด password_hash เป็น NOT NULL
CREATE TABLE `cooks` (
  `id` int(11) NOT NULL,
  `cook_id` varchar(50) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `full_name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `must_set_password` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cooks`
--

INSERT INTO `cooks`//
(`id`, `cook_id`, `password_hash`, `full_name`, `phone`, `status`, `must_set_password`, `created_at`)
VALUES
(1, 'COOK001', NULL, 'Somchai Jaidee', '0812345678', 'active', 1, '2026-03-30 17:16:14');
-- --------------------------------------------------------

--
-- Table structure for table `customer_sessions`
--
--จากเดิมที่มี password hash เลย ให้เป็นแบบ admin สร้าง ID อย่างเดียว
CREATE TABLE `customer_sessions` (
  `id` int(11) NOT NULL,
  `session_id` varchar(100) NOT NULL,
  `table_number` int(11) NOT NULL,
  `login_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_activity` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` varchar(20) NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customer_sessions`
--

INSERT INTO `customer_sessions` (`id`, `session_id`, `table_number`, `login_time`, `last_activity`, `status`) VALUES
(1, 'CUST_DEMO_001', 1, '2026-03-30 17:16:14', '2026-03-30 17:16:14', 'inactive'),
(2, 'CUST_DEMO_002', 2, '2026-03-30 17:16:14', '2026-03-30 17:16:14', 'inactive'),
(3, 'CUST_1774908712_3671', 3, '2026-03-30 22:11:52', '2026-03-30 22:11:52', 'active'),
(4, 'CUST_1774910132_7035', 3, '2026-03-30 22:35:32', '2026-03-30 22:35:32', 'active'),
(5, 'CUST_1774947542_8932', 9, '2026-03-31 08:59:02', '2026-03-31 08:59:02', 'active');

-- --------------------------------------------------------

--
-- Table structure for table `menu`
--

CREATE TABLE `menu` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `name_th` varchar(100) DEFAULT NULL,
  `thai_name` varchar(100) DEFAULT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'single',
  `category_code` varchar(50) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `description` text DEFAULT NULL,
  `option_keys` text DEFAULT NULL,
  `image_url` longtext DEFAULT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `menu`
--

INSERT INTO `menu` (`id`, `name`, `name_th`, `thai_name`, `category`, `category_code`, `price`, `description`, `option_keys`, `image_url`, `is_available`, `sort_order`, `created_at`) VALUES
(1, 'Basil Fried Rice', 'ข้าวผัดกะเพรา', 'ข้าวผัดกะเพรา', 'Single Plate', 'single', 65.00, 'Crispy chicken basil rice with fried egg', '[\"spice\"]', '../media/basilfriedrice.jpg', 1, 1, '2026-03-30 17:16:14'),
(2, 'Tom Yum Goong', 'ต้มยำกุ้ง', 'ต้มยำกุ้ง', 'Tom Yum', 'tomyum', 120.00, 'Clear spicy shrimp tom yum soup', '[\"spice\"]', '../media/tomyumkung.jpg', 1, 2, '2026-03-30 17:16:14'),
(3, 'Pad Thai', 'ผัดไทย', 'ผัดไทย', 'Single Plate', 'single', 70.00, 'Thai stir-fried noodles with shrimp', '[\"spice\"]', '../media/padthai.jpg', 1, 3, '2026-03-30 17:16:14'),
(4, 'Hainanese Chicken Rice', 'ข้าวมันไก่', 'ข้าวมันไก่', 'Single Plate', 'single', 60.00, 'Steamed chicken rice with special sauce', '[]', '../media/hainanesechickenrice.jpg', 1, 4, '2026-03-30 17:16:14'),
(5, 'Som Tam Thai', 'ส้มตำไทย', 'ส้มตำไทย', 'Salad', 'salad', 55.00, 'Spicy green papaya salad', '[\"spice\"]', '../media/somtamthai.jpg', 1, 5, '2026-03-30 17:16:14'),
(6, 'Korean BBQ Beef', 'เนื้อย่างเกาหลี', 'เนื้อย่างเกาหลี', 'Main', 'main', 180.00, 'Korean-style marinated grilled beef', '[\"doneness\"]', '../media/koreanbbq.jpg', 1, 6, '2026-03-30 17:16:14'),
(7, 'Beef Basil', 'กะเพราเนื้อ', 'กะเพราเนื้อ', 'Single Plate', 'single', 85.00, 'Minced beef basil with fried egg', '[\"spice\"]', '../media/beefbasil.jpg', 1, 7, '2026-03-30 17:16:14'),
(8, 'Lime Juice', 'น้ำมะนาว', 'น้ำมะนาว', 'Drink', 'drink', 25.00, 'Fresh lime juice', '[\"sweet\",\"ice\"]', '../media/limejuice.jpg', 1, 8, '2026-03-30 17:16:14'),
(9, 'Green Tea', 'ชาเขียว', 'ชาเขียว', 'Drink', 'drink', 30.00, 'Iced green tea', '[\"sweet\",\"ice\"]', '', 1, 9, '2026-03-30 17:16:14'),
(10, 'Ice Cream', 'ไอศกรีม', 'ไอศกรีม', 'Dessert', 'dessert', 35.00, 'Vanilla ice cream', '[\"size\"]', '', 1, 10, '2026-03-30 17:16:14'),
(11, 'Crispy Pork Basil', 'กะเพราหมูกรอบ', 'กะเพราหมูกรอบ', 'Single Plate', 'single', 70.00, 'Crispy pork basil rice', '[\"spice\"]', '', 1, 11, '2026-03-30 17:16:14'),
(12, 'Seafood Tom Yum', 'ต้มยำทะเล', 'ต้มยำทะเล', 'Tom Yum', 'tomyum', 150.00, 'Mixed seafood tom yum soup', '[\"spice\"]', '', 1, 12, '2026-03-30 17:16:14'),
(13, 'Soda', 'น้ำอัดลม', 'น้ำอัดลม', 'Drink', 'drink', 20.00, 'Soda, Coke, Sprite', '[\"sweet\",\"ice\"]', '', 1, 13, '2026-03-30 17:16:14');

-- --------------------------------------------------------

--
-- Table structure for table `menu_option_choices`
--

CREATE TABLE `menu_option_choices` (
  `id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `value` varchar(100) NOT NULL,
  `label_th` varchar(100) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `menu_option_choices`
--

INSERT INTO `menu_option_choices` (`id`, `group_id`, `value`, `label_th`, `sort_order`, `created_at`) VALUES
(1, 4, 'Well Done', 'สุกมาก', 3, '2026-03-30 17:50:05'),
(2, 4, 'Medium', 'มีเดียม', 2, '2026-03-30 17:50:05'),
(3, 4, 'Medium Rare', 'มีเดียมแรร์', 1, '2026-03-30 17:50:05'),
(4, 3, 'Extra Ice', 'น้ำแข็งเยอะ', 4, '2026-03-30 17:50:05'),
(5, 3, 'Regular Ice', 'ปกติ', 3, '2026-03-30 17:50:05'),
(6, 3, 'Less Ice', 'น้ำแข็งน้อย', 2, '2026-03-30 17:50:05'),
(7, 3, 'No Ice', 'ไม่ใส่น้ำแข็ง', 1, '2026-03-30 17:50:05'),
(8, 5, 'Large', 'ใหญ่', 3, '2026-03-30 17:50:05'),
(9, 5, 'Regular', 'ปกติ', 2, '2026-03-30 17:50:05'),
(10, 5, 'Small', 'เล็ก', 1, '2026-03-30 17:50:05'),
(11, 1, 'Extra Spicy', 'เผ็ดมาก', 4, '2026-03-30 17:50:05'),
(12, 1, 'Medium', 'เผ็ดกลาง', 3, '2026-03-30 17:50:05'),
(13, 1, 'Mild', 'เผ็ดน้อย', 2, '2026-03-30 17:50:05'),
(14, 1, 'No Spicy', 'ไม่เผ็ด', 1, '2026-03-30 17:50:05'),
(15, 2, 'Extra Sweet', 'หวานมาก', 4, '2026-03-30 17:50:05'),
(16, 2, 'Normal', 'ปกติ', 3, '2026-03-30 17:50:05'),
(17, 2, 'Less Sugar', 'หวานน้อย', 2, '2026-03-30 17:50:05'),
(18, 2, 'No Sugar', 'ไม่หวาน', 1, '2026-03-30 17:50:05');

-- --------------------------------------------------------

--
-- Table structure for table `menu_option_groups`
--

CREATE TABLE `menu_option_groups` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `label_en` varchar(100) NOT NULL,
  `label_th` varchar(100) DEFAULT NULL,
  `default_value` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `menu_option_groups`
--

INSERT INTO `menu_option_groups` (`id`, `code`, `label_en`, `label_th`, `default_value`, `created_at`) VALUES
(1, 'spice', 'Spiciness', 'ระดับความเผ็ด', 'Medium', '2026-03-30 17:50:05'),
(2, 'sweet', 'Sweetness', 'ระดับความหวาน', 'Normal', '2026-03-30 17:50:05'),
(3, 'ice', 'Ice Level', 'ระดับน้ำแข็ง', 'Regular Ice', '2026-03-30 17:50:05'),
(4, 'doneness', 'Doneness', 'ระดับความสุก', 'Medium', '2026-03-30 17:50:05'),
(5, 'size', 'Size', 'ขนาด', 'Regular', '2026-03-30 17:50:05');

-- --------------------------------------------------------

--
-- Table structure for table `menu_option_map`
--

CREATE TABLE `menu_option_map` (
  `menu_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `menu_option_map`
--

INSERT INTO `menu_option_map` (`menu_id`, `group_id`) VALUES
(1, 1),
(2, 1),
(3, 1),
(5, 1),
(6, 4),
(7, 1),
(8, 2),
(8, 3),
(9, 2),
(9, 3),
(10, 5),
(11, 1),
(12, 1),
(13, 2),
(13, 3);

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `order_number` varchar(30) NOT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `table_number` int(11) DEFAULT NULL,
  `cook_id` varchar(50) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` varchar(30) NOT NULL DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `payment_id` int(11) DEFAULT NULL,
  `payment_status` varchar(20) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `review_submitted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `menu_id` int(11) DEFAULT NULL,
  `item_name` varchar(150) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `payment_reference` varchar(30) NOT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `table_number` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `method` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'paid',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `review_submitted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `payment_id` int(11) NOT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `table_number` int(11) DEFAULT NULL,
  `rating` int(11) NOT NULL DEFAULT 0,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `app_state`
--
ALTER TABLE `app_state`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `state_key` (`state_key`);

--
-- Indexes for table `cooks`
--
ALTER TABLE `cooks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cook_id` (`cook_id`);

--
-- Indexes for table `customer_sessions`
--
ALTER TABLE `customer_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `session_id` (`session_id`);

--
-- Indexes for table `menu`
--
ALTER TABLE `menu`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `menu_option_choices`
--
ALTER TABLE `menu_option_choices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_group_value` (`group_id`,`value`);

--
-- Indexes for table `menu_option_groups`
--
ALTER TABLE `menu_option_groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `menu_option_map`
--
ALTER TABLE `menu_option_map`
  ADD PRIMARY KEY (`menu_id`,`group_id`),
  ADD KEY `fk_menu_option_map_group` (`group_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_number` (`order_number`),
  ADD KEY `fk_orders_session` (`session_id`),
  ADD KEY `fk_orders_cook` (`cook_id`),
  ADD KEY `fk_orders_payment` (`payment_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_order_items_order` (`order_id`),
  ADD KEY `fk_order_items_menu` (`menu_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `payment_reference` (`payment_reference`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `payment_id` (`payment_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `app_state`
--
ALTER TABLE `app_state`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `cooks`
--
ALTER TABLE `cooks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `customer_sessions`
--
ALTER TABLE `customer_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `menu`
--
ALTER TABLE `menu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `menu_option_choices`
--
ALTER TABLE `menu_option_choices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `menu_option_groups`
--
ALTER TABLE `menu_option_groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `menu_option_choices`
--
ALTER TABLE `menu_option_choices`
  ADD CONSTRAINT `fk_menu_option_choices_group` FOREIGN KEY (`group_id`) REFERENCES `menu_option_groups` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `menu_option_map`
--
ALTER TABLE `menu_option_map`
  ADD CONSTRAINT `fk_menu_option_map_group` FOREIGN KEY (`group_id`) REFERENCES `menu_option_groups` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_menu_option_map_menu` FOREIGN KEY (`menu_id`) REFERENCES `menu` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_cook` FOREIGN KEY (`cook_id`) REFERENCES `cooks` (`cook_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_orders_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_orders_session` FOREIGN KEY (`session_id`) REFERENCES `customer_sessions` (`session_id`) ON DELETE SET NULL;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_order_items_menu` FOREIGN KEY (`menu_id`) REFERENCES `menu` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `fk_reviews_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
