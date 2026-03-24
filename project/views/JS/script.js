let API_BASE = '';

function normalizeBase(path) {
    if (!path) return '';
    if (!path.endsWith('/')) return path + '/';
    return path;
}

function resolveApiBaseFromMeta() {
    const meta = document.querySelector('meta[name="api-base"]');
    if (!meta || !meta.content) return '';
    const raw = meta.content.trim();
    if (!raw) return '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        return normalizeBase(raw);
    }
    return normalizeBase(window.location.origin + raw);
}

async function findApiPath() {
    const metaBase = resolveApiBaseFromMeta();
    if (metaBase) {
        return metaBase;
    }

    const possiblePaths = [
        window.location.origin + '/restaurant-system/api/',
        window.location.origin + '/restaurant-system/',
        'http://localhost/restaurant-system/api/',
        'http://localhost/restaurant-system/'
    ];

    for (const path of possiblePaths) {
        try {
            const testUrl = path + 'get_session.php';
            console.log('Testing:', testUrl);
            const response = await fetch(testUrl, { method: 'GET' });
            const contentType = response.headers.get('content-type') || '';
            if (response.ok && contentType.includes('application/json')) {
                console.log('Found API at:', path);
                return normalizeBase(path);
            }
        } catch (e) {
            console.log('Failed:', path, e.message);
        }
    }
    return normalizeBase(window.location.origin + '/restaurant-system/api/');
}

async function parseJsonResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(
            `API response is not JSON (status ${response.status}). ${text ? 'Body: ' + text.slice(0, 200) : ''}`
        );
    }
    return response.json();
}

function showMessage(text, type) {
    const container = document.getElementById('message-container');
    if (container) {
        container.innerHTML = `<div class="message ${type} animate-[fadeIn_0.3s_ease-in]">${text}</div>`;
        setTimeout(() => { container.innerHTML = ''; }, 3000);
    } else {
        alert(text);
    }
}

function bindClick(id, handler) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('click', handler);
    }
}

function hideAllForms() {
    const forms = document.querySelectorAll('.login-form');
    forms.forEach((form) => form.classList.add('hidden'));

    const roleButtons = document.getElementById('role-buttons');
    if (roleButtons) {
        roleButtons.classList.remove('hidden');
    }
}

function showLoginForm(role) {
    hideAllForms();

    const roleButtons = document.getElementById('role-buttons');
    if (roleButtons) {
        roleButtons.classList.add('hidden');
    }

    const formMap = {
        customer: 'customer-form',
        cook: 'cook-login-form',
        admin: 'admin-form',
    };

    const formId = formMap[role];
    if (formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.classList.remove('hidden');
        }
    }
}

function showRegisterForm() {
    hideAllForms();

    const roleButtons = document.getElementById('role-buttons');
    if (roleButtons) {
        roleButtons.classList.add('hidden');
    }

    const form = document.getElementById('cook-register-form');
    if (form) {
        form.classList.remove('hidden');
    }
}

// Ensure inline onclick handlers can find these functions
window.showLoginForm = showLoginForm;
window.hideAllForms = hideAllForms;
window.showRegisterForm = showRegisterForm;

function initUiHandlers() {
    bindClick('btn-role-customer', () => showLoginForm('customer'));
    bindClick('btn-role-cook', () => showLoginForm('cook'));
    bindClick('btn-role-admin', () => showLoginForm('admin'));

    bindClick('btn-customer-login', customerLogin);
    bindClick('btn-customer-back', hideAllForms);

    bindClick('btn-cook-login', cookLogin);
    bindClick('btn-cook-register-link', showRegisterForm);
    bindClick('btn-cook-back', hideAllForms);

    bindClick('btn-cook-register', cookRegister);
    bindClick('btn-cook-register-login', () => showLoginForm('cook'));
    bindClick('btn-cook-register-back', hideAllForms);

    bindClick('btn-admin-login', adminLogin);
    bindClick('btn-admin-back', hideAllForms);
}

async function customerLogin() {
    const tableNumber = document.getElementById('table-number').value;

    if (!tableNumber) {
        showMessage('กรุณากรอกหมายเลขโต๊ะ', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}customer_login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table_number: parseInt(tableNumber) })
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await parseJsonResponse(response);

        if (data.success) {
            showMessage(data.message, 'success');
            localStorage.setItem('user_id', data.user_id);
            localStorage.setItem('table_number', data.table_number);
            localStorage.setItem('user_type', 'customer');

            setTimeout(() => {
                window.location.href = 'dashboard/customer_dashboard.html';
            }, 1000);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        showMessage('เกิดข้อผิดพลาด: ' + error.message, 'error');
        console.error('customerLogin error:', error);
    }
}

async function cookRegister() {
    const cookId = document.getElementById('register-cook-id').value.trim();
    const password = document.getElementById('register-password').value;
    const fullName = document.getElementById('register-fullname').value.trim();

    if (!cookId || !password || !fullName) {
        showMessage('กรุณากรอก Cook ID, รหัสผ่าน และชื่อ-นามสกุล', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}cook_register.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cook_id: cookId, password: password, full_name: fullName })
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await parseJsonResponse(response);

        if (data.success) {
            showMessage(data.message, 'success');
            setTimeout(() => {
                window.location.href = 'login_cook.html';
            }, 1500);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        showMessage('เกิดข้อผิดพลาด: ' + error.message, 'error');
        console.error('cookRegister error:', error);
    }
}

async function cookLogin() {
    const cookId = document.getElementById('cook-id').value.trim();
    const password = document.getElementById('cook-password').value;

    if (!cookId || !password) {
        showMessage('กรุณากรอก Cook ID และรหัสผ่าน', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}cook_login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cook_id: cookId, password: password })
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await parseJsonResponse(response);

        if (data.success) {
            showMessage(data.message, 'success');
            localStorage.setItem('cook_id', data.cook_id);
            localStorage.setItem('cook_name', data.full_name);
            localStorage.setItem('user_type', 'cook');

            setTimeout(() => {
                window.location.href = 'dashboard/cook_dashboard.html';
            }, 1000);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        showMessage('เกิดข้อผิดพลาด: ' + error.message, 'error');
        console.error('cookLogin error:', error);
    }
}

async function adminLogin() {
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value;

    if (!username || !password) {
        showMessage('กรุณากรอก Username และรหัสผ่าน', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}admin_login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await parseJsonResponse(response);

        if (data.success) {
            showMessage(data.message, 'success');
            localStorage.setItem('user_type', 'admin');
            localStorage.setItem('admin_logged_in', 'true');

            setTimeout(() => {
                window.location.href = 'dashboard/admin_dashboard.html';
            }, 1000);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        showMessage('เกิดข้อผิดพลาด: ' + error.message, 'error');
        console.error('adminLogin error:', error);
    }
}

async function checkSession() {
    try {
        const response = await fetch(`${API_BASE}get_session.php`);
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await parseJsonResponse(response);

        if (data.logged_in) {
            if (data.user_type === 'customer' && !window.location.pathname.includes('customer_dashboard')) {
                window.location.href = 'dashboard/customer_dashboard.html';
            } else if (data.user_type === 'cook' && !window.location.pathname.includes('cook_dashboard')) {
                window.location.href = 'dashboard/cook_dashboard.html';
            } else if (data.user_type === 'admin' && !window.location.pathname.includes('admin_dashboard')) {
                window.location.href = 'dashboard/admin_dashboard.html';
            }
        }
    } catch (error) {
        console.log('No active session');
    }
}

(async function init() {
    API_BASE = await findApiPath();
    console.log('Using API_BASE:', API_BASE);

    initUiHandlers();

    if (window.location.pathname === '/' || (window.location.pathname.includes('.html') && !window.location.pathname.includes('dashboard'))) {
        checkSession();
    }
})();
