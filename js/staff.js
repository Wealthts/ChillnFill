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
            const response = await fetch(testUrl, { method: 'GET' });
            const contentType = response.headers.get('content-type') || '';
            if (response.ok && contentType.includes('application/json')) {
                return normalizeBase(path);
            }
        } catch (e) {
        }
    }
    return normalizeBase(window.location.origin + '/restaurant-system/api/');
}

async function parseJsonResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`API response is not JSON (status ${response.status}). ${text ? 'Body: ' + text.slice(0, 200) : ''}`);
    }
    return response.json();
}

function showMessage(text, type) {
    const container = document.getElementById('message-container');
    if (container) {
        const variant = type === 'success' ? 'alert-success' : 'alert-error';
        container.innerHTML = `<div role="alert" class="alert ${variant} text-sm font-medium">${text}</div>`;
        setTimeout(() => { container.innerHTML = ''; }, 3000);
    } else {
        alert(text);
    }
}

async function staffLogin() {
    const username = document.getElementById('staff-username').value.trim();
    const password = document.getElementById('staff-password').value;

    if (!username || !password) {
        showMessage('Please enter username and password.', 'error');
        return;
    }

    // Admin shortcut
    if (username === 'admin' && password === '0000') {
        localStorage.setItem('user_type', 'admin');
        localStorage.setItem('admin_logged_in', 'true');
        window.location.href = 'admin.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}staff_login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await parseJsonResponse(response);

        if (data.success) {
            const role = String(data.role || data.user_type || '').toLowerCase();
            if (role === 'admin') {
                localStorage.setItem('user_type', 'admin');
                localStorage.setItem('admin_logged_in', 'true');
                window.location.href = 'admin.html';
            } else if (role === 'cook') {
                localStorage.setItem('user_type', 'cook');
                localStorage.setItem('cook_id', data.user_id || username);
                localStorage.setItem('cook_name', data.full_name || '');
                window.location.href = 'admin.html#orders';
            } else {
                showMessage('Role not recognized.', 'error');
            }
        } else {
            showMessage(data.message || 'Invalid login', 'error');
        }
    } catch (error) {
        // Fallback: try cook login if unified endpoint is not available
        try {
            const response = await fetch(`${API_BASE}cook_login.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cook_id: username, password: password })
            });
            if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
            const data = await parseJsonResponse(response);
            if (data.success) {
                localStorage.setItem('user_type', 'cook');
                localStorage.setItem('cook_id', data.cook_id);
                localStorage.setItem('cook_name', data.full_name);
                window.location.href = 'admin.html#orders';
                return;
            }
        } catch (inner) {
            // ignore and show below
        }
        showMessage('Error: ' + error.message, 'error');
    }
}

(async function init() {
    API_BASE = await findApiPath();
    const btn = document.getElementById('btn-staff-login');
    if (btn) btn.addEventListener('click', staffLogin);
})();
