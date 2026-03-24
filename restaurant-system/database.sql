DROP DATABASE IF EXISTS restaurant_system;
CREATE DATABASE restaurant_system;
USE restaurant_system;

-- ตาราง cooks (พ่อครัว)
CREATE TABLE IF NOT EXISTS cooks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cook_id VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง customer_sessions (ลูกค้า)
CREATE TABLE IF NOT EXISTS customer_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    table_number INT NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive') DEFAULT 'active'
);

-- ตาราง menu (เมนูอาหาร)
CREATE TABLE IF NOT EXISTS menu (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง orders (ออเดอร์)
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    session_id VARCHAR(100),
    table_number INT,
    cook_id VARCHAR(50),
    total_amount DECIMAL(10,2),
    status ENUM('pending', 'preparing', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (session_id) REFERENCES customer_sessions(session_id),
    FOREIGN KEY (cook_id) REFERENCES cooks(cook_id)
);

-- ตาราง order_items (รายละเอียดออเดอร์)
CREATE TABLE IF NOT EXISTS order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT,
    menu_id INT,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2),
    subtotal DECIMAL(10,2),
    notes TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_id) REFERENCES menu(id)
);

-- ตาราง admin (ผู้ดูแลระบบ)
CREATE TABLE IF NOT EXISTS admin (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- เพิ่มข้อมูลตัวอย่างในเมนู
INSERT INTO menu (name, category, price, description) VALUES
('ข้าวผัดกระเพรา', 'จานเดียว', 65, 'ข้าวผัดกระเพราไก่กรอบ ไข่ดาว'),
('ต้มยำกุ้ง', 'ต้มยำ', 120, 'ต้มยำกุ้งน้ำใส รสจัดจ้าน'),
('ผัดไทย', 'จานเดียว', 70, 'ผัดไทยกุ้งสด เส้นเหนียวนุ่ม'),
('ข้าวมันไก่', 'จานเดียว', 60, 'ข้าวมันไก่ต้ม น้ำจิ้มสูตรพิเศษ'),
('ส้มตำไทย', 'สลัด', 55, 'ส้มตำไทยรสแซ่บ มะละกอกรอบ'),
('เนื้อย่างเกาหลี', 'จานหลัก', 180, 'เนื้อหมักสูตรเกาหลี ย่างหอมกรุ่น'),
('กระเพราเนื้อ', 'จานเดียว', 85, 'กระเพราเนื้อสับ ไข่ดาว'),
('น้ำมะนาว', 'เครื่องดื่ม', 25, 'น้ำมะนาวคั้นสด'),
('ชาเขียว', 'เครื่องดื่ม', 30, 'ชาเขียวเย็น'),
('ไอศครีม', 'ของหวาน', 35, 'ไอศครีมวานิลลา');

-- เพิ่มพ่อครัวตัวอย่าง (รหัสผ่าน: cook123)
-- hash สำหรับ cook123 คือ: $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
INSERT INTO cooks (cook_id, password_hash, full_name, phone, status, created_at) VALUES
('COOK001', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'สมชาย ใจดี', '0812345678', 'active', NOW()),
('COOK002', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'สมหญิง รักดี', '0898765432', 'active', NOW());

-- เพิ่มแอดมิน (รหัสผ่าน: admin123)
-- hash สำหรับ admin123 คือ: $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
INSERT INTO admin (username, password_hash) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- เพิ่มข้อมูลเซสชันลูกค้าตัวอย่าง (ไม่จำเป็น แต่ไว้ทดสอบ)
INSERT INTO customer_sessions (session_id, table_number, status) VALUES
('CUST_DEMO_001', 1, 'inactive'),
('CUST_DEMO_002', 2, 'inactive');