const STORAGE_KEYS = Object.freeze({
    userId: "user_id",
    tableNumber: "table_number",
    userType: "user_type",
    cart: "cart",
    cartOwnerId: "cart_owner_id"
});

const API_ENDPOINTS = Object.freeze({
    session: "/api/session",
    customerLogin: "/api/customer/login",
    customerState: "/api/customer/state",
    orders: "/api/orders",
    payments: "/api/payments",
    reviews: "/api/reviews"
});

const UI_IDS = Object.freeze({
    paymentNotice: "paymentNotice",
    paymentSummary: "paymentSummary",
    confirmPaymentButton: "confirmPaymentBtn",
    reviewCard: "reviewCard",
    reviewSummaryText: "reviewSummaryText",
    reviewTextarea: "reviewTextarea",
    submitReviewButton: "submitReviewBtn",
    paymentTableText: "paymentTableText"
});

const REFRESH_INTERVAL_MS = 5000;

const pageUi = {
    paymentNotice: null,
    paymentSummary: null,
    confirmPaymentButton: null,
    reviewCard: null,
    reviewSummaryText: null,
    reviewTextarea: null,
    submitReviewButton: null,
    paymentTableText: null
};

const state = {
    customerState: {
        orderingAllowed: true,
        pendingReview: false,
        pendingReviewPaymentId: "",
        lockedAfterReview: false
    },
    orders: [],
    payments: [],
    reviews: [],
    paymentMethod: "",
    paymentContext: null,
    reviewPaymentId: "",
    rating: 0
};

function getById(id) {
    return document.getElementById(id);
}

function initUiRefs() {
    pageUi.paymentNotice = getById(UI_IDS.paymentNotice);
    pageUi.paymentSummary = getById(UI_IDS.paymentSummary);
    pageUi.confirmPaymentButton = getById(UI_IDS.confirmPaymentButton);
    pageUi.reviewCard = getById(UI_IDS.reviewCard);
    pageUi.reviewSummaryText = getById(UI_IDS.reviewSummaryText);
    pageUi.reviewTextarea = getById(UI_IDS.reviewTextarea);
    pageUi.submitReviewButton = getById(UI_IDS.submitReviewButton);
    pageUi.paymentTableText = getById(UI_IDS.paymentTableText);
}

function getSessionId() {
    return localStorage.getItem(STORAGE_KEYS.userId) || "";
}

function getTableNumber() {
    return localStorage.getItem(STORAGE_KEYS.tableNumber) || "";
}

function customerApiHeaders(extra = {}) {
    const headers = { ...extra };
    const sessionId = getSessionId();
    const tableNumber = getTableNumber();

    if (sessionId) headers["X-Customer-Session-Id"] = sessionId;
    if (tableNumber) headers["X-Customer-Table-Number"] = tableNumber;

    return headers;
}

function normalizeStatus(status, fallback = "") {
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
            price: Number(item.price ?? item.unit_price ?? 0),
            status: item.status || "pending"
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

function normalizeApiPayment(payment) {
    return {
        id: payment?.id,
        paymentReference: payment?.paymentReference || payment?.payment_reference || "",
        orderIds: Array.isArray(payment?.orderIds) ? payment.orderIds : (Array.isArray(payment?.order_ids) ? payment.order_ids : []),
        table: payment?.table ?? payment?.table_number ?? "-",
        amount: Number(payment?.amount || 0),
        time: payment?.time || payment?.created_at || new Date().toISOString(),
        method: payment?.method || "",
        status: payment?.status || "paid",
        items: Array.isArray(payment?.items) ? payment.items.map((item) => ({
            name: item.name || item.item_name || "-",
            qty: Number(item.qty ?? item.quantity ?? 0),
            price: Number(item.price ?? item.unit_price ?? 0)
        })) : [],
        reviewSubmittedAt: payment?.reviewSubmittedAt || payment?.review_submitted_at || null
    };
}

function normalizeApiReview(review) {
    return {
        id: review?.id,
        paymentId: review?.paymentId || review?.payment_id || null,
        rating: Number(review?.rating || 0),
        comment: review?.comment || "",
        time: review?.time || review?.created_at || new Date().toISOString()
    };
}

function formatDateTime(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
}

function toggleButton(button, disabled) {
    if (!button) return;

    button.disabled = disabled;
    button.classList.toggle("opacity-60", disabled);
    button.classList.toggle("cursor-not-allowed", disabled);
}

function showNotice(message = "") {
    if (!pageUi.paymentNotice) return;

    pageUi.paymentNotice.innerText = message;
    pageUi.paymentNotice.classList.toggle("hidden", !message);
}

function isElementVisible(element) {
    return Boolean(element && !element.classList.contains("hidden"));
}

function showReviewCard(message, review = null, options = {}) {
    const keepDraft = Boolean(options.keepDraft);
    const draftComment = typeof options.draftComment === "string" ? options.draftComment : null;
    const draftRating = Number(options.draftRating || 0);

    if (pageUi.reviewSummaryText) {
        pageUi.reviewSummaryText.innerText = message;
    }

    pageUi.reviewCard?.classList.remove("hidden");
    if (!keepDraft) {
        if (pageUi.reviewTextarea) {
            pageUi.reviewTextarea.value = review?.comment || "";
        }
        setStarRating(review?.rating || 0);
        return;
    }

    if (pageUi.reviewTextarea && draftComment !== null) {
        pageUi.reviewTextarea.value = draftComment;
    }
    setStarRating(draftRating || state.rating || 0);
}

function hideReviewCard() {
    pageUi.reviewCard?.classList.add("hidden");
    if (pageUi.reviewTextarea) {
        pageUi.reviewTextarea.value = "";
    }
    setStarRating(0);
}

function isCancelled(status) {
    return ["cancelled", "canceled"].includes(normalizeStatus(status));
}

function isPaidOrder(order) {
    return Boolean(
        order?.paymentId ||
        order?.paidAt ||
        normalizeStatus(order?.paymentStatus) === "paid"
    );
}

function isReadyForPaymentOrder(order) {
    return ["serving", "served", "completed", "done"].includes(normalizeStatus(order?.status));
}

function getOutstandingOrders() {
    return state.orders.filter((order) => !isPaidOrder(order) && !isCancelled(order.status));
}

function buildPaymentContext(orders) {
    const normalizedOrders = [...orders].sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));

    return {
        orders: normalizedOrders,
        orderIds: normalizedOrders.map((order) => order.id),
        total: normalizedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
    };
}

function getOrderItemsText(order) {
    const items = Array.isArray(order?.items)
        ? order.items.filter((item) => !isCancelled(item?.status))
        : [];
    return items.length
        ? items.map((item) => `${item.name} x${item.qty}`).join(", ")
        : "-";
}

function getPaymentById(paymentId) {
    return state.payments.find((payment) => String(payment.id) === String(paymentId)) || null;
}

function getReviewByPaymentId(paymentId) {
    const targetId = String(paymentId || "");
    return state.reviews.find((review) => String(review.paymentId || "") === targetId) || null;
}

async function requestJson(url, options = {}, fallbackMessage = "Request failed") {
    const response = await fetch(url, {
        credentials: "same-origin",
        headers: { ...customerApiHeaders(), ...(options.headers || {}) },
        ...options
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
        throw new Error(result.message || fallbackMessage);
    }

    return result;
}

async function verifyCustomerSession() {
    try {
        const result = await requestJson(API_ENDPOINTS.session, { method: "GET" }, "Session expired");
        return Boolean(result.logged_in && result.user_type === "customer");
    } catch {
        return false;
    }
}

async function restoreCustomerSession() {
    const tableNumber = getTableNumber();
    if (!tableNumber) return false;

    try {
        const result = await requestJson(API_ENDPOINTS.customerLogin, {
            method: "POST",
            headers: customerApiHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                table_number: Number(tableNumber),
                session_id: getSessionId()
            })
        }, "Unable to restore session");

        if (result.user_id) {
            localStorage.setItem(STORAGE_KEYS.userId, String(result.user_id));
        }
        localStorage.setItem(STORAGE_KEYS.tableNumber, String(result.table_number || tableNumber));
        localStorage.setItem(STORAGE_KEYS.userType, "customer");
        return true;
    } catch {
        return false;
    }
}

function resetCustomerClientState() {
    localStorage.removeItem(STORAGE_KEYS.userType);
    localStorage.removeItem(STORAGE_KEYS.cart);
    localStorage.removeItem(STORAGE_KEYS.cartOwnerId);
}

async function refreshData() {
    const [customerState, orders, payments, reviews] = await Promise.all([
        requestJson(API_ENDPOINTS.customerState, { method: "GET" }, "Unable to load customer state"),
        requestJson(API_ENDPOINTS.orders, { method: "GET" }, "Unable to load orders"),
        requestJson(API_ENDPOINTS.payments, { method: "GET" }, "Unable to load payments"),
        requestJson(API_ENDPOINTS.reviews, { method: "GET" }, "Unable to load reviews")
    ]);

    state.customerState = {
        orderingAllowed: Boolean(customerState.ordering_allowed),
        pendingReview: Boolean(customerState.pending_review),
        pendingReviewPaymentId: String(customerState.pending_review_payment_id || ""),
        lockedAfterReview: Boolean(customerState.locked_after_review)
    };
    state.orders = (Array.isArray(orders.orders) ? orders.orders : []).map(normalizeApiOrder);
    state.payments = (Array.isArray(payments.payments) ? payments.payments : []).map(normalizeApiPayment);
    state.reviews = (Array.isArray(reviews.reviews) ? reviews.reviews : []).map(normalizeApiReview);
}

function renderPaidHistory(payments) {
    if (!pageUi.paymentSummary) return;

    if (!payments.length) {
        pageUi.paymentSummary.innerHTML = "";
        return;
    }

    pageUi.paymentSummary.innerHTML = `
        <div class="rounded-[24px] border border-[#e6d7c7] bg-[#fffaf5] p-4">
            <div class="text-sm text-[#a97a52]">Paid history</div>
            <div class="text-lg font-extrabold text-[#5f4028]">${payments.length} payment${payments.length > 1 ? "s" : ""}</div>
        </div>
        ${payments.map((payment) => `
            <div class="rounded-[24px] border border-[#e6d7c7] bg-[#fffaf5] p-4">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div class="font-bold text-[#5f4028]">Payment #${payment.id}</div>
                    <div class="text-right text-sm font-semibold text-[#7a4e2f]">${Number(payment.amount || 0)} Baht</div>
                </div>
                <div class="text-sm text-[#a97a52]">Method: ${String(payment.method || "Cash")}</div>
                <div class="text-sm text-[#a97a52]">Date: ${formatDateTime(payment.time)}</div>
            </div>
        `).join("")}
    `;
}

function renderOutstandingSummary(context) {
    if (!pageUi.paymentSummary) return;

    if (!context?.orders?.length) {
        pageUi.paymentSummary.innerHTML = "";
        return;
    }

    pageUi.paymentSummary.innerHTML = `
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
                    <div class="text-right">
                        <div class="text-xs font-semibold uppercase text-[#a97a52]">${String(order.status || "pending")}</div>
                        <div class="text-sm font-semibold text-[#7a4e2f]">${order.total || 0} Baht</div>
                    </div>
                </div>
                <div class="text-sm text-[#a97a52]">${getOrderItemsText(order)}</div>
            </div>
        `).join("")}
    `;
}

function setPaymentMethodSelection(selectedButton) {
    state.paymentMethod = selectedButton?.dataset.method || "";

    document.querySelectorAll(".payment-method-btn").forEach((button) => {
        const isSelected = button === selectedButton;
        button.classList.toggle("border-[#7a4e2f]", isSelected);
        button.classList.toggle("bg-[#fff4e8]", isSelected);
        button.classList.toggle("ring-2", isSelected);
        button.classList.toggle("ring-[#7a4e2f]/20", isSelected);
    });
}

function setStarRating(score) {
    state.rating = Number(score || 0);

    document.querySelectorAll("#starRating .star").forEach((star, index) => {
        star.classList.toggle("text-[#f5b342]", index < state.rating);
    });
}

async function confirmPayment() {
    if (!state.paymentContext?.orders?.length) {
        showNotice("No unpaid orders for this session");
        return;
    }

    if (!state.paymentMethod) {
        showNotice("Please choose a payment method");
        return;
    }

    toggleButton(pageUi.confirmPaymentButton, true);

    try {
        const result = await requestJson(API_ENDPOINTS.payments, {
            method: "POST",
            headers: customerApiHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                order_ids: state.paymentContext.orderIds,
                method: state.paymentMethod
            })
        }, "Unable to process payment");

        await refreshPaymentPageState();
        state.reviewPaymentId = String(result.payment_id || result.payment?.id || state.customerState.pendingReviewPaymentId || "");
        showNotice("Payment completed. Please leave a review.");
    } catch (error) {
        showNotice(error.message || "Unable to process payment");
        toggleButton(pageUi.confirmPaymentButton, false);
    }
}

async function submitReview() {
    const comment = String(pageUi.reviewTextarea?.value || "").trim();
    if (!comment && !state.rating) {
        showNotice("Please add a rating or review before submitting");
        return;
    }

    const paymentId = state.reviewPaymentId || state.customerState.pendingReviewPaymentId;
    if (!paymentId) {
        showNotice("Payment not found for review");
        return;
    }

    toggleButton(pageUi.submitReviewButton, true);

    try {
        await requestJson(API_ENDPOINTS.reviews, {
            method: "POST",
            headers: customerApiHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                payment_id: paymentId,
                rating: state.rating || 0,
                comment
            })
        }, "Unable to submit review");

        await refreshPaymentPageState();
        showNotice("Thanks for your review");
    } catch (error) {
        showNotice(error.message || "Unable to submit review");
        toggleButton(pageUi.submitReviewButton, false);
    }
}

function bindPaymentMethodButtons() {
    document.querySelectorAll(".payment-method-btn").forEach((button) => {
        button.addEventListener("click", () => {
            setPaymentMethodSelection(button);
        });
    });
}

function bindStarRatingButtons() {
    document.querySelectorAll("#starRating .star").forEach((star) => {
        star.addEventListener("click", () => {
            setStarRating(star.dataset.value);
        });
    });
}

function bindActionButtons() {
    pageUi.confirmPaymentButton?.addEventListener("click", confirmPayment);
    pageUi.submitReviewButton?.addEventListener("click", submitReview);
}

async function refreshPaymentPageState() {
    const previousReviewPaymentId = String(state.reviewPaymentId || "");
    const previousDraftComment = String(pageUi.reviewTextarea?.value || "");
    const previousDraftRating = Number(state.rating || 0);
    const reviewCardVisible = isElementVisible(pageUi.reviewCard);

    await refreshData();

    const paidPayments = [...state.payments]
        .filter((payment) => normalizeStatus(payment.status, "paid") === "paid")
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

    state.paymentContext = null;
    state.paymentMethod = "";
    document.querySelectorAll(".payment-method-btn").forEach((button) => {
        button.classList.remove("border-[#7a4e2f]", "bg-[#fff4e8]", "ring-2", "ring-[#7a4e2f]/20");
    });

    if (state.customerState.lockedAfterReview) {
        toggleButton(pageUi.confirmPaymentButton, true);
        renderPaidHistory(paidPayments);
        hideReviewCard();
        showNotice(
            paidPayments.length
                ? "Payment and review are complete. You can still view payment history below."
                : "Payment and review are complete for this session."
        );
        return;
    }

    if (state.customerState.pendingReview) {
        toggleButton(pageUi.confirmPaymentButton, true);
        renderPaidHistory(paidPayments);
        const pendingReviewPaymentId = String(state.customerState.pendingReviewPaymentId || "");
        const review = getReviewByPaymentId(pendingReviewPaymentId);
        const payment = getPaymentById(pendingReviewPaymentId);
        const keepDraft = reviewCardVisible
            && pendingReviewPaymentId
            && previousReviewPaymentId === pendingReviewPaymentId
            && !review;

        state.reviewPaymentId = pendingReviewPaymentId;
        showReviewCard(
            payment
                ? `Payment received: ${payment.amount} Baht via ${payment.method || "Cash"}. Please leave a review to finish this session.`
                : "Payment completed. Please leave a review to finish this session.",
            review,
            {
                keepDraft,
                draftComment: previousDraftComment,
                draftRating: previousDraftRating
            }
        );
        showNotice("Payment already completed. Please leave a review.");
        return;
    }

    hideReviewCard();

    const outstandingOrders = getOutstandingOrders();
    if (!outstandingOrders.length) {
        toggleButton(pageUi.confirmPaymentButton, true);
        renderPaidHistory(paidPayments);
        showNotice(
            paidPayments.length
                ? "No unpaid orders. You can still view payment history below."
                : "No unpaid orders for this session."
        );
        return;
    }

    const blockedOrders = outstandingOrders.filter((order) => !isReadyForPaymentOrder(order));
    if (blockedOrders.length) {
        toggleButton(pageUi.confirmPaymentButton, true);
        renderOutstandingSummary(buildPaymentContext(outstandingOrders));
        showNotice("Payment is available only when all unpaid orders are in Serving or Completed status.");
        return;
    }

    state.paymentContext = buildPaymentContext(outstandingOrders);
    renderOutstandingSummary(state.paymentContext);
    toggleButton(pageUi.confirmPaymentButton, false);
    showNotice("");
}

async function ensureValidCustomerSession() {
    let validSession = await verifyCustomerSession();
    if (!validSession) {
        validSession = await restoreCustomerSession();
    }

    if (validSession) return true;

    resetCustomerClientState();
    toggleButton(pageUi.confirmPaymentButton, true);
    showNotice("Session expired. Please log in again.");
    window.setTimeout(() => {
        window.location.href = "/index.html";
    }, 1200);
    return false;
}

function bindAutoRefresh() {
    // Auto-refresh disabled by request: keep form inputs stable while typing/selecting rating.
    return;
}

async function initPaymentPage() {
    initUiRefs();

    if (pageUi.paymentTableText) {
        pageUi.paymentTableText.innerText = getTableNumber() ? `Table ${getTableNumber()}` : "Table not found";
    }

    bindPaymentMethodButtons();
    bindStarRatingButtons();
    bindActionButtons();
    bindAutoRefresh();

    if (!(await ensureValidCustomerSession())) {
        return;
    }

    try {
        await refreshPaymentPageState();
    } catch (error) {
        showNotice(error.message || "Unable to load payment page");
        toggleButton(pageUi.confirmPaymentButton, true);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPaymentPage);
} else {
    initPaymentPage();
}
