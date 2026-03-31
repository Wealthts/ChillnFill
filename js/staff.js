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
        window.location.origin + '/api/',
        'http://localhost:3000/api/',
        'http://127.0.0.1:3000/api/',
        'http://localhost/api/',
        'http://127.0.0.1/api/'
    ];

    for (const path of possiblePaths) {
        try {
            const testUrl = path + 'session';
            const healthUrl = path.endsWith('/api/') ? path.replace(/\/api\/$/, '/api/health') : '';

            if (healthUrl) {
                const healthResponse = await fetch(healthUrl, { method: 'GET' });
                const healthType = healthResponse.headers.get('content-type') || '';
                if (healthResponse.ok && healthType.includes('application/json')) {
                    return normalizeBase(path);
                }
            }

            const response = await fetch(testUrl, { method: 'GET' });
            const contentType = response.headers.get('content-type') || '';
            if (response.ok && contentType.includes('application/json')) {
                return normalizeBase(path);
            }
        } catch (e) {
        }
    }
    return '';
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

function bindEnter(ids, handler) {
    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            handler();
        });
    });
}

function normalizeCookId(value) {
    return String(value || '').trim().toLowerCase();
}

function isCookActive(cook) {
    if (!cook || typeof cook !== 'object') return true;
    if (typeof cook.active === 'boolean') return cook.active;
    if ('cooking' in cook || 'serving' in cook) {
        return Boolean(cook.cooking || cook.serving);
    }
    return true;
}

function isCookEnabledInLocalStorage(cookId) {
    const cooks = JSON.parse(localStorage.getItem('cooks') || '[]');
    const matched = cooks.find((cook) => normalizeCookId(cook.id) === normalizeCookId(cookId));
    if (!matched) return true;
    return isCookActive(matched);
}

function toggleRegisterPanel(show) {
    const panel = document.getElementById('staff-register-panel');
    const loginPanel = document.getElementById('staff-login-panel');
    if (!panel) return;

    panel.classList.toggle('hidden', !show);
    if (loginPanel) {
        loginPanel.classList.toggle('hidden', show);
    }
}

function tryLocalCookLogin(cookId, password) {
    const cooks = JSON.parse(localStorage.getItem('cooks') || '[]');
    const matched = cooks.find((cook) => String(cook.id) === String(cookId) && String(cook.password) === String(password));
    if (!matched) return false;
    if (!isCookActive(matched)) {
        showMessage('This cook account is disabled. Please contact admin.', 'error');
        return true;
    }

    localStorage.setItem('user_type', 'cook');
    localStorage.setItem('cook_id', matched.id || cookId);
    localStorage.setItem('cook_name', matched.name || '');
    window.location.href = 'cook.html';
    return true;
}

function tryLocalCookRegister(cookId, password, fullName) {
    const cooks = JSON.parse(localStorage.getItem('cooks') || '[]');
    const exists = cooks.some((cook) => String(cook.id) === String(cookId));
    if (exists) {
        return { ok: false, message: 'Cook ID already exists in local storage.' };
    }

    cooks.push({
        id: cookId,
        password: password,
        name: fullName,
        active: true
    });

    localStorage.setItem('cooks', JSON.stringify(cooks));
    return { ok: true, message: `Registered ${cookId} (local).` };
}

async function registerCookFromStaff() {
    const fullName = document.getElementById('register-cook-name').value.trim();
    const cookId = document.getElementById('register-cook-id').value.trim();
    const password = document.getElementById('register-cook-password').value;

    if (!fullName || !cookId || !password) {
        showMessage('Please enter full name, cook ID and password.', 'error');
        return;
    }

    if (password.length < 4) {
        showMessage('Password must be at least 4 characters.', 'error');
        return;
    }

    try {
        if (!API_BASE) throw new Error('API unavailable');
        const response = await fetch(`${API_BASE}cook/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cook_id: cookId, password: password, full_name: fullName })
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await parseJsonResponse(response);
        if (!data.success) {
            showMessage(data.message || 'Cook registration failed.', 'error');
            return;
        }

        showMessage(data.message || `Registered ${cookId} successfully.`, 'success');
    } catch (error) {
        const localResult = tryLocalCookRegister(cookId, password, fullName);
        if (!localResult.ok) {
            showMessage(localResult.message, 'error');
            return;
        }
        showMessage(`API unavailable. ${localResult.message}`, 'success');
    }

    const fullNameInput = document.getElementById('register-cook-name');
    const cookIdInput = document.getElementById('register-cook-id');
    const passwordInput = document.getElementById('register-cook-password');
    if (fullNameInput) fullNameInput.value = '';
    if (cookIdInput) cookIdInput.value = '';
    if (passwordInput) passwordInput.value = '';
}

async function staffLogin() {
    const username = document.getElementById('staff-username').value.trim();
    const password = document.getElementById('staff-password').value;

    if (!username || !password) {
        showMessage('Please enter username and password.', 'error');
        return;
    }

    if (!isCookEnabledInLocalStorage(username) && !(username === 'admin' && password === '0000')) {
        showMessage('This cook account is disabled. Please contact admin.', 'error');
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
        if (!API_BASE) throw new Error('API unavailable');
        const response = await fetch(`${API_BASE}staff/login`, {
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
                const cookId = data.user_id || username;
                if (!isCookEnabledInLocalStorage(cookId)) {
                    showMessage('This cook account is disabled. Please contact admin.', 'error');
                    return;
                }
                localStorage.setItem('user_type', 'cook');
                localStorage.setItem('cook_id', cookId);
                localStorage.setItem('cook_name', data.full_name || '');
                window.location.href = 'cook.html';
            } else {
                showMessage('Role not recognized.', 'error');
            }
        } else {
            showMessage(data.message || 'Invalid login', 'error');
        }
    } catch (error) {
        // Fallback: try cook login if unified endpoint is not available
        try {
            if (!API_BASE) throw new Error('API unavailable');
            const response = await fetch(`${API_BASE}cook/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cook_id: username, password: password })
            });
            if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
            const data = await parseJsonResponse(response);
            if (data.success) {
                if (!isCookEnabledInLocalStorage(data.cook_id)) {
                    showMessage('This cook account is disabled. Please contact admin.', 'error');
                    return;
                }
                localStorage.setItem('user_type', 'cook');
                localStorage.setItem('cook_id', data.cook_id);
                localStorage.setItem('cook_name', data.full_name);
                window.location.href = 'cook.html';
                return;
            }
        } catch (inner) {
            // ignore and show below
        }
        if (tryLocalCookLogin(username, password)) {
            return;
        }
        showMessage('Error: ' + error.message, 'error');
    }
}

(async function init() {
    API_BASE = await findApiPath();
    const btn = document.getElementById('btn-staff-login');
    if (btn) btn.addEventListener('click', staffLogin);
    const registerBtn = document.getElementById('btn-cook-register-from-staff');
    if (registerBtn) registerBtn.addEventListener('click', registerCookFromStaff);
    const showRegisterBtn = document.getElementById('show-register-btn');
    if (showRegisterBtn) showRegisterBtn.addEventListener('click', () => toggleRegisterPanel(true));
    const hideRegisterBtn = document.getElementById('hide-register-btn');
    if (hideRegisterBtn) hideRegisterBtn.addEventListener('click', () => toggleRegisterPanel(false));

    bindEnter(['staff-username', 'staff-password'], staffLogin);
    bindEnter(['register-cook-name', 'register-cook-id', 'register-cook-password'], registerCookFromStaff);
})();
