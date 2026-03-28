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

function getScopedStorageKey(prefix) {
    const tableNumber = getCurrentTableNumber();
    if (isCustomerSession() && tableNumber) {
        return `${prefix}table_${tableNumber}`;
    }
    return `${prefix}${getCurrentSessionId() || tableNumber || "guest"}`;
}

function getOrderingLockKey() {
    return getScopedStorageKey("ordering_locked_after_review_");
}

function getPendingReviewKey() {
    return getScopedStorageKey("pending_review_payment_");
}

function isOrderingLocked() {
    return localStorage.getItem(getOrderingLockKey()) === "1";
}

function setOrderingLocked(locked) {
    if (locked) {
        localStorage.setItem(getOrderingLockKey(), "1");
        return;
    }
    localStorage.removeItem(getOrderingLockKey());
}

function getPendingReviewPaymentId() {
    return localStorage.getItem(getPendingReviewKey()) || "";
}

function setPendingReviewPaymentId(paymentId) {
    localStorage.setItem(getPendingReviewKey(), String(paymentId));
}

function clearPendingReviewPaymentId() {
    localStorage.removeItem(getPendingReviewKey());
}

function getAllOrders() {
    return safeParseJSON(localStorage.getItem("orders"), []) || [];
}

function saveAllOrders(orders) {
    localStorage.setItem("orders", JSON.stringify(orders));
}

function getAllPayments() {
    return safeParseJSON(localStorage.getItem("payments"), []) || [];
}

function saveAllPayments(payments) {
    localStorage.setItem("payments", JSON.stringify(payments));
}

function getAllReviews() {
    return safeParseJSON(localStorage.getItem("reviews"), []) || [];
}

function saveAllReviews(reviews) {
    localStorage.setItem("reviews", JSON.stringify(reviews));
}

function getCurrentSessionPayments() {
    const payments = getAllPayments();
    const scoped = payments.filter(matchesCurrentSession);
    if (scoped.length > 0) return scoped;

    const tableNumber = getCurrentTableNumber();
    if (!tableNumber) return scoped;
    return payments.filter((payment) => String(payment.table || "") === String(tableNumber));
}

function getCurrentSessionReviews() {
    const reviews = getAllReviews();
    const scoped = reviews.filter(matchesCurrentSession);
    if (scoped.length > 0) return scoped;

    const paymentIdSet = new Set(getCurrentSessionPayments().map((payment) => String(payment.id)));
    if (!paymentIdSet.size) return scoped;
    return reviews.filter((review) => paymentIdSet.has(String(review.paymentId || "")));
}

function getReviewByPaymentId(paymentId) {
    if (!paymentId) return null;
    const target = String(paymentId);
    const matched = getCurrentSessionReviews()
        .filter((review) => String(review.paymentId || "") === target)
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
    return matched[0] || null;
}

function matchesCurrentSession(record) {
    if (!record) return false;

    const sessionId = getCurrentSessionId();
    const tableNumber = getCurrentTableNumber();
    const customerSession = isCustomerSession();

    if (customerSession && tableNumber) {
        if (String(record.table || "") === String(tableNumber)) return true;
    }

    if (sessionId && record.userId) {
        return String(record.userId) === String(sessionId);
    }

    if (sessionId && !record.userId && tableNumber) {
        return String(record.table) === String(tableNumber);
    }

    if (tableNumber) {
        return String(record.table) === String(tableNumber);
    }

    return true;
}

function renderStars(rating) {
    const value = Math.max(0, Math.min(5, Number(rating) || 0));
    const filled = "★".repeat(value);
    const empty = "☆".repeat(5 - value);
    return `${filled}${empty}`;
}

function isServedStatus(status) {
    const normalized = String(status || "").toLowerCase();
    return normalized === "serving" || normalized === "served" || normalized === "completed" || normalized === "done";
}

function isCancelledStatus(status) {
    const normalized = String(status || "").toLowerCase();
    return normalized === "cancelled" || normalized === "canceled";
}

function isPaidOrder(order) {
    return Boolean(order && (order.paymentId || order.paidAt || String(order.paymentStatus || "").toLowerCase() === "paid"));
}

function getOutstandingOrders() {
    return getAllOrders().filter((order) => matchesCurrentSession(order) && !isPaidOrder(order) && !isCancelledStatus(order.status));
}

function areOrdersReadyForPayment(orders) {
    return orders.length > 0 && orders.every((order) => isServedStatus(order.status));
}

function getOrderItemsText(order) {
    const itemsArray = Array.isArray(order.items) ? order.items : [];
    if (!itemsArray.length) return "-";
    return itemsArray.map((item) => `${item.name} x${item.qty}`).join(", ");
}

function buildPaymentContext(orders) {
    const normalizedOrders = [...orders].sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));
    const items = normalizedOrders.flatMap((order) => {
        const sourceItems = Array.isArray(order.items) ? order.items : [];
        return sourceItems.map((item) => ({
            name: item.name,
            qty: item.qty,
            price: item.price || 0,
            orderId: order.id
        }));
    });

    return {
        orders: normalizedOrders,
        items,
        orderIds: normalizedOrders.map((order) => order.id),
        total: normalizedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
    };
}

let currentPaymentContext = null;
let currentPaymentMethod = "";
let currentPaymentId = "";
let currentRating = 0;

const paymentNotice = document.getElementById("paymentNotice");
const paymentSummary = document.getElementById("paymentSummary");
const confirmPaymentBtn = document.getElementById("confirmPaymentBtn");
const reviewCard = document.getElementById("reviewCard");
const reviewSummaryText = document.getElementById("reviewSummaryText");
const reviewTextarea = document.getElementById("reviewTextarea");
const submitReviewBtn = document.getElementById("submitReviewBtn");
const paymentTableText = document.getElementById("paymentTableText");
const paymentHistoryList = document.getElementById("paymentHistoryList");

function showNotice(message) {
    if (!paymentNotice) return;
    if (!message) {
        paymentNotice.innerText = "";
        paymentNotice.classList.add("hidden");
        return;
    }
    paymentNotice.innerText = message;
    paymentNotice.classList.remove("hidden");
}

function renderSummary(context) {
    if (!paymentSummary) return;
    if (!context || !context.orders || !context.orders.length) {
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
                <div class="text-sm text-[#a97a52]">${getOrderItemsText(order)}</div>
            </div>
        `).join("")}
    `;
}

function renderPaymentHistory() {
    if (!paymentHistoryList) return;

    const payments = getCurrentSessionPayments().sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

    if (!payments.length) {
        paymentHistoryList.innerHTML = `
            <div class="text-center py-5 text-[#a97a52]">
                No payment history for this session
                <div class="text-xs mt-1">Table: ${getCurrentTableNumber() || "-"}</div>
            </div>
        `;
        return;
    }

    paymentHistoryList.innerHTML = payments.map((payment) => {
        const itemsText = Array.isArray(payment.items) && payment.items.length
            ? payment.items.map((item) => `${item.name} x${item.qty}`).join(", ")
            : "-";
        const review = getReviewByPaymentId(payment.id);
        const reviewTime = review && review.time ? new Date(review.time).toLocaleString() : "-";
        const reviewText = review && review.comment ? review.comment : "No review yet";
        const reviewRating = review ? renderStars(review.rating) : "Not rated";

        return `
            <div class="rounded-[24px] border border-[#e6d7c7] bg-[#fffaf5] p-4">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div class="font-bold text-[#5f4028]">Payment #${payment.id}</div>
                    <div class="text-sm font-semibold text-[#7a4e2f]">${payment.amount} Baht</div>
                </div>
                <div class="text-sm text-[#a97a52]">Date: ${payment.time ? new Date(payment.time).toLocaleString() : "-"}</div>
                <div class="text-sm text-[#a97a52] mt-1">Method: ${payment.method || "Cash"}</div>
                <div class="text-sm text-[#a97a52] mt-1">Items: ${itemsText}</div>
                <div class="mt-3 rounded-xl border border-[#e6d7c7] bg-[#fbf5ee] px-3 py-2">
                    <div class="text-xs font-semibold text-[#7a4e2f] mb-1">Your Review</div>
                    <div class="text-sm text-[#a97a52]">Rating: ${reviewRating}</div>
                    <div class="text-sm text-[#a97a52] mt-1">Comment: ${reviewText}</div>
                    <div class="text-xs text-[#b48a63] mt-1">Reviewed At: ${reviewTime}</div>
                </div>
            </div>
        `;
    }).join("");
}

function showReviewCard(message) {
    if (!reviewCard) return;
    if (reviewSummaryText) reviewSummaryText.innerText = message;
    reviewCard.classList.remove("hidden");
}

function confirmPayment() {
    if (!currentPaymentContext || !currentPaymentContext.orders.length) {
        showNotice("No unpaid orders for this session");
        return;
    }

    if (!currentPaymentMethod) {
        showNotice("Please choose a payment method");
        return;
    }

    const paymentId = Date.now();
    const now = new Date().toISOString();
    const orderIdSet = new Set(currentPaymentContext.orderIds.map((orderId) => String(orderId)));

    const paymentRecord = {
        id: paymentId,
        orderId: currentPaymentContext.orderIds.join(", "),
        orderIds: [...currentPaymentContext.orderIds],
        table: getCurrentTableNumber() || "-",
        userId: getCurrentSessionId() || "",
        items: currentPaymentContext.items.map((item) => ({
            name: item.name,
            qty: item.qty,
            price: item.price || 0,
            orderId: item.orderId
        })),
        amount: currentPaymentContext.total,
        time: now,
        method: currentPaymentMethod,
        status: "paid"
    };

    const payments = getAllPayments();
    payments.push(paymentRecord);
    saveAllPayments(payments);

    const updatedOrders = getAllOrders().map((order) => {
        if (!orderIdSet.has(String(order.id))) return order;
        return {
            ...order,
            paymentId,
            paymentStatus: "paid",
            paymentMethod: currentPaymentMethod,
            paidAt: now
        };
    });
    saveAllOrders(updatedOrders);

    currentPaymentId = String(paymentId);
    setPendingReviewPaymentId(paymentId);
    showNotice("Payment completed. Please leave a review.");
    showReviewCard(`Payment received: ${paymentRecord.amount} Baht via ${paymentRecord.method}. Please leave a review to finish this session.`);

    if (confirmPaymentBtn) {
        confirmPaymentBtn.disabled = true;
        confirmPaymentBtn.classList.add("opacity-60", "cursor-not-allowed");
    }

    renderPaymentHistory();
}

function submitReview() {
    const reviewText = reviewTextarea ? reviewTextarea.value.trim() : "";

    if (!reviewText && currentRating === 0) {
        showNotice("Please add a rating or review before submitting");
        return;
    }

    const now = new Date().toISOString();
    const paymentId = currentPaymentId || getPendingReviewPaymentId() || "";

    const reviews = getAllReviews();
    reviews.push({
        rating: currentRating || 0,
        comment: reviewText,
        time: now,
        table: getCurrentTableNumber() || "-",
        userId: getCurrentSessionId() || "",
        paymentId: paymentId || null
    });
    saveAllReviews(reviews);

    if (paymentId) {
        const updatedPayments = getAllPayments().map((payment) => {
            if (String(payment.id) !== String(paymentId)) return payment;
            return {
                ...payment,
                reviewSubmitted: true,
                reviewSubmittedAt: now
            };
        });
        saveAllPayments(updatedPayments);

        const updatedOrders = getAllOrders().map((order) => {
            if (String(order.paymentId) !== String(paymentId)) return order;
            return {
                ...order,
                reviewSubmittedAt: now
            };
        });
        saveAllOrders(updatedOrders);
    }

    setOrderingLocked(true);
    clearPendingReviewPaymentId();
    showNotice("Thanks for your review");

    if (submitReviewBtn) {
        submitReviewBtn.disabled = true;
        submitReviewBtn.classList.add("opacity-60", "cursor-not-allowed");
    }

    renderPaymentHistory();
}

function initPaymentPage() {
    const table = getCurrentTableNumber();
    if (paymentTableText) {
        paymentTableText.innerText = table ? `Table ${table}` : "Table not found";
    }

    if (isOrderingLocked()) {
        showNotice("Payment and review are complete for this session.");
        if (confirmPaymentBtn) {
            confirmPaymentBtn.disabled = true;
            confirmPaymentBtn.classList.add("opacity-60", "cursor-not-allowed");
        }
        const pending = getPendingReviewPaymentId();
        if (pending) {
            currentPaymentId = pending;
            showReviewCard("Please leave a review to finish this session.");
        }
        return;
    }

    const pendingReviewId = getPendingReviewPaymentId();
    if (pendingReviewId) {
        currentPaymentId = pendingReviewId;
        showNotice("Payment already completed. Please leave a review.");
        showReviewCard("Please leave a review to finish this session.");
        if (confirmPaymentBtn) {
            confirmPaymentBtn.disabled = true;
            confirmPaymentBtn.classList.add("opacity-60", "cursor-not-allowed");
        }
        return;
    }

    const outstandingOrders = getOutstandingOrders();
    if (!outstandingOrders.length) {
        showNotice("No unpaid orders for this session");
        if (confirmPaymentBtn) {
            confirmPaymentBtn.disabled = true;
            confirmPaymentBtn.classList.add("opacity-60", "cursor-not-allowed");
        }
        return;
    }

    if (!areOrdersReadyForPayment(outstandingOrders)) {
        showNotice("Payment is available after all food is served");
        if (confirmPaymentBtn) {
            confirmPaymentBtn.disabled = true;
            confirmPaymentBtn.classList.add("opacity-60", "cursor-not-allowed");
        }
        renderSummary(buildPaymentContext(outstandingOrders));
        return;
    }

    currentPaymentContext = buildPaymentContext(outstandingOrders);
    renderSummary(currentPaymentContext);
}

document.querySelectorAll(".payment-method-btn").forEach((button) => {
    button.addEventListener("click", () => {
        currentPaymentMethod = button.dataset.method || "";
        document.querySelectorAll(".payment-method-btn").forEach((item) => {
            item.classList.remove("border-[#7a4e2f]", "bg-[#fff4e8]", "ring-2", "ring-[#7a4e2f]/20");
        });
        button.classList.add("border-[#7a4e2f]", "bg-[#fff4e8]", "ring-2", "ring-[#7a4e2f]/20");
    });
});

document.querySelectorAll("#starRating .star").forEach((star) => {
    star.addEventListener("click", () => {
        currentRating = parseInt(star.dataset.value || "0", 10);
        document.querySelectorAll("#starRating .star").forEach((item, index) => {
            if (index < currentRating) {
                item.classList.add("text-[#f5b342]");
            } else {
                item.classList.remove("text-[#f5b342]");
            }
        });
    });
});

if (confirmPaymentBtn) confirmPaymentBtn.addEventListener("click", confirmPayment);
if (submitReviewBtn) submitReviewBtn.addEventListener("click", submitReview);

initPaymentPage();
renderPaymentHistory();
