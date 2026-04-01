const $ = (id) => document.getElementById(id);
const paymentNotice = $("paymentNotice");
const paymentSummary = $("paymentSummary");
const confirmPaymentBtn = $("confirmPaymentBtn");
const reviewCard = $("reviewCard");
const reviewSummaryText = $("reviewSummaryText");
const reviewTextarea = $("reviewTextarea");
const submitReviewBtn = $("submitReviewBtn");
const paymentTableText = $("paymentTableText");

const sessionId = () => localStorage.getItem("user_id") || "";
const tableNumber = () => localStorage.getItem("table_number") || "";
const isCustomer = () => (localStorage.getItem("user_type") || "").toLowerCase() === "customer";
const read = (key, fallback = []) => {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const scopeKey = (prefix) => {
    const table = tableNumber();
    if (isCustomer() && table) return `${prefix}table_${table}`;
    return `${prefix}${sessionId() || table || "guest"}`;
};

const state = {
    context: null,
    method: "",
    paymentId: "",
    rating: 0
};

function notice(message = "") {
    if (!paymentNotice) return;
    paymentNotice.innerText = message;
    paymentNotice.classList.toggle("hidden", !message);
}

function toggleButton(button, disabled) {
    if (!button) return;
    button.disabled = disabled;
    button.classList.toggle("opacity-60", disabled);
    button.classList.toggle("cursor-not-allowed", disabled);
}

function setOrderingLocked(locked) {
    const key = scopeKey("ordering_locked_after_review_");
    if (locked) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
}

function isOrderingLocked() {
    return localStorage.getItem(scopeKey("ordering_locked_after_review_")) === "1";
}

function getPendingReviewPaymentId() {
    return localStorage.getItem(scopeKey("pending_review_payment_")) || "";
}

function setPendingReviewPaymentId(id) {
    localStorage.setItem(scopeKey("pending_review_payment_"), String(id));
}

function clearPendingReviewPaymentId() {
    localStorage.removeItem(scopeKey("pending_review_payment_"));
}

function matchesCurrentSession(record) {
    if (!record) return false;

    if (sessionId() && record.userId) {
        return String(record.userId) === String(sessionId());
    }

    if (sessionId() && !record.userId) {
        return false;
    }

    if (tableNumber()) {
        return String(record.table || "") === String(tableNumber());
    }

    return true;
}

function isPaid(order) {
    return Boolean(order?.paymentId || order?.paidAt || String(order?.paymentStatus || "").toLowerCase() === "paid");
}

function isCancelled(status) {
    return ["cancelled", "canceled"].includes(String(status || "").toLowerCase());
}

function isServed(status) {
    return ["serving", "served", "completed", "done"].includes(String(status || "").toLowerCase());
}

function getOutstandingOrders() {
    return read("orders").filter((order) => matchesCurrentSession(order) && !isPaid(order) && !isCancelled(order.status));
}

function buildContext(orders) {
    const sorted = [...orders].sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
    return {
        orders: sorted,
        orderIds: sorted.map((order) => order.id),
        items: sorted.flatMap((order) => (order.items || []).map((item) => ({
            name: item.name,
            qty: item.qty,
            price: item.price || 0,
            orderId: order.id
        }))),
        total: sorted.reduce((sum, order) => sum + Number(order.total || 0), 0)
    };
}

function itemText(order) {
    return (order.items || []).map((item) => `${item.name} x${item.qty}`).join(", ") || "-";
}

function renderSummary(context) {
    if (!paymentSummary) return;
    if (!context?.orders?.length) {
        paymentSummary.innerHTML = "";
        return;
    }

    paymentSummary.innerHTML = `
        <div class="rounded-[24px] border border-[#e6d7c7] bg-[#fffaf5] p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div class="text-sm text-[#a97a52]">Orders ready for payment</div>
                    <div class="text-lg font-extrabold text-[#5f4028]">${context.orders.length} order${context.orders.length > 1 ? "s" : ""}</div>
                </div>
                <div class="text-right">
                    <div class="text-sm text-[#a97a52]">Total</div>
                    <div class="text-2xl font-extrabold text-[#7a4e2f]">${context.total} Baht</div>
                </div>
            </div>
        </div>
        ${context.orders.map((order) => `
            <div class="rounded-[24px] border border-[#e6d7c7] bg-[#fffaf5] p-4">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div class="font-bold text-[#5f4028]">Order #${order.id}</div>
                    <div class="text-sm font-semibold text-[#7a4e2f]">${order.total || 0} Baht</div>
                </div>
                <div class="text-sm text-[#a97a52]">${itemText(order)}</div>
            </div>
        `).join("")}
    `;
}

function showReviewCard(message) {
    if (reviewSummaryText) reviewSummaryText.innerText = message;
    reviewCard?.classList.remove("hidden");
}

function confirmPayment() {
    if (!state.context?.orders?.length) return notice("No unpaid orders for this session");
    if (!state.method) return notice("Please choose a payment method");

    const now = new Date().toISOString();
    const paymentId = Date.now();
    const payment = {
        id: paymentId,
        orderId: state.context.orderIds.join(", "),
        orderIds: [...state.context.orderIds],
        table: tableNumber() || "-",
        userId: sessionId() || "",
        items: state.context.items,
        amount: state.context.total,
        time: now,
        method: state.method,
        status: "paid"
    };

    // FIX: Put the new 'payment' at the start of the array instead of the end
    write("payments", [payment, ...read("payments")]);

    write("orders", read("orders").map((order) =>
        state.context.orderIds.includes(order.id)
            ? { ...order, paymentId, paymentStatus: "paid", paymentMethod: state.method, paidAt: now }
            : order
    ));

    state.paymentId = String(paymentId);
    setPendingReviewPaymentId(paymentId);
    toggleButton(confirmPaymentBtn, true);
    notice("Payment completed. Please leave a review.");
    showReviewCard(`Payment received: ${payment.amount} Baht via ${payment.method}. Please leave a review to finish this session.`);
}

function submitReview() {
    const comment = reviewTextarea?.value.trim() || "";
    if (!comment && !state.rating) return notice("Please add a rating or review before submitting");

    const now = new Date().toISOString();
    const paymentId = state.paymentId || getPendingReviewPaymentId();
    const review = {
        rating: state.rating || 0,
        comment,
        time: now,
        table: tableNumber() || "-",
        userId: sessionId() || "",
        paymentId: paymentId || null
    };

    // FIX: Put the new 'review' at the start of the array instead of the end
    write("reviews", [review, ...read("reviews")]);

    if (paymentId) {
        write("payments", read("payments").map((payment) =>
            String(payment.id) === String(paymentId)
                ? { ...payment, reviewSubmitted: true, reviewSubmittedAt: now }
                : payment
        ));
        write("orders", read("orders").map((order) =>
            String(order.paymentId) === String(paymentId)
                ? { ...order, reviewSubmittedAt: now }
                : order
        ));
    }

    setOrderingLocked(true);
    clearPendingReviewPaymentId();
    toggleButton(submitReviewBtn, true);
    notice("Thanks for your review");
}

function init() {
    if (paymentTableText) {
        paymentTableText.innerText = tableNumber() ? `Table ${tableNumber()}` : "Table not found";
    }

    if (isOrderingLocked()) {
        toggleButton(confirmPaymentBtn, true);
        notice("Payment and review are complete for this session.");
        if (getPendingReviewPaymentId()) showReviewCard("Please leave a review to finish this session.");
        return;
    }

    const pendingReviewId = getPendingReviewPaymentId();
    if (pendingReviewId) {
        state.paymentId = pendingReviewId;
        toggleButton(confirmPaymentBtn, true);
        notice("Payment already completed. Please leave a review.");
        showReviewCard("Please leave a review to finish this session.");
        return;
    }

    const orders = getOutstandingOrders();
    if (!orders.length) {
        toggleButton(confirmPaymentBtn, true);
        return notice("No unpaid orders for this session");
    }

    state.context = buildContext(orders);
    renderSummary(state.context);

    if (!orders.every((order) => isServed(order.status))) {
        toggleButton(confirmPaymentBtn, true);
        return notice("Payment is available after all food is served");
    }
}

document.querySelectorAll(".payment-method-btn").forEach((button) => {
    button.addEventListener("click", () => {
        state.method = button.dataset.method || "";
        document.querySelectorAll(".payment-method-btn").forEach((item) => {
            item.classList.remove("border-[#7a4e2f]", "bg-[#fff4e8]", "ring-2", "ring-[#7a4e2f]/20");
        });
        button.classList.add("border-[#7a4e2f]", "bg-[#fff4e8]", "ring-2", "ring-[#7a4e2f]/20");
    });
});

document.querySelectorAll("#starRating .star").forEach((star) => {
    star.addEventListener("click", () => {
        state.rating = Number(star.dataset.value || 0);
        document.querySelectorAll("#starRating .star").forEach((item, index) => {
            item.classList.toggle("text-[#f5b342]", index < state.rating);
        });
    });
});

confirmPaymentBtn?.addEventListener("click", confirmPayment);
submitReviewBtn?.addEventListener("click", submitReview);
init();
