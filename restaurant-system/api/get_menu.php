<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

try {
    $menuStmt = $pdo->query("
        SELECT
            m.id,
            m.name,
            COALESCE(m.name_th, '') AS thaiName,
            m.price,
            COALESCE(m.category_code, LOWER(m.category)) AS category,
            COALESCE(m.description, '') AS `desc`,
            COALESCE(m.image_url, '') AS image,
            m.is_available,
            m.sort_order
        FROM menu m
        WHERE m.is_available = 1
        ORDER BY m.sort_order ASC, m.id ASC
    ");
    $menus = $menuStmt->fetchAll(PDO::FETCH_ASSOC);

    $optionStmt = $pdo->query("
        SELECT
            g.id,
            g.code,
            g.label_en,
            COALESCE(g.label_th, '') AS label_th,
            COALESCE(g.default_value, '') AS default_value
        FROM menu_option_groups g
        ORDER BY g.id ASC
    ");
    $groups = $optionStmt->fetchAll(PDO::FETCH_ASSOC);

    $choiceStmt = $pdo->query("
        SELECT
            c.group_id,
            c.value,
            COALESCE(c.label_th, '') AS label_th
        FROM menu_option_choices c
        ORDER BY c.group_id ASC, c.sort_order ASC, c.id ASC
    ");
    $choicesByGroup = [];
    foreach ($choiceStmt->fetchAll(PDO::FETCH_ASSOC) as $choice) {
        $choicesByGroup[(int)$choice['group_id']][] = [
            'value' => $choice['value'],
            'th' => $choice['label_th'],
        ];
    }

    $mapStmt = $pdo->query("
        SELECT menu_id, group_id
        FROM menu_option_map
        ORDER BY menu_id ASC
    ");
    $groupIdsByMenu = [];
    foreach ($mapStmt->fetchAll(PDO::FETCH_ASSOC) as $map) {
        $groupIdsByMenu[(int)$map['menu_id']][] = (int)$map['group_id'];
    }

    $optionSets = [];
    $groupsById = [];
    foreach ($groups as $group) {
        $groupId = (int)$group['id'];
        $optionSets[$group['code']] = [
            'label' => $group['label_en'],
            'choices' => $choicesByGroup[$groupId] ?? [],
            'default' => $group['default_value'],
        ];
        $groupsById[$groupId] = $group['code'];
    }

    $menuItems = array_map(function ($menu) use ($groupIdsByMenu, $groupsById) {
        $menuId = (int)$menu['id'];
        $optionKeys = array_values(array_filter(array_map(
            fn($groupId) => $groupsById[$groupId] ?? null,
            $groupIdsByMenu[$menuId] ?? []
        )));

        return [
            'id' => $menuId,
            'name' => $menu['name'],
            'thaiName' => $menu['thaiName'],
            'price' => (float)$menu['price'],
            'category' => $menu['category'],
            'desc' => $menu['desc'],
            'hasOptions' => count($optionKeys) > 0,
            'optionKeys' => $optionKeys,
            'image' => $menu['image'],
        ];
    }, $menus);

    jsonResponse([
        'success' => true,
        'data' => [
            'menus' => $menuItems,
            'optionSets' => $optionSets,
        ],
    ]);
} catch (Exception $e) {
    jsonResponse(['success' => false, 'message' => 'Failed to load menu: ' . $e->getMessage()], 500);
}
