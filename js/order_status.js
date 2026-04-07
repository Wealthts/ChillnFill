const STORAGE_KEYS = Object.freeze({
    userId: "user_id",
    tableNumber: "table_number"
});

const API_ENDPOINTS = Object.freeze({
    orders: "/api/orders"
});

const PAGE_PATHS = Object.freeze({
    payment: "payment.html"
});

const REFRESH_INTERVAL_MS = 5000;

const state = {
    orders: []
};

function getCurrentSessionId() {
    return localStorage.getItem(STORAGE_KEYS.userId) || "";
}

function getCurrentTableNumber() {
    return localStorage.getItem(STORAGE_KEYS.tableNumber) || "";
}

function customerApiHeaders(extra = {}) {
    const headers = { ...extra };
    const sessionId = getCurrentSessionId();
    const tableNumber = getCurrentTableNumber();

    if (sessionId) headers["X-Customer-Session-Id"] = sessionId;
    if (tableNumber) headers["X-Customer-Table-Number"] = tableNumber;

    return headers;
}

function normalizeStatus(status, fallback = "pending") {
    const normalized = String(status || fallback).trim().toLowerCase();
    return normalized || fallback;
}

function normalizeApiOrder(order) {
    const items = Array.isArray(order?.items) ? order.items : [];

    return {
        id: order?.id,
        table: order?.table ?? order?.table_number ?? "-",
        items: items.map((item) => ({
            name: item.name || item.item_name || "-",
            qty: Number(item.qty ?? item.quantity ?? 0),
            price: Number(item.price ?? item.unit_price ?? 0)
        })),
        total: Number(order?.total ?? order?.total_amount ?? 0),
        time: order?.time || order?.created_at || new Date().toISOString(),
        status: order?.status || "pending",
        paymentId: order?.payment_id || order?.paymentId || null,
        paymentStatus: order?.payment_status || order?.paymentStatus || "",
        paymentMethod: order?.payment_method || order?.paymentMethod || "",
        paidAt: order?.paid_at || order?.paidAt || null
    };
}

function getOrderStatusClass(status) {
    const normalized = normalizeStatus(status, "");

    if (["completed", "served", "serving", "done"].includes(normalized)) {
        return "bg-[#dff3e4] text-[#1f7a3d]";
    }

    if (["cooking", "preparing"].includes(normalized)) {
        return "bg-[#e5f0ff] text-[#1b4d8f]";
    }

    if (["cancelled", "canceled"].includes(normalized)) {
        return "bg-[#fde2e2] text-[#b42318]";
    }

    return "bg-[#fff1cc] text-[#9a6a00]";
}

function formatOrderTime(value) {
    const parsed = new Date(value || 0);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString();
}

function getOrderItemsText(order) {
    const items = Array.isArray(order?.items) ? order.items : [];
    return items.length ? items.map((item) => `${item.name} x${item.qty}`).join(", ") : "-";
}

function isCancelledStatus(status) {
    return ["cancelled", "canceled"].includes(normalizeStatus(status, ""));
}

function isPaidOrder(order) {
    return Boolean(
        order?.paymentId ||
        order?.paidAt ||
        normalizeStatus(order?.paymentStatus, "") === "paid"
    );
}

function getOrderPaymentText(order) {
    if (isCancelledStatus(order?.status)) return "Not required";
    if (isPaidOrder(order)) return `Paid (${order.paymentMethod || "Cash"})`;
    return "Waiting for payment";
}

async function loadOrders() {
    const response = await fetch(API_ENDPOINTS.orders, {
        method: "GET",
        credentials: "same-origin",
        headers: customerApiHeaders()
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load orders");
    }

    state.orders = (Array.isArray(result.orders) ? result.orders : [])
        .map(normalizeApiOrder)
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
}

function renderOrderStatus() {
    const container = document.getElementById("orderStatusContainer");
    if (!container) return;

    if (!state.orders.length) {
        container.innerHTML = `<div class="text-center py-5 text-[#a97a52]">No orders found</div>`;
        return;
    }

    container.innerHTML = state.orders.map((order) => `
        <div class="rounded-2xl border border-[#e6d7c7] bg-[#fffaf5] p-4 mb-3">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div class="font-bold text-[#5f4028]">Order #${order.id}</div>
                <div class="px-3 py-1 rounded-full text-xs font-bold ${getOrderStatusClass(order.status)}">
                    ${String(order.status || "pending").toUpperCase()}
                </div>
            </div>
            <div class="text-sm text-[#a97a52]">Table: ${order.table || "-"}</div>
            <div class="text-sm text-[#a97a52] mt-1">Time: ${formatOrderTime(order.time)}</div>
            <div class="text-sm text-[#a97a52] mt-1">Items: ${getOrderItemsText(order)}</div>
            <div class="text-sm text-[#a97a52] mt-1">Payment: ${getOrderPaymentText(order)}</div>
            <div class="text-sm font-semibold text-[#7a4e2f] mt-2">Total: ${order.total || 0} Baht</div>
        </div>
    `).join("");
}

async function refreshAndRenderOrderStatus() {
    try {
        await loadOrders();
        renderOrderStatus();
    } catch (error) {
        const container = document.getElementById("orderStatusContainer");
        if (container) {
            container.innerHTML = `<div class="text-center py-5 text-[#a97a52]">${error.message || "Unable to load orders"}</div>`;
        }
    }
}

function bindGoToPaymentButton() {
    document.getElementById("goToPaymentBtn")?.addEventListener("click", () => {
        window.location.href = PAGE_PATHS.payment;
    });
}

function initOrderStatusPage() {
    bindGoToPaymentButton();
    refreshAndRenderOrderStatus();
    window.setInterval(refreshAndRenderOrderStatus, REFRESH_INTERVAL_MS);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOrderStatusPage);
} else {
    initOrderStatusPage();
}
