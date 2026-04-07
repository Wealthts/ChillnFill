const STORAGE_KEYS = Object.freeze({
    userId: "user_id",
    tableNumber: "table_number",
    userType: "user_type",
    cart: "cart",
    cartOwnerId: "cart_owner_id"
});

const PAGE_PATHS = Object.freeze({
    menu: "menu.html"
});

const API_ENDPOINTS = Object.freeze({
    session: "session",
    customerLogin: "customer/login",
    customerHistory: "customer/history"
});

const UI_IDS = Object.freeze({
    messageContainer: "message-container",
    tableNumberInput: "table-number",
    viewHistoryButton: "btn-view-history",
    closeHistoryButton: "closeHistoryBtn",
    historyModal: "historyModal",
    historyContainer: "historyContainer"
});

const state = {
    apiBaseUrl: ""
};

function getById(id) {
    return document.getElementById(id);
}

function normalizeApiBase(path) {
    if (!path) return "";
    return path.endsWith("/") ? path : `${path}/`;
}

function getApiBaseFromMeta() {
    const meta = document.querySelector('meta[name="api-base"]');
    const raw = String(meta?.content || "").trim();
    if (!raw) return "";

    if (raw.startsWith("http://") || raw.startsWith("https://")) {
        return normalizeApiBase(raw);
    }

    return normalizeApiBase(window.location.origin + raw);
}

async function isApiBaseAvailable(base) {
    const normalizedBase = normalizeApiBase(base);

    try {
        const response = await fetch(`${normalizedBase}${API_ENDPOINTS.session}`, { method: "GET" });
        const contentType = String(response.headers.get("content-type") || "");
        return response.ok && contentType.includes("application/json");
    } catch {
        return false;
    }
}

async function findApiBase() {
    const candidates = [
        getApiBaseFromMeta(),
        normalizeApiBase(window.location.origin + "/api/"),
        "http://localhost:3000/api/",
        "http://127.0.0.1:3000/api/"
    ].filter(Boolean);

    const tested = new Set();
    for (const candidate of candidates) {
        const normalized = normalizeApiBase(candidate);
        if (tested.has(normalized)) continue;
        tested.add(normalized);

        if (await isApiBaseAvailable(normalized)) {
            return normalized;
        }
    }

    return normalizeApiBase(window.location.origin + "/api/");
}

async function parseJsonResponse(response) {
    const contentType = String(response.headers.get("content-type") || "");
    if (!contentType.includes("application/json")) {
        const textBody = await response.text();
        throw new Error(textBody || `API returned status ${response.status}`);
    }

    return response.json();
}

function showMessage(text, type = "error") {
    const container = getById(UI_IDS.messageContainer);
    if (!container) {
        window.alert(text);
        return;
    }

    const variantClass = type === "success" ? "alert-success" : "alert-error";
    container.innerHTML = `<div role="alert" class="alert ${variantClass} text-sm font-medium">${text}</div>`;

    window.setTimeout(() => {
        if (container.textContent?.includes(text)) {
            container.innerHTML = "";
        }
    }, 3000);
}

function readStorageJson(value, fallback) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderStars(rating) {
    const score = Math.max(0, Math.min(5, Number(rating) || 0));
    return `${"★".repeat(score)}${"☆".repeat(5 - score)}`;
}

function formatDateTime(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
}

function normalizeTableNumber(value) {
    const parsed = Number.parseInt(String(value || "").trim(), 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) return null;
    return parsed;
}

function normalizeTableKey(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const digitsOnly = raw.replace(/\D+/g, "");
    return digitsOnly || raw.toLowerCase();
}

function readValue(id) {
    return String(getById(id)?.value || "").trim();
}

function getCurrentTableNumber() {
    return localStorage.getItem(STORAGE_KEYS.tableNumber) || readValue(UI_IDS.tableNumberInput);
}

function persistCustomerSession(userId, tableNumber) {
    localStorage.setItem(STORAGE_KEYS.userId, String(userId || ""));
    localStorage.setItem(STORAGE_KEYS.tableNumber, String(tableNumber || ""));
    localStorage.setItem(STORAGE_KEYS.userType, "customer");
}

function resetCustomerClientState() {
    localStorage.removeItem(STORAGE_KEYS.cart);
    localStorage.removeItem(STORAGE_KEYS.cartOwnerId);
}

function getPaymentStatusClass(status) {
    const normalized = String(status || "paid").toLowerCase();
    if (normalized === "paid") return "bg-[#e8f7ee] text-[#2f7a4f]";
    if (normalized === "pending") return "bg-[#fff4e8] text-[#a96a2a]";
    return "bg-[#efe4d8] text-[#7a4e2f]";
}

function getPaymentStatusLabel(status) {
    const normalized = String(status || "paid").toLowerCase();
    if (normalized === "pending") return "Pending";
    if (normalized === "paid") return "Paid";
    return normalized ? `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}` : "Paid";
}

function getReviewsByPaymentId(paymentId, reviews) {
    const targetId = String(paymentId || "");
    return reviews
        .filter((review) => String(review.paymentId || review.payment_id || "") === targetId)
        .sort((a, b) => new Date(b.time || b.created_at || 0) - new Date(a.time || a.created_at || 0));
}

function renderHistory(tableNumber, payments, reviews) {
    const container = getById(UI_IDS.historyContainer);
    if (!container) return;

    const resolvedTable = String(tableNumber || getCurrentTableNumber() || "").trim();
    const normalizedTable = normalizeTableKey(resolvedTable);

    if (!normalizedTable) {
        container.innerHTML = `
            <div class="text-center py-5 text-[#a97a52]">
                Please enter your table number first.
            </div>
        `;
        return;
    }

    if (!payments.length) {
        container.innerHTML = `
            <div class="text-center py-5 text-[#a97a52]">
                No payment history for table ${escapeHtml(resolvedTable)}
            </div>
        `;
        return;
    }

    container.innerHTML = payments.map((payment) => {
        const orderLabel = Array.isArray(payment.orderIds) && payment.orderIds.length
            ? payment.orderIds.join(", ")
            : (payment.orderId || payment.order_id || "-");

        const itemsText = Array.isArray(payment.items) && payment.items.length
            ? payment.items.map((item) => `${item.name || item.item_name || "-"} x${Number(item.qty ?? item.quantity ?? 0)}`).join(", ")
            : "-";

        const paymentReviews = getReviewsByPaymentId(payment.id, reviews);
        const latestReview = paymentReviews[0] || null;

        return `
            <div class="rounded-2xl border border-[#e6d7c7] bg-[#fffaf5] p-4 mb-3">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div class="font-bold text-[#5f4028]">Table ${escapeHtml(payment.table || payment.table_number || resolvedTable || "-")}</div>
                    <div class="px-3 py-1 rounded-full text-xs font-bold ${getPaymentStatusClass(payment.status)}">
                        ${escapeHtml(getPaymentStatusLabel(payment.status))}
                    </div>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-3 mb-1">
                    <div class="text-sm text-[#a97a52]">Order: ${escapeHtml(orderLabel)}</div>
                    <div class="text-lg font-extrabold text-[#7a4e2f]">${escapeHtml(payment.amount)} Baht</div>
                </div>
                <div class="text-sm text-[#a97a52]">Date: ${escapeHtml(formatDateTime(payment.time || payment.created_at))}</div>
                <div class="text-sm text-[#a97a52] mt-1">Method: ${escapeHtml(payment.method || "Cash")}</div>
                <div class="text-sm text-[#a97a52] mt-1">Items: ${escapeHtml(itemsText)}</div>
                <div class="mt-3 rounded-xl border border-[#e6d7c7] bg-[#fbf5ee] px-3 py-2">
                    <div class="text-xs font-semibold text-[#7a4e2f] mb-1">Review</div>
                    <div class="text-sm text-[#a97a52]">Rating: ${escapeHtml(latestReview ? renderStars(latestReview.rating) : "Not rated")}</div>
                    <div class="text-sm text-[#a97a52] mt-1">Comment: ${escapeHtml(latestReview?.comment || "No review yet")}</div>
                    <div class="text-xs text-[#b48a63] mt-1">Reviewed At: ${escapeHtml(formatDateTime(latestReview?.time || latestReview?.created_at))}</div>
                </div>
            </div>
        `;
    }).join("");
}

function openHistoryModal() {
    const modal = getById(UI_IDS.historyModal);
    if (!modal) return;

    modal.classList.remove("hidden");
    modal.classList.add("flex", "modal-open");
}

function closeHistoryModal() {
    const modal = getById(UI_IDS.historyModal);
    if (!modal) return;

    modal.classList.add("hidden");
    modal.classList.remove("flex", "modal-open");
}

async function loadHistory() {
    const normalizedTableNumber = normalizeTableNumber(readValue(UI_IDS.tableNumberInput) || getCurrentTableNumber());
    if (normalizedTableNumber === null) {
        renderHistory("", [], []);
        return;
    }

    try {
        const response = await fetch(`${state.apiBaseUrl}${API_ENDPOINTS.customerHistory}?table_number=${encodeURIComponent(normalizedTableNumber)}`, {
            method: "GET"
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load history");
        }

        renderHistory(
            normalizedTableNumber,
            Array.isArray(data.payments) ? data.payments : [],
            Array.isArray(data.reviews) ? data.reviews : []
        );
    } catch (error) {
        showMessage(error.message || "Unable to load payment/review history");
        renderHistory(normalizedTableNumber, [], []);
    }
}

async function customerLogin() {
    const normalizedTableNumber = normalizeTableNumber(readValue(UI_IDS.tableNumberInput));

    if (normalizedTableNumber === null) {
        showMessage("Please enter a table number from 1 to 10.");
        return;
    }

    try {
        const previousUserId = localStorage.getItem(STORAGE_KEYS.userId) || "";
        const response = await fetch(`${state.apiBaseUrl}${API_ENDPOINTS.customerLogin}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
                table_number: normalizedTableNumber,
                session_id: previousUserId
            })
        });
        const data = await parseJsonResponse(response);

        if (!response.ok || !data.success) {
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }

        resetCustomerClientState();
        persistCustomerSession(data.user_id || "", data.table_number || normalizedTableNumber);
        showMessage(data.message || "Login successful", "success");
        window.setTimeout(() => {
            window.location.href = PAGE_PATHS.menu;
        }, 400);
    } catch (error) {
        showMessage(error.message || "Unable to log in");
    }
}

function setTablePickerButtonStyle(button, isSelected) {
    button.classList.toggle("bg-[#efe4d8]", isSelected);
    button.classList.toggle("text-[#7a4e2f]", isSelected);
    button.classList.toggle("ring-4", isSelected);
    button.classList.toggle("ring-[#d7b58f]", isSelected);
    button.classList.toggle("scale-105", isSelected);
    button.classList.toggle("bg-[#7a4e2f]", !isSelected);
    button.classList.toggle("text-[#f3eadf]", !isSelected);
}

function initTablePicker() {
    const tableInput = getById(UI_IDS.tableNumberInput);
    const tableButtons = document.querySelectorAll(".table-picker-btn[data-table-select]");

    if (!tableInput || !tableButtons.length) return;

    const applySelection = (value) => {
        const selectedTable = normalizeTableNumber(value);
        tableInput.value = selectedTable === null ? "" : String(selectedTable);

        tableButtons.forEach((button) => {
            const isSelected = String(button.dataset.tableSelect || "") === String(selectedTable || "");
            setTablePickerButtonStyle(button, isSelected);
        });
    };

    tableButtons.forEach((button) => {
        button.addEventListener("click", () => {
            applySelection(button.dataset.tableSelect || "");
        });
    });

    applySelection(tableInput.value || getCurrentTableNumber());
}

function bindEnter() {
    const input = getById(UI_IDS.tableNumberInput);
    if (!input) return;

    input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        customerLogin();
    });
}

function bindHistoryEvents() {
    getById(UI_IDS.viewHistoryButton)?.addEventListener("click", async () => {
        openHistoryModal();
        await loadHistory();
    });

    getById(UI_IDS.closeHistoryButton)?.addEventListener("click", closeHistoryModal);

    const historyModal = getById(UI_IDS.historyModal);
    historyModal?.addEventListener("click", (event) => {
        if (event.target === historyModal) {
            closeHistoryModal();
        }
    });
}

async function initCustomerPage() {
    state.apiBaseUrl = await findApiBase();
    initTablePicker();
    bindEnter();
    bindHistoryEvents();
}

window.customerLogin = customerLogin;
window.openHistoryModal = async function openHistoryModalWindow() {
    openHistoryModal();
    await loadHistory();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCustomerPage);
} else {
    initCustomerPage();
}
