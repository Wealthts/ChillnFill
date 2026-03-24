let API_BASE = '';

async function findApiPath() {
    const possiblePaths = [
        window.location.origin + '/restaurant-system/',
        window.location.origin + '/restaurant-system/api/',
        'http://localhost/restaurant-system/',
        'http://localhost/restaurant-system/api/'
    ];
    
    for (const path of possiblePaths) {
        try {
            const testUrl = path + 'get_session.php';
            console.log('Testing:', testUrl);
            const response = await fetch(testUrl, { method: 'GET' });
            if (response.ok) {
                console.log('Found API at:', path);
                return path;
            }
        } catch (e) {
            console.log('Failed:', path, e.message);
        }
    }
    return window.location.origin + '/restaurant-system/'; // ค่าเริ่มต้น
}


function showLoginForm(role) {
    hideAllForms();
    if (role === 'customer') {
        document.getElementById('customer-form').classList.remove('hidden');
    } else if (role === 'cook') {
        document.getElementById('cook-login-form').classList.remove('hidden');
    } else if (role === 'admin') {
        document.getElementById('admin-form').classList.remove('hidden');
    }
}

function showRegisterForm() {
    hideAllForms();
    document.getElementById('cook-register-form').classList.remove('hidden');
}

function hideAllForms() {
    const forms = ['customer-form', 'cook-register-form', 'cook-login-form', 'admin-form'];
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) form.classList.add('hidden');
    });
    removeMessages();
}

function removeMessages() {
    document.querySelectorAll('.message').forEach(msg => msg.remove());
}

function showMessage(text, type) {
    removeMessages();
    const activeForm = document.querySelector('.login-form:not(.hidden)');
    if (activeForm) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        activeForm.insertBefore(messageDiv, activeForm.firstChild);
        setTimeout(() => messageDiv.remove(), 3000);
    }
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

        const data = await response.json();

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
    const cookId   = document.getElementById('register-cook-id').value.trim();
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

        const data = await response.json();

        if (data.success) {
            showMessage(data.message, 'success');
            setTimeout(() => {
                document.getElementById('register-cook-id').value = '';
                document.getElementById('register-password').value = '';
                document.getElementById('register-fullname').value = '';
                showLoginForm('cook');
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
    const cookId   = document.getElementById('cook-id').value.trim();
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

        const data = await response.json();

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

        const data = await response.json();

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
        const data = await response.json();

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

// เริ่มต้นการทำงาน: หา API path และตรวจสอบ session
(async function init() {
    API_BASE = await findApiPath();
    console.log('Using API_BASE:', API_BASE);
    
    if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
        checkSession();
    }
})();