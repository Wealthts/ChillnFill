function safeParseJSON(value, fallback) {
    try {
        return JSON.parse(value);
    } catch (err) {
        return fallback;
    }
}

function getCurrentSessionId() {
    return localStorage.getItem("user_id") || "";
}

function getCurrentTableNumber() {
    return localStorage.getItem("table_number") || "";
}

function isCustomerSession() {
    return String(localStorage.getItem("user_type") || "").toLowerCase() === "customer";
}

function matchesCurrentSession(record) {
    if (!record) return false;

    const sessionId = getCurrentSessionId();
    const tableNumber = getCurrentTableNumber();

    if (sessionId && record.userId) {
        return String(record.userId) === String(sessionId);
    }

    if (sessionId && !record.userId) {
        return false;
    }

    if (tableNumber) {
        return String(record.table || "") === String(tableNumber);
    }

    return true;
}

function getOrderStatusClass(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "completed" || normalized === "served" || normalized === "serving" || normalized === "done") {
        return "bg-[#dff3e4] text-[#1f7a3d]";
    }
    if (normalized === "cooking" || normalized === "preparing") return "bg-[#e5f0ff] text-[#1b4d8f]";
    if (normalized === "ready") return "bg-[#eaf7ff] text-[#0f5d7f]";
    if (normalized === "cancelled" || normalized === "canceled") return "bg-[#fde2e2] text-[#b42318]";
    return "bg-[#fff1cc] text-[#9a6a00]";
}

function formatOrderTime(isoString) {
    if (!isoString) return "-";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleString();
}

function getOrderItemsText(order) {
    const itemsArray = Array.isArray(order.items) ? order.items : [];
    if (itemsArray.length) {
        return itemsArray.map((item) => `${item.name} x${item.qty}`).join(", ");
    }
    return typeof order.items === "string" ? order.items : "-";
}

function isCancelledStatus(status) {
    const normalized = String(status || "").toLowerCase();
    return normalized === "cancelled" || normalized === "canceled";
}

function isPaidOrder(order) {
    return Boolean(order && (order.paymentId || order.paidAt || String(order.paymentStatus || "").toLowerCase() === "paid"));
}

function getOrderPaymentText(order) {
    if (isCancelledStatus(order.status)) return "Not required";
    if (isPaidOrder(order)) return `Paid (${order.paymentMethod || "Cash"})`;
    return "Waiting for payment";
}

function renderOrderStatus() {
    const container = document.getElementById("orderStatusContainer");
    if (!container) return;

    const orders = (safeParseJSON(localStorage.getItem("orders"), []) || [])
        .filter(matchesCurrentSession)
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

    if (!orders.length) {
        container.innerHTML = `<div class="text-center py-5 text-[#a97a52]">No orders found</div>`;
        return;
    }

    container.innerHTML = orders.map((order) => `
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

window.addEventListener("storage", (event) => {
    if ((event.key || "") === "orders" || (event.key || "") === "payments") {
        renderOrderStatus();
    }
});

renderOrderStatus();

const goToPaymentBtn = document.getElementById("goToPaymentBtn");
if (goToPaymentBtn) {
    goToPaymentBtn.addEventListener("click", () => {
        window.location.href = "payment.html";
    });
}
