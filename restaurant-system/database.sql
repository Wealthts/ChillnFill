-- Clean Database Setup for Chill n Fill
-- Import this file in phpMyAdmin (SQL tab)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `restaurant_system`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `restaurant_system`;

-- Drop child tables first
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `customer_sessions`;
DROP TABLE IF EXISTS `menu_option_map`;
DROP TABLE IF EXISTS `menu_option_choices`;
DROP TABLE IF EXISTS `menu_option_groups`;
DROP TABLE IF EXISTS `tables`;
DROP TABLE IF EXISTS `menu`;
DROP TABLE IF EXISTS `cooks`;
DROP TABLE IF EXISTS `admin`;
DROP TABLE IF EXISTS `app_state`;

SET FOREIGN_KEY_CHECKS = 1;

-- Core tables
CREATE TABLE `admin` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cooks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `cook_id` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) DEFAULT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cooks_cook_id` (`cook_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `menu` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `name_th` VARCHAR(100) DEFAULT NULL,
  `thai_name` VARCHAR(100) DEFAULT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'single',
  `category_code` VARCHAR(50) DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `description` TEXT DEFAULT NULL,
  `option_keys` TEXT DEFAULT NULL,
  `image_url` LONGTEXT DEFAULT NULL,
  `is_available` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `app_state` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `state_key` VARCHAR(50) NOT NULL,
  `state_value` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_app_state_key` (`state_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_sessions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `session_id` VARCHAR(100) NOT NULL,
  `table_number` INT NOT NULL,
  `login_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_activity` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customer_session_id` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `payment_reference` VARCHAR(30) NOT NULL,
  `session_id` VARCHAR(100) DEFAULT NULL,
  `table_number` INT DEFAULT NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `method` VARCHAR(50) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'paid',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `review_submitted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payment_reference` (`payment_reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `orders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(30) NOT NULL,
  `session_id` VARCHAR(100) DEFAULT NULL,
  `table_number` INT DEFAULT NULL,
  `cook_id` VARCHAR(50) DEFAULT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `notes` TEXT DEFAULT NULL,
  `payment_id` INT DEFAULT NULL,
  `payment_status` VARCHAR(20) DEFAULT NULL,
  `payment_method` VARCHAR(50) DEFAULT NULL,
  `paid_at` TIMESTAMP NULL DEFAULT NULL,
  `review_submitted_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_order_number` (`order_number`),
  KEY `idx_orders_session_id` (`session_id`),
  KEY `idx_orders_cook_id` (`cook_id`),
  KEY `idx_orders_payment_id` (`payment_id`),
  CONSTRAINT `fk_orders_session` FOREIGN KEY (`session_id`) REFERENCES `customer_sessions` (`session_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_orders_cook` FOREIGN KEY (`cook_id`) REFERENCES `cooks` (`cook_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_orders_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_items` (
  `order_item_id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `table_number` INT DEFAULT NULL,
  `menu_id` INT DEFAULT NULL,
  `cook_id` VARCHAR(50) DEFAULT NULL,
  `item_name` VARCHAR(150) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `started_at` TIMESTAMP NULL DEFAULT NULL,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`order_item_id`),
  KEY `idx_order_items_order_id` (`order_id`),
  KEY `idx_order_items_menu_id` (`menu_id`),
  KEY `idx_order_items_cook_id` (`cook_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_menu` FOREIGN KEY (`menu_id`) REFERENCES `menu` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_order_items_cook` FOREIGN KEY (`cook_id`) REFERENCES `cooks` (`cook_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `reviews` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `payment_id` INT NOT NULL,
  `session_id` VARCHAR(100) DEFAULT NULL,
  `table_number` INT DEFAULT NULL,
  `rating` INT NOT NULL DEFAULT 0,
  `comment` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reviews_payment_id` (`payment_id`),
  CONSTRAINT `fk_reviews_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional legacy/support tables
CREATE TABLE `tables` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `table_number` INT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'available',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tables_table_number` (`table_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `menu_option_groups` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `label_en` VARCHAR(100) NOT NULL,
  `label_th` VARCHAR(100) DEFAULT NULL,
  `default_value` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_menu_option_group_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `menu_option_choices` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `group_id` INT NOT NULL,
  `value` VARCHAR(100) NOT NULL,
  `label_th` VARCHAR(100) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_menu_option_choice` (`group_id`, `value`),
  CONSTRAINT `fk_menu_option_choices_group` FOREIGN KEY (`group_id`) REFERENCES `menu_option_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `menu_option_map` (
  `menu_id` INT NOT NULL,
  `group_id` INT NOT NULL,
  PRIMARY KEY (`menu_id`, `group_id`),
  KEY `idx_menu_option_map_group_id` (`group_id`),
  CONSTRAINT `fk_menu_option_map_menu` FOREIGN KEY (`menu_id`) REFERENCES `menu` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_menu_option_map_group` FOREIGN KEY (`group_id`) REFERENCES `menu_option_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Minimal clean seed data
INSERT INTO `admin` (`username`, `password_hash`)
VALUES ('admin', '$2a$10$srpyWO6td.buQU4Qe4Kx7O1TmcJddG/mRMgXVVnqyaL1iSbX34bQy');

INSERT INTO `menu` (`name`, `name_th`, `thai_name`, `category`, `category_code`, `price`, `description`, `option_keys`, `image_url`, `is_available`, `sort_order`) VALUES
('Basil Fried Rice', 'ข้าวผัดกระเพรา', 'ข้าวผัดกระเพรา', 'single', 'single', 65.00, 'Crispy chicken basil rice with fried egg', '["spice"]', '../media/basilfriedrice.jpg', 1, 1),
('Tom Yum Goong', 'ต้มยำกุ้ง', 'ต้มยำกุ้ง', 'tomyum', 'tomyum', 120.00, 'Clear spicy shrimp tom yum soup', '["spice"]', '../media/tomyumkung.jpg', 1, 2),
('Pad Thai', 'ผัดไทย', 'ผัดไทย', 'single', 'single', 70.00, 'Thai stir-fried noodles with shrimp', '["spice"]', '../media/padthai.jpg', 1, 3),
('Hainanese Chicken Rice', 'ข้าวมันไก่', 'ข้าวมันไก่', 'single', 'single', 60.00, 'Steamed chicken rice with special sauce', '[]', '../media/hainanesechickenrice.jpg', 1, 4),
('Som Tam Thai', 'ส้มตำไทย', 'ส้มตำไทย', 'salad', 'salad', 55.00, 'Spicy green papaya salad', '["spice"]', '../media/somtamthai.jpg', 1, 5),
('Korean BBQ Beef', 'เนื้อย่างเกาหลี', 'เนื้อย่างเกาหลี', 'main', 'main', 180.00, 'Korean-style marinated grilled beef', '["doneness"]', '../media/koreanbbq.jpg', 1, 6),
('Beef Basil', 'กระเพราเนื้อ', 'กระเพราเนื้อ', 'single', 'single', 85.00, 'Minced beef basil with fried egg', '["spice"]', '../media/beefbasil.jpg', 1, 7),
('Lime Juice', 'น้ำมะนาว', 'น้ำมะนาว', 'drink', 'drink', 25.00, 'Fresh lime juice', '["sweet","ice"]', '../media/limejuice.jpg', 1, 8),
('Green Tea', 'ชาเขียว', 'ชาเขียว', 'drink', 'drink', 30.00, 'Iced green tea', '["sweet","ice"]', '../media/greentea.jpg', 1, 9),
('Ice Cream', 'ไอศครีม', 'ไอศครีม', 'dessert', 'dessert', 35.00, 'Vanilla ice cream', '["size"]', '../media/Icecream.jpg', 1, 10),
('Crispy Pork Basil', 'กระเพราหมูกรอบ', 'กระเพราหมูกรอบ', 'single', 'single', 70.00, 'Crispy pork basil rice', '["spice"]', '../media/crispyporkbasil.jpg', 1, 11),
('Seafood Tom Yum', 'ต้มยำทะเล', 'ต้มยำทะเล', 'tomyum', 'tomyum', 150.00, 'Mixed seafood tom yum soup', '["spice"]', '../media/seafoodtomyum.jpg', 1, 12),
('Soda', 'น้ำอัดลม', 'น้ำอัดลม', 'drink', 'drink', 20.00, 'Soda, Coke, Sprite', '["sweet","ice"]', '../media/soda.jpg', 1, 13);

INSERT INTO `menu_option_groups` (`code`, `label_en`, `label_th`, `default_value`) VALUES
('spice', 'Spiciness', 'ระดับความเผ็ด', 'Medium'),
('sweet', 'Sweetness', 'ระดับความหวาน', 'Normal'),
('ice', 'Ice Level', 'ระดับน้ำแข็ง', 'Regular Ice'),
('doneness', 'Doneness', 'ระดับความสุก', 'Medium'),
('size', 'Size', 'ขนาด', 'Regular');

INSERT INTO `menu_option_choices` (`group_id`, `value`, `label_th`, `sort_order`) VALUES
(1, 'No Spicy', 'ไม่เผ็ด', 1),
(1, 'Mild', 'เผ็ดน้อย', 2),
(1, 'Medium', 'เผ็ดกลาง', 3),
(1, 'Extra Spicy', 'เผ็ดมาก', 4),
(2, 'No Sugar', 'ไม่หวาน', 1),
(2, 'Less Sugar', 'หวานน้อย', 2),
(2, 'Normal', 'หวานปกติ', 3),
(2, 'Extra Sweet', 'หวานมาก', 4),
(3, 'No Ice', 'ไม่ใส่น้ำแข็ง', 1),
(3, 'Less Ice', 'น้ำแข็งน้อย', 2),
(3, 'Regular Ice', 'ปกติ', 3),
(3, 'Extra Ice', 'น้ำแข็งเยอะ', 4),
(4, 'Medium Rare', 'มีเดียมแรร์', 1),
(4, 'Medium', 'มีเดียม', 2),
(4, 'Well Done', 'สุกมาก', 3),
(5, 'Small', 'เล็ก', 1),
(5, 'Regular', 'ปกติ', 2),
(5, 'Large', 'ใหญ่', 3);

INSERT INTO `menu_option_map` (`menu_id`, `group_id`) VALUES
(1, 1),
(2, 1),
(3, 1),
(5, 1),
(7, 1),
(11, 1),
(12, 1),
(8, 2),
(9, 2),
(13, 2),
(8, 3),
(9, 3),
(13, 3),
(6, 4),
(10, 5);

INSERT INTO `tables` (`table_number`, `status`) VALUES
(1, 'inactive'), (2, 'inactive'), (3, 'inactive'), (4, 'inactive'), (5, 'inactive'),
(6, 'inactive'), (7, 'inactive'), (8, 'inactive'), (9, 'inactive'), (10, 'inactive');

-- Keep app_state clean on import (no stale historical sync payload)
DELETE FROM `app_state`;
