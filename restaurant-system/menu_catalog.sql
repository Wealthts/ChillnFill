USE restaurant_system;

CREATE TABLE IF NOT EXISTS menu_option_groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    label_en VARCHAR(100) NOT NULL,
    label_th VARCHAR(100) DEFAULT NULL,
    default_value VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_option_choices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id INT NOT NULL,
    value VARCHAR(100) NOT NULL,
    label_th VARCHAR(100) DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_group_value (group_id, value),
    CONSTRAINT fk_menu_option_choices_group
        FOREIGN KEY (group_id) REFERENCES menu_option_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS menu_option_map (
    menu_id INT NOT NULL,
    group_id INT NOT NULL,
    PRIMARY KEY (menu_id, group_id),
    CONSTRAINT fk_menu_option_map_menu
        FOREIGN KEY (menu_id) REFERENCES menu(id) ON DELETE CASCADE,
    CONSTRAINT fk_menu_option_map_group
        FOREIGN KEY (group_id) REFERENCES menu_option_groups(id) ON DELETE CASCADE
);

ALTER TABLE menu
    ADD COLUMN IF NOT EXISTS name_th VARCHAR(100) DEFAULT NULL AFTER name,
    ADD COLUMN IF NOT EXISTS category_code VARCHAR(50) DEFAULT NULL AFTER category,
    ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0 AFTER is_available;

INSERT INTO menu_option_groups (code, label_en, label_th, default_value) VALUES
('spice', 'Spiciness', 'ระดับความเผ็ด', 'Medium'),
('sweet', 'Sweetness', 'ระดับความหวาน', 'Normal'),
('ice', 'Ice Level', 'ระดับน้ำแข็ง', 'Regular Ice'),
('doneness', 'Doneness', 'ระดับความสุก', 'Medium'),
('size', 'Size', 'ขนาด', 'Regular')
ON DUPLICATE KEY UPDATE
    label_en = VALUES(label_en),
    label_th = VALUES(label_th),
    default_value = VALUES(default_value);

INSERT INTO menu_option_choices (group_id, value, label_th, sort_order)
SELECT g.id, v.value, v.label_th, v.sort_order
FROM menu_option_groups g
JOIN (
    SELECT 'spice' AS code, 'No Spicy' AS value, 'ไม่เผ็ด' AS label_th, 1 AS sort_order
    UNION ALL SELECT 'spice', 'Mild', 'เผ็ดน้อย', 2
    UNION ALL SELECT 'spice', 'Medium', 'เผ็ดกลาง', 3
    UNION ALL SELECT 'spice', 'Extra Spicy', 'เผ็ดมาก', 4
    UNION ALL SELECT 'sweet', 'No Sugar', 'ไม่หวาน', 1
    UNION ALL SELECT 'sweet', 'Less Sugar', 'หวานน้อย', 2
    UNION ALL SELECT 'sweet', 'Normal', 'ปกติ', 3
    UNION ALL SELECT 'sweet', 'Extra Sweet', 'หวานมาก', 4
    UNION ALL SELECT 'ice', 'No Ice', 'ไม่ใส่น้ำแข็ง', 1
    UNION ALL SELECT 'ice', 'Less Ice', 'น้ำแข็งน้อย', 2
    UNION ALL SELECT 'ice', 'Regular Ice', 'ปกติ', 3
    UNION ALL SELECT 'ice', 'Extra Ice', 'น้ำแข็งเยอะ', 4
    UNION ALL SELECT 'doneness', 'Medium Rare', 'มีเดียมแรร์', 1
    UNION ALL SELECT 'doneness', 'Medium', 'มีเดียม', 2
    UNION ALL SELECT 'doneness', 'Well Done', 'สุกมาก', 3
    UNION ALL SELECT 'size', 'Small', 'เล็ก', 1
    UNION ALL SELECT 'size', 'Regular', 'ปกติ', 2
    UNION ALL SELECT 'size', 'Large', 'ใหญ่', 3
) v ON v.code = g.code
ON DUPLICATE KEY UPDATE
    label_th = VALUES(label_th),
    sort_order = VALUES(sort_order);

INSERT INTO menu (id, name, name_th, category, category_code, price, description, image_url, is_available, sort_order) VALUES
(1, 'Basil Fried Rice', 'ข้าวผัดกะเพรา', 'Single Plate', 'single', 65, 'Crispy chicken basil rice with fried egg', '../media/basilfriedrice.jpg', 1, 1),
(2, 'Tom Yum Goong', 'ต้มยำกุ้ง', 'Tom Yum', 'tomyum', 120, 'Clear spicy shrimp tom yum soup', '../media/tomyumkung.jpg', 1, 2),
(3, 'Pad Thai', 'ผัดไทย', 'Single Plate', 'single', 70, 'Thai stir-fried noodles with shrimp', '../media/padthai.jpg', 1, 3),
(4, 'Hainanese Chicken Rice', 'ข้าวมันไก่', 'Single Plate', 'single', 60, 'Steamed chicken rice with special sauce', '../media/hainanesechickenrice.jpg', 1, 4),
(5, 'Som Tam Thai', 'ส้มตำไทย', 'Salad', 'salad', 55, 'Spicy green papaya salad', '../media/somtamthai.jpg', 1, 5),
(6, 'Korean BBQ Beef', 'เนื้อย่างเกาหลี', 'Main', 'main', 180, 'Korean-style marinated grilled beef', '../media/koreanbbq.jpg', 1, 6),
(7, 'Beef Basil', 'กะเพราเนื้อ', 'Single Plate', 'single', 85, 'Minced beef basil with fried egg', '../media/beefbasil.jpg', 1, 7),
(8, 'Lime Juice', 'น้ำมะนาว', 'Drink', 'drink', 25, 'Fresh lime juice', '../media/limejuice.jpg', 1, 8),
(9, 'Green Tea', 'ชาเขียว', 'Drink', 'drink', 30, 'Iced green tea', '', 1, 9),
(10, 'Ice Cream', 'ไอศกรีม', 'Dessert', 'dessert', 35, 'Vanilla ice cream', '', 1, 10),
(11, 'Crispy Pork Basil', 'กะเพราหมูกรอบ', 'Single Plate', 'single', 70, 'Crispy pork basil rice', '', 1, 11),
(12, 'Seafood Tom Yum', 'ต้มยำทะเล', 'Tom Yum', 'tomyum', 150, 'Mixed seafood tom yum soup', '', 1, 12),
(13, 'Soda', 'น้ำอัดลม', 'Drink', 'drink', 20, 'Soda, Coke, Sprite', '', 1, 13)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    name_th = VALUES(name_th),
    category = VALUES(category),
    category_code = VALUES(category_code),
    price = VALUES(price),
    description = VALUES(description),
    image_url = VALUES(image_url),
    is_available = VALUES(is_available),
    sort_order = VALUES(sort_order);

INSERT INTO menu_option_map (menu_id, group_id)
SELECT m.id, g.id
FROM menu m
JOIN menu_option_groups g ON (
    (m.id IN (1,2,3,5,7,11,12) AND g.code = 'spice') OR
    (m.id IN (8,9,13) AND g.code IN ('sweet', 'ice')) OR
    (m.id = 6 AND g.code = 'doneness') OR
    (m.id = 10 AND g.code = 'size')
)
ON DUPLICATE KEY UPDATE menu_id = VALUES(menu_id);
