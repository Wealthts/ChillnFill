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

    applySelection(tableInput.value || getCurrentTableNumber());
}

function safeParseJSON(value, fallback) {
    try {
        return JSON.parse(value);
    } catch (err) {
        return fallback;
    }
}

function normalizeTableKey(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const digitsOnly = raw.replace(/\D+/g, '');
    return digitsOnly || raw.toLowerCase();
}

function renderStars(rating) {
    const value = Math.max(0, Math.min(5, Number(rating) || 0));
    const filled = '★'.repeat(value);
    const empty = '☆'.repeat(5 - value);
    return `${filled}${empty}`;
}

function escapeText(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDateTime(value) {
    const parsed = new Date(value || 0);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString();
}

function getCurrentTableNumber() {
    const stored = localStorage.getItem('table_number');
    if (stored) return stored;
    const tableInput = document.getElementById('table-number');
    return tableInput ? tableInput.value.trim() : '';
}

function getPaymentStatusClass(status) {
    const normalized = String(status || 'paid').toLowerCase();
    if (normalized === 'paid') return 'bg-[#e8f7ee] text-[#2f7a4f]';
    if (normalized === 'pending') return 'bg-[#fff4e8] text-[#a96a2a]';
    return 'bg-[#efe4d8] text-[#7a4e2f]';
}

function getPaymentStatusLabel(status) {
    const normalized = String(status || 'paid').toLowerCase();
    if (normalized === 'pending') return 'Pending';
    if (normalized === 'paid') return 'Paid';
    return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Paid';
}

function getAllPayments() {
    return safeParseJSON(localStorage.getItem('payments'), []) || [];
}

function getAllReviews() {
    return safeParseJSON(localStorage.getItem('reviews'), []) || [];
}

function getReviewsByPaymentId(paymentId, reviews) {
    if (!paymentId) return [];
    const target = String(paymentId);
    return reviews
        .filter((review) => String(review.paymentId || '') === target)
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
}

function renderHistoryForTable(tableNumber) {
    const container = document.getElementById('historyContainer');
    if (!container) return;

    const resolvedTable = String(tableNumber || getCurrentTableNumber() || '').trim();
    const normalizedTable = normalizeTableKey(resolvedTable);
    if (!normalizedTable) {
        container.innerHTML = `
            <div class="text-center py-5 text-[#a97a52]">
                Please enter your table number first.
            </div>
        `;
        return;
    }

    const payments = getAllPayments()
        .filter((payment) => normalizeTableKey(payment.table) === normalizedTable)
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
    const reviews = getAllReviews();

    if (!payments.length) {
        container.innerHTML = `
            <div class="text-center py-5 text-[#a97a52]">
                No payment history for table ${escapeText(resolvedTable)}
            </div>
        `;
        return;
    }

    container.innerHTML = payments.map((payment) => {
        const orderLabel = Array.isArray(payment.orderIds) && payment.orderIds.length
            ? payment.orderIds.join(', ')
            : (payment.orderId || '-');
        const itemsText = Array.isArray(payment.items) && payment.items.length
            ? payment.items.map((item) => `${item.name} x${item.qty}`).join(', ')
            : '-';
        const paymentReviews = getReviewsByPaymentId(payment.id, reviews);
        const latestReview = paymentReviews[0] || null;
        const reviewTime = latestReview ? formatDateTime(latestReview.time) : '-';
        const reviewText = latestReview && latestReview.comment ? latestReview.comment : 'No review yet';
        const reviewRating = latestReview ? renderStars(latestReview.rating) : 'Not rated';

        return `
            <div class="rounded-2xl border border-[#e6d7c7] bg-[#fffaf5] p-4 mb-3">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div class="font-bold text-[#5f4028]">Table ${escapeText(payment.table || resolvedTable || '-')}</div>
                    <div class="px-3 py-1 rounded-full text-xs font-bold ${getPaymentStatusClass(payment.status)}">
                        ${escapeText(getPaymentStatusLabel(payment.status))}
                    </div>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-3 mb-1">
                    <div class="text-sm text-[#a97a52]">Order: ${escapeText(orderLabel)}</div>
                    <div class="text-lg font-extrabold text-[#7a4e2f]">${escapeText(payment.amount)} Baht</div>
                </div>
                <div class="text-sm text-[#a97a52]">Date: ${escapeText(formatDateTime(payment.time))}</div>
                <div class="text-sm text-[#a97a52] mt-1">Method: ${escapeText(payment.method || 'Cash')}</div>
                <div class="text-sm text-[#a97a52] mt-1">Items: ${escapeText(itemsText)}</div>
                <div class="mt-3 rounded-xl border border-[#e6d7c7] bg-[#fbf5ee] px-3 py-2">
                    <div class="text-xs font-semibold text-[#7a4e2f] mb-1">Your Review</div>
                    <div class="text-sm text-[#a97a52]">Rating: ${escapeText(reviewRating)}</div>
                    <div class="text-sm text-[#a97a52] mt-1">Comment: ${escapeText(reviewText)}</div>
                    <div class="text-xs text-[#b48a63] mt-1">Reviewed At: ${escapeText(reviewTime)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function openHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (!modal) {
        alert('History modal not found on this page.');
        return;
    }
    renderHistoryForTable(getCurrentTableNumber());
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.classList.add('modal-open');
}

function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.classList.remove('modal-open');
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
    const tableInput = document.getElementById('table-number');
    const tableNumber = tableInput ? tableInput.value : '';
    const normalizedTableNumber = normalizeTableNumber(tableNumber);

    if (normalizedTableNumber === null) {
        showMessage('Please enter a table number from 1 to 10.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}customer_login.php`, {
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
        clearCustomerSessionFlow(normalizedTableNumber, fallbackUserId);
        localStorage.setItem('user_id', fallbackUserId);
        localStorage.setItem('table_number', String(normalizedTableNumber));
        localStorage.setItem('user_type', 'customer');
        window.location.href = 'menu.html';
    }
}

(async function init() {
    API_BASE = await findApiPath();
    bindEnter(['table-number'], customerLogin);
    initTablePicker(() => {
        customerLogin();
    });

    const historyBtn = document.getElementById('btn-view-history');
    if (historyBtn) historyBtn.addEventListener('click', openHistoryModal);
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', closeHistoryModal);
    const historyModal = document.getElementById('historyModal');
    if (historyModal) {
        historyModal.addEventListener('click', (event) => {
            if (event.target === historyModal) closeHistoryModal();
        });
    }
})();

// Expose for inline click handler on the button.
window.openHistoryModal = openHistoryModal;
