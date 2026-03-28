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

function clearCustomerSessionFlow(tableNumber, userId = '') {
    const table = String(tableNumber || '').trim();
    const uid = String(userId || '').trim();
    if (table) {
        localStorage.removeItem(`ordering_locked_after_review_table_${table}`);
        localStorage.removeItem(`pending_review_payment_table_${table}`);
    }
    if (uid) {
        localStorage.removeItem(`ordering_locked_after_review_${uid}`);
        localStorage.removeItem(`pending_review_payment_${uid}`);
    }
}

async function customerLogin() {
    const tableNumber = document.getElementById('table-number').value;

    if (!tableNumber) {
        showMessage('Please enter a table number.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}customer_login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table_number: parseInt(tableNumber, 10) })
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await parseJsonResponse(response);

        if (data.success) {
            showMessage(data.message, 'success');
            clearCustomerSessionFlow(data.table_number, data.user_id);
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
        // Fallback to local session for static usage
        const fallbackUserId = String(Date.now());
        clearCustomerSessionFlow(tableNumber, fallbackUserId);
        localStorage.setItem('user_id', fallbackUserId);
        localStorage.setItem('table_number', tableNumber);
        localStorage.setItem('user_type', 'customer');
        window.location.href = 'menu.html';
    }
}

(async function init() {
    API_BASE = await findApiPath();
    const btn = document.getElementById('btn-customer-login');
    if (btn) btn.addEventListener('click', customerLogin);
    bindEnter(['table-number'], customerLogin);
})();
