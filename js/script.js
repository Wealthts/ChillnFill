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
        'http://127.0.0.1:3000/api/'
    ];

    for (const path of possiblePaths) {
        try {
            const testUrl = path + 'session';
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
    return normalizeBase(window.location.origin + '/api/');
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
        const variant = type === 'success' ? 'alert-success' : 'alert-error';
        container.innerHTML = `<div role="alert" class="alert ${variant} text-sm font-medium">${text}</div>`;
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

function normalizeTableNumber(value) {
    const parsed = Number.parseInt(String(value || '').trim(), 10);
    if (!Number.isInteger(parsed)) return null;
    if (parsed < 1 || parsed > 10) return null;
    return parsed;
}

function initTablePicker(onSelect) {
    const tableInput = document.getElementById('table-number');
    const tableButtons = document.querySelectorAll('.table-picker-btn[data-table-select]');
    if (!tableInput || !tableButtons.length) return;

    const applySelection = (value) => {
        const normalized = normalizeTableNumber(value);
        tableInput.value = normalized === null ? '' : String(normalized);

        tableButtons.forEach((button) => {
            const isSelected = String(button.dataset.tableSelect || '') === String(normalized || '');
            button.classList.toggle('bg-[#efe4d8]', isSelected);
            button.classList.toggle('text-[#7a4e2f]', isSelected);
            button.classList.toggle('ring-4', isSelected);
            button.classList.toggle('ring-[#d7b58f]', isSelected);
            button.classList.toggle('scale-105', isSelected);
            button.classList.toggle('bg-[#7a4e2f]', !isSelected);
            button.classList.toggle('text-[#f3eadf]', !isSelected);
        });
    };

    tableButtons.forEach((button) => {
        button.addEventListener('click', () => {
            applySelection(button.dataset.tableSelect || '');
            if (typeof onSelect === 'function') {
                onSelect();
            }
        });
    });

    applySelection(tableInput.value);
}

function normalizeCookId(value) {
    return String(value || '').trim().toLowerCase();
}

function isCookEnabledInLocalStorage(cookId) {
    const targetId = normalizeCookId(cookId);
    if (!targetId) return true;

    const cooks = JSON.parse(localStorage.getItem('cooks') || '[]');
    const matched = cooks.find((cook) => normalizeCookId(cook.id) === targetId);
    if (!matched) return true;

    if (typeof matched.active === 'boolean') return matched.active;
    if ('cooking' in matched || 'serving' in matched) {
        return Boolean(matched.cooking || matched.serving);
    }
    return true;
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

    bindClick('btn-customer-back', hideAllForms);

    bindEnter(['table-number'], customerLogin);
    initTablePicker(() => {
        customerLogin();
    });
}

async function customerLogin() {
    const tableInput = document.getElementById('table-number');
    const tableNumber = tableInput ? tableInput.value : '';
    const normalizedTableNumber = normalizeTableNumber(tableNumber);

    if (normalizedTableNumber === null) {
        showMessage('Please enter a table number from 1 to 10.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}customer/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table_number: normalizedTableNumber })
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
                window.location.href = 'menu.html';
            }, 500);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('customerLogin error:', error);
        // Fallback to local session for static usage
        localStorage.setItem('user_id', String(Date.now()));
        localStorage.setItem('table_number', String(normalizedTableNumber));
        localStorage.setItem('user_type', 'customer');
        window.location.href = 'menu.html';
    }
}
//ตอนนี้ cookRegister() ยังเก็บ cook_id + password + full_name แล้ว POST ไป /api/cook/register ต้องเปลี่ยนเป็น “ตั้งรหัสผ่านครั้งแรก”
async function cookRegister() {
  const cookId = document.getElementById('register-cook-id').value.trim();
  const password = document.getElementById('register-password').value;

  if (!cookId || !password) {
    showMessage('Please enter Cook ID and password.', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}cook/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cook_id: cookId,
        password: password
      })
    });

    const data = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    if (data.success) {
      showMessage(data.message, 'success');
      setTimeout(() => {
        window.location.href = 'login.html#cook';
      }, 1500);
    } else {
      showMessage(data.message, 'error');
    }
  } catch (error) {
    showMessage('Error: ' + error.message, 'error');
    console.error('cookSetPassword error:', error);
  }
}

async function cookLogin() {
    const cookId = document.getElementById('cook-id').value.trim();
    const password = document.getElementById('cook-password').value;

    if (!cookId || !password) {
        showMessage('Please enter Cook ID and password.', 'error');
        return;
    }

    if (!isCookEnabledInLocalStorage(cookId)) {
        showMessage('This cook account is disabled. Please contact admin.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}cook/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cook_id: cookId, password: password })
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await parseJsonResponse(response);

        if (data.success) {
            const resolvedCookId = data.cook_id || cookId;
            if (!isCookEnabledInLocalStorage(resolvedCookId)) {
                showMessage('This cook account is disabled. Please contact admin.', 'error');
                return;
            }

            showMessage(data.message, 'success');
            localStorage.setItem('cook_id', resolvedCookId);
            localStorage.setItem('cook_name', data.full_name);
            localStorage.setItem('user_type', 'cook');

            setTimeout(() => {
                window.location.href = 'admin.html#orders';
            }, 1000);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        showMessage('Error: ' + error.message, 'error');
        console.error('cookLogin error:', error);
    }
}

async function adminLogin() {
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value;

    if (!username || !password) {
        showMessage('Please enter username and password.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}admin/login`, {
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
                window.location.href = 'admin.html';
            }, 1000);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        showMessage('Error: ' + error.message, 'error');
        console.error('adminLogin error:', error);
    }
}

async function checkSession() {
    try {
        const response = await fetch(`${API_BASE}session`);
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await parseJsonResponse(response);

        if (data.logged_in) {
            if (data.user_type === 'customer' && !window.location.pathname.includes('menu.html')) {
                window.location.href = 'menu.html';
            } else if (data.user_type === 'cook' && !window.location.pathname.includes('cook.html')) {
                window.location.href = 'cook.html';
            } else if (data.user_type === 'admin' && !window.location.pathname.includes('admin.html')) {
                window.location.href = 'admin.html';
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

    const hashRole = (window.location.hash || '').replace('#', '').trim();
    if (hashRole === 'customer') {
        showLoginForm('customer');
    } else if (hashRole === 'cook' || hashRole === 'admin' || hashRole === 'register-cook') {
        window.location.href = 'staff.html';
    }

    if (window.location.pathname === '/' || (window.location.pathname.includes('.html') && !window.location.pathname.includes('dashboard'))) {
        checkSession();
    }
})();
