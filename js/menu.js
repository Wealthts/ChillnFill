const optionSets = {
    spice: {
        label: "🌶️ Spiciness",
        choices: [
            { value: "No Spicy", th: "ไม่เผ็ด" },
            { value: "Mild", th: "เผ็ดน้อย" },
            { value: "Medium", th: "เผ็ดกลาง" },
            { value: "Extra Spicy", th: "เผ็ดมาก" }
        ],
        default: "Medium"
    },
    sweet: {
        label: "🍬 Sweetness",
        choices: [
            { value: "No Sugar", th: "ไม่หวาน" },
            { value: "Less Sugar", th: "หวานน้อย" },
            { value: "Normal", th: "หวานปกติ" },
            { value: "Extra Sweet", th: "หวานมาก" }
        ],
        default: "Normal"
    },
    ice: {
        label: "🧊 Ice Level",
        choices: [
            { value: "No Ice", th: "ไม่ใส่น้ำแข็ง" },
            { value: "Less Ice", th: "น้ำแข็งน้อย" },
            { value: "Regular Ice", th: "ปกติ" },
            { value: "Extra Ice", th: "น้ำแข็งเยอะ" }
        ],
        default: "Regular Ice"
    },
    doneness: {
        label: "🔥 Doneness",
        choices: [
            { value: "Medium Rare", th: "มีเดียมแรร์" },
            { value: "Medium", th: "มีเดียม" },
            { value: "Well Done", th: "สุกมาก" }
        ],
        default: "Medium"
    },
    size: {
        label: "🍨 Size",
        choices: [
            { value: "Small", th: "เล็ก" },
            { value: "Regular", th: "ปกติ" },
            { value: "Large", th: "ใหญ่" }
        ],
        default: "Regular"
    }
};

const STORAGE_KEYS = Object.freeze({
    cart: "cart",
    cartOwnerId: "cart_owner_id",
    userId: "user_id",
    tableNumber: "table_number",
    userType: "user_type"
});

const API_ENDPOINTS = Object.freeze({
    session: "/api/session",
    customerLogin: "/api/customer/login",
    customerState: "/api/customer/state",
    menu: "/api/menu",
    orders: "/api/orders",
    payments: "/api/payments",
    reviews: "/api/reviews",
    logout: "/api/logout"
});

const PAGE_PATHS = Object.freeze({
    cart: "cart.html",
    home: "index.html"
});

const REFRESH_INTERVAL_MS = 8000;

const defaultMenuImage = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

const mediaImageByMenuName = {
    "basil fried rice": "../media/basilfriedrice.jpg",
    "tom yum goong": "../media/tomyumkung.jpg",
    "pad thai": "../media/padthai.jpg",
    "hainanese chicken rice": "../media/hainanesechickenrice.jpg",
    "som tam thai": "../media/somtamthai.jpg",
    "korean bbq beef": "../media/koreanbbq.jpg",
    "beef basil": "../media/beefbasil.jpg",
    "lime juice": "../media/limejuice.jpg",
    "green tea": "../media/greentea.jpg",
    "ice cream": "../media/Icecream.jpg",
    "crispy pork basil": "../media/crispyporkbasil.jpg",
    "seafood tom yum": "../media/seafoodtomyum.jpg",
    "soda": "../media/soda.jpg"
};

const paymentStatusLabels = {
    paid: "Paid",
    pending: "Pending",
    failed: "Failed"
};

const state = {
    menus: [],
    orders: [],
    payments: [],
    reviews: [],
    customerState: {
        orderingAllowed: true,
        pendingReview: false,
        pendingReviewPaymentId: "",
        lockedAfterReview: false
    },
    cart: [],
    currentCategory: "all",
    searchKeyword: "",
    currentMenuItem: null,
    currentQty: 1,
    currentSelections: [],
    currentPaymentMethod: "",
    currentPaymentContext: null,
    currentReviewPaymentId: "",
    currentRating: 0
};

function getById(id) {
    return document.getElementById(id);
}

function resolveMenuImage(menuName, fallbackImage) {
    const key = String(menuName || "").trim().toLowerCase();
    return mediaImageByMenuName[key] || fallbackImage || defaultMenuImage;
}

function safeParseJSON(value, fallback) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function escapeText(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatDateTime(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
}

function normalizeStatus(status, fallback = "") {
    const normalized = String(status || fallback).trim().toLowerCase();
    return normalized || fallback;
}

function getCurrentSessionId() {
    return localStorage.getItem(STORAGE_KEYS.userId) || "";
}

function getCurrentTableNumber() {
    return localStorage.getItem(STORAGE_KEYS.tableNumber) || "";
}

function customerApiHeaders(extra = {}) {
    const headers = { ...extra };
    if (getCurrentSessionId()) headers["X-Customer-Session-Id"] = getCurrentSessionId();
    if (getCurrentTableNumber()) headers["X-Customer-Table-Number"] = getCurrentTableNumber();
    return headers;
}

function resetCustomerClientState() {
    localStorage.removeItem(STORAGE_KEYS.cart);
    localStorage.removeItem(STORAGE_KEYS.cartOwnerId);
    localStorage.removeItem(STORAGE_KEYS.userType);
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
    const currentTable = getCurrentTableNumber();
    if (!currentTable) return false;

    try {
        const result = await requestJson(API_ENDPOINTS.customerLogin, {
            method: "POST",
            headers: customerApiHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                table_number: Number(currentTable),
                session_id: getCurrentSessionId()
            })
        }, "Unable to restore session");

        if (result.user_id) {
            localStorage.setItem(STORAGE_KEYS.userId, String(result.user_id));
        }
        localStorage.setItem(STORAGE_KEYS.tableNumber, String(result.table_number || currentTable));
        localStorage.setItem(STORAGE_KEYS.userType, "customer");
        return true;
    } catch {
        return false;
    }
}

async function ensureValidCustomerSession() {
    let validSession = await verifyCustomerSession();
    if (!validSession) {
        validSession = await restoreCustomerSession();
    }

    if (validSession) return true;

    resetCustomerClientState();
    showToast("Session expired. Please log in again.");
    window.setTimeout(() => {
        window.location.href = PAGE_PATHS.home;
    }, 1200);
    return false;
}

async function loadMenusFromApi() {
    const result = await requestJson(API_ENDPOINTS.menu, { method: "GET" }, "Unable to load menu");
    state.menus = (Array.isArray(result.menus) ? result.menus : []).map((menu) => ({
        id: menu.id,
        name: menu.name || "Unnamed Menu",
        thaiName: menu.thaiName || "",
        price: Number(menu.price || 0),
        category: menu.category || "single",
        desc: menu.desc || "",
        hasOptions: Array.isArray(menu.optionKeys) && menu.optionKeys.length > 0,
        optionKeys: Array.isArray(menu.optionKeys) ? menu.optionKeys : [],
        image: resolveMenuImage(menu.name, menu.img || menu.image)
    }));
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
            optionsText: item.notes || "",
            customerNote: item.notes || ""
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
        items: Array.isArray(payment?.items) ? payment.items.map((item) => ({
            name: item.name || item.item_name || "-",
            qty: Number(item.qty ?? item.quantity ?? 0),
            price: Number(item.price ?? item.unit_price ?? 0)
        })) : [],
        amount: Number(payment?.amount || 0),
        time: payment?.time || payment?.created_at || new Date().toISOString(),
        method: payment?.method || "",
        status: payment?.status || "paid",
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

async function refreshCustomerData() {
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

function syncCartWithSession() {
    const sessionOwner = getCurrentSessionId() || getCurrentTableNumber() || "";
    const storedCart = safeParseJSON(localStorage.getItem(STORAGE_KEYS.cart), []);
    const cartOwner = localStorage.getItem(STORAGE_KEYS.cartOwnerId) || "";

    if (sessionOwner && cartOwner && cartOwner !== sessionOwner) {
        state.cart = [];
        localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(state.cart));
    } else {
        state.cart = Array.isArray(storedCart) ? storedCart : [];
    }

    if (sessionOwner) {
        localStorage.setItem(STORAGE_KEYS.cartOwnerId, sessionOwner);
    }
}

function persistCart() {
    const sessionOwner = getCurrentSessionId() || getCurrentTableNumber() || "";
    if (sessionOwner) {
        localStorage.setItem(STORAGE_KEYS.cartOwnerId, sessionOwner);
    }
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(state.cart));
}

function isOrderingLocked() {
    return Boolean(state.customerState.lockedAfterReview);
}

function getPendingReviewPaymentId() {
    return String(state.customerState.pendingReviewPaymentId || "");
}

function isOrderCreationDisabled() {
    return isOrderingLocked() || Boolean(state.customerState.pendingReview) || !state.customerState.orderingAllowed;
}

function getOrderingDisabledMessage() {
    if (state.customerState.pendingReview) {
        return "Please submit the review before making another order";
    }
    if (state.customerState.lockedAfterReview) {
        return "Ordering is closed after payment and review";
    }
    return "Ordering is not available for this session";
}

function getCurrentSessionOrders() {
    return [...state.orders].sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
}

function getCurrentSessionPayments() {
    return [...state.payments].sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
}

function getCurrentSessionReviews() {
    return [...state.reviews].sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
}

function getPaymentById(paymentId) {
    return state.payments.find((payment) => String(payment.id) === String(paymentId)) || null;
}

function getReviewByPaymentId(paymentId) {
    return state.reviews
        .filter((review) => String(review.paymentId || "") === String(paymentId || ""))
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))[0] || null;
}

function showToast(msg) {
    const toast = getById("toastMsg");
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.add("opacity-100");
    toast.classList.remove("opacity-0");
    window.setTimeout(() => {
        toast.classList.remove("opacity-100");
        toast.classList.add("opacity-0");
    }, 1800);
}

function showActionFeedback(msg) {
    showToast(msg);

    const banner = getById("sessionStateBanner");
    if (!banner) return;

    banner.innerText = msg;
    banner.classList.remove("hidden");
}

function setOptionButtonStyle(button, isActive) {
    if (!button) return;

    if (isActive) {
        button.className = "rounded-full border border-[#7a4e2f] bg-[#7a4e2f] px-3 py-1 text-xs font-semibold text-white ring-2 ring-[#7a4e2f]/30 transition";
        return;
    }

    button.className = "rounded-full border border-[#e6d7c7] bg-[#fbf5ee] px-3 py-1 text-xs font-semibold text-[#5f4028] transition hover:bg-[#efe4d8]";
}

function setCategoryButtonStyle(button, isActive) {
    if (!button) return;

    if (isActive) {
        button.className = "cat-btn btn btn-sm rounded-full border border-[#7a4e2f] bg-[#7a4e2f] text-[#fbf5ee] hover:bg-[#5f4028]";
        return;
    }

    button.className = "cat-btn btn btn-sm rounded-full border border-[#e6d7c7] bg-[#fbf5ee] text-[#7a4e2f] hover:bg-[#efe4d8]";
}

function setPaymentMethodButtonStyle(button, isActive) {
    if (!button) return;

    button.classList.toggle("border-[#7a4e2f]", isActive);
    button.classList.toggle("bg-[#fff4e8]", isActive);
    button.classList.toggle("ring-2", isActive);
    button.classList.toggle("ring-[#7a4e2f]/20", isActive);
}

function getStatusClass(status) {
    if (status === "paid") return "bg-[#dff3e4] text-[#1f7a3d]";
    if (status === "pending") return "bg-[#fff1cc] text-[#9a6a00]";
    if (status === "failed") return "bg-[#fde2e2] text-[#b42318]";
    return "bg-[#efe4d8] text-[#7a4e2f]";
}

function renderStars(rating) {
    const value = Math.max(0, Math.min(5, Number(rating) || 0));
    return `${"★".repeat(value)}${"☆".repeat(5 - value)}`;
}

function getOrderStatusClass(status) {
    const normalized = normalizeStatus(status);
    if (["completed", "served", "serving", "done"].includes(normalized)) return "bg-[#dff3e4] text-[#1f7a3d]";
    if (["cooking", "preparing"].includes(normalized)) return "bg-[#e5f0ff] text-[#1b4d8f]";
    if (["ready"].includes(normalized)) return "bg-[#eaf7ff] text-[#0f5d7f]";
    if (["cancelled", "canceled"].includes(normalized)) return "bg-[#fde2e2] text-[#b42318]";
    return "bg-[#fff1cc] text-[#9a6a00]";
}

function isServedStatus(status) {
    return ["serving", "served", "completed", "done"].includes(normalizeStatus(status));
}

function isCancelledStatus(status) {
    return ["cancelled", "canceled"].includes(normalizeStatus(status));
}

function isPaidOrder(order) {
    return Boolean(order && (order.paymentId || order.paidAt || normalizeStatus(order.paymentStatus) === "paid"));
}

function formatOrderTime(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
}

function getOrderItemsText(order) {
    const items = Array.isArray(order?.items) ? order.items : [];
    return items.length ? items.map((item) => `${item.name} x${item.qty}`).join(", ") : "-";
}

function getOrderPaymentText(order) {
    if (isCancelledStatus(order?.status)) return "Not required";
    if (isPaidOrder(order)) return `Paid (${order.paymentMethod || "Cash"})`;
    return "Waiting for payment";
}

function getOutstandingOrders() {
    return getCurrentSessionOrders().filter((order) => !isPaidOrder(order) && !isCancelledStatus(order.status));
}

function buildPaymentContext(orders) {
    const normalizedOrders = [...orders].sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));
    return {
        orders: normalizedOrders,
        items: normalizedOrders.flatMap((order) => {
            const orderItems = Array.isArray(order.items) ? order.items : [];
            return orderItems.map((item) => ({
                name: item.name,
                qty: item.qty,
                price: item.price || 0,
                orderId: order.id
            }));
        }),
        orderIds: normalizedOrders.map((order) => order.id),
        total: normalizedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
    };
}

function renderPaymentHistory() {
    const container = getById("paymentHistoryContainer");
    if (!container) return;

    const payments = getCurrentSessionPayments();
    if (!payments.length) {
        container.innerHTML = `
            <div class="text-center py-5 text-[#a97a52]">
                No payment/review history for this session
                <div class="text-xs mt-1">Table: ${escapeText(getCurrentTableNumber() || "-")}</div>
            </div>
        `;
        return;
    }

    container.innerHTML = payments.map((payment) => {
        const orderLabel = Array.isArray(payment.orderIds) && payment.orderIds.length
            ? payment.orderIds.join(", ")
            : "-";
        const itemsText = Array.isArray(payment.items) && payment.items.length
            ? payment.items.map((item) => `${item.name} x${item.qty}`).join(", ")
            : "-";
        const review = getReviewByPaymentId(payment.id);
        const hasReview = Boolean(review || payment.reviewSubmittedAt);

        return `
            <div class="rounded-2xl border border-[#e6d7c7] bg-[#fffaf5] p-4 mb-3">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div class="font-bold text-[#5f4028]">Table ${escapeText(payment.table || "-")}</div>
                    <div class="px-3 py-1 rounded-full text-xs font-bold ${getStatusClass(payment.status || "paid")}">
                        ${escapeText(paymentStatusLabels[payment.status] || "Paid")}
                    </div>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-3 mb-1">
                    <div class="text-sm text-[#a97a52]">Order: ${escapeText(orderLabel)}</div>
                    <div class="text-lg font-extrabold text-[#7a4e2f]">${escapeText(payment.amount)} Baht</div>
                </div>
                <div class="text-sm text-[#a97a52] mt-1">Date: ${escapeText(formatDateTime(payment.time))}</div>
                <div class="text-sm text-[#a97a52] mt-1">Method: ${escapeText(payment.method || "Cash")}</div>
                <div class="text-sm text-[#a97a52] mt-1">Items: ${escapeText(itemsText)}</div>
                <div class="mt-3 rounded-xl border border-[#e6d7c7] bg-[#fbf5ee] px-3 py-2">
                    <div class="text-xs font-semibold text-[#7a4e2f] mb-1">Your Review</div>
                    <div class="text-sm text-[#a97a52]">Rating: ${escapeText(review ? renderStars(review.rating) : "Not rated")}</div>
                    <div class="text-sm text-[#a97a52] mt-1">Comment: ${escapeText(review?.comment || "-")}</div>
                    <div class="text-xs text-[#b48a63] mt-1">Reviewed At: ${escapeText(formatDateTime(review?.time))}</div>
                    <button class="btn btn-xs mt-2 rounded-full bg-[#a97a52] text-white border-none hover:bg-[#7a4e2f]" onclick="openReviewForPayment('${payment.id}')">${hasReview ? "Edit Review" : "Rate & Review"}</button>
                </div>
            </div>
        `;
    }).join("");
}

function renderOrderStatus() {
    const container = getById("orderStatusContainer");
    if (!container) return;

    const orders = getCurrentSessionOrders();
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

function renderCartPreview() {
    const preview = getById("cartPreview");
    const previewCard = getById("cartPreviewCard");
    if (!preview || !previewCard) return;

    if (isOrderCreationDisabled()) {
        previewCard.classList.add("hidden");
        return;
    }

    if (!state.cart.length) {
        previewCard.classList.add("hidden");
        preview.innerHTML = `<div class="text-[#a97a52]">No items in cart.</div>`;
        return;
    }

    previewCard.classList.remove("hidden");
    preview.innerHTML = state.cart.map((item) => `
        <div class="flex items-center justify-between border-b border-[#e6d7c7] py-2">
            <div>
                <div class="font-semibold">
                    ${escapeText(item.name)}
                    ${item.thaiName ? `<span class="ml-1 text-xs font-medium text-[#a97a52]">(${escapeText(item.thaiName)})</span>` : ""}
                </div>
                <div class="text-xs text-[#a97a52]">x${Number(item.quantity || 0)}</div>
            </div>
            <div class="font-semibold">${Number(item.price || 0) * Number(item.quantity || 0)} Baht</div>
        </div>
    `).join("");
}

function updateCartUI() {
    const cartCountSpan = getById("cartCount");
    const cartTotalSpan = getById("cartTotalPrice");
    const modalContainer = getById("cartItemsContainer");
    const modalTotalSpan = getById("modalTotalPrice");

    const totalItems = state.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const total = state.cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);

    if (cartCountSpan) cartCountSpan.innerText = String(totalItems);
    if (cartTotalSpan) cartTotalSpan.innerText = `${total} Baht`;

    if (modalContainer) {
        if (!state.cart.length) {
            modalContainer.innerHTML = '<div class="text-center text-[#7a4e2f] py-5">No items yet. Please add a menu item.</div>';
        } else {
            modalContainer.innerHTML = state.cart.map((item) => `
                <div class="flex justify-between gap-3 py-2 border-b border-[#e6d7c7] text-sm">
                    <div>
                        <strong>${escapeText(item.name)}</strong>
                        ${item.thaiName ? `<span class="ml-1 text-[0.7rem] text-[#a97a52]">(${escapeText(item.thaiName)})</span>` : ""}
                        x${Number(item.quantity || 0)}<br>
                        <span class="text-[0.7rem] text-[#a97a52]">${escapeText(item.optionsText || "Standard")}</span>
                        ${item.customerNote ? `<br><span class="text-[0.75rem] text-[#7a4e2f]">Note: ${escapeText(item.customerNote)}</span>` : ""}
                    </div>
                    <div>${Number(item.price || 0) * Number(item.quantity || 0)} Baht</div>
                </div>
            `).join("");
        }
    }

    if (modalTotalSpan) {
        modalTotalSpan.innerText = `${total} Baht`;
    }

    persistCart();
    renderCartPreview();
}

function addToCart(menuItem, selectedOptions = null, quantity = 1, customerNote = "") {
    if (isOrderCreationDisabled()) {
        showToast(getOrderingDisabledMessage());
        return;
    }

    state.cart.push({
        id: menuItem.id,
        menuId: menuItem.id,
        name: menuItem.name,
        thaiName: menuItem.thaiName || "",
        price: menuItem.price,
        quantity,
        optionsText: formatOptionsText(selectedOptions) || "Standard",
        customerNote: customerNote || ""
    });

    updateCartUI();
    showToast(`Added ${menuItem.name} x${quantity}`);
}

function getFilteredMenus() {
    let filtered = [...state.menus];

    if (state.currentCategory !== "all") {
        filtered = filtered.filter((menu) => menu.category === state.currentCategory);
    }

    if (state.searchKeyword.trim()) {
        const keyword = state.searchKeyword.trim().toLowerCase();
        filtered = filtered.filter((menu) =>
            menu.name.toLowerCase().includes(keyword) ||
            (menu.thaiName && menu.thaiName.toLowerCase().includes(keyword)) ||
            (menu.desc && menu.desc.toLowerCase().includes(keyword)) ||
            (menu.category && menu.category.toLowerCase().includes(keyword))
        );
    }

    return filtered;
}

function updateSearchResultText(total) {
    const resultText = getById("searchResultText");
    if (!resultText) return;

    if (!state.searchKeyword.trim()) {
        resultText.innerText = state.currentCategory === "all" ? "" : `Category: ${state.currentCategory} • ${total} items`;
        return;
    }

    resultText.innerText = `Results for "${state.searchKeyword}" • ${total} items`;
}

function formatOptionsText(selectedOptions) {
    if (!Array.isArray(selectedOptions) || !selectedOptions.length) return "";
    return selectedOptions
        .map((option) => `${option.label.replace(/^[^A-Za-z0-9]+\s*/g, "")}: ${option.value}`)
        .join(" • ");
}

function renderItemOptions(menu) {
    const wrapper = getById("itemOptionsWrapper");
    const container = getById("itemOptionsContainer");
    if (!wrapper || !container) return;

    container.innerHTML = "";
    state.currentSelections = [];

    const keys = menu.optionKeys || [];
    if (!keys.length) {
        wrapper.classList.add("hidden");
        return;
    }

    wrapper.classList.remove("hidden");

    keys.forEach((key) => {
        const set = optionSets[key];
        if (!set || !Array.isArray(set.choices) || !set.choices.length) return;

        const defaultValue = set.default || set.choices[0].value;
        state.currentSelections.push({ key, label: set.label, value: defaultValue });

        const group = document.createElement("div");
        group.className = "p-1";

        const label = document.createElement("div");
        label.className = "text-sm font-semibold text-[#5f4028]";
        label.textContent = set.label;

        const buttons = document.createElement("div");
        buttons.className = "mt-2 flex flex-wrap gap-2";

        set.choices.forEach((choice) => {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.optionKey = key;
            button.dataset.optionValue = choice.value;
            button.textContent = choice.th ? `${choice.value} (${choice.th})` : choice.value;
            setOptionButtonStyle(button, choice.value === defaultValue);

            button.addEventListener("click", () => {
                buttons.querySelectorAll("button[data-option-key]").forEach((node) => setOptionButtonStyle(node, false));
                setOptionButtonStyle(button, true);

                const target = state.currentSelections.find((option) => option.key === key);
                if (target) target.value = choice.value;
            });

            buttons.appendChild(button);
        });

        group.appendChild(label);
        group.appendChild(buttons);
        container.appendChild(group);
    });
}

function openItemModal(menu) {
    if (isOrderCreationDisabled()) {
        showToast(getOrderingDisabledMessage());
        return;
    }

    state.currentMenuItem = menu;
    state.currentQty = 1;

    const thaiLabel = menu.thaiName
        ? `<span class="text-xs text-[#a97a52] font-medium ml-1">(${escapeText(menu.thaiName)})</span>`
        : "";

    getById("itemModalTitle").innerHTML = `${escapeText(menu.name)} ${thaiLabel}`;
    getById("itemModalPrice").innerText = `${menu.price} Baht`;
    getById("itemModalDesc").innerText = menu.desc || "Special from the Chill n Fill kitchen";
    getById("itemModalImage").src = resolveMenuImage(menu.name, menu.image);
    getById("itemModalNote").value = "";
    getById("itemQtyValue").innerText = "1";

    renderItemOptions(menu);
    openModal(getById("itemModal"));
}

function closeItemModal() {
    closeModal(getById("itemModal"));
}

function renderMenu() {
    const grid = getById("menuGrid");
    if (!grid) return;

    const filtered = getFilteredMenus();
    const orderingDisabled = isOrderCreationDisabled();

    grid.innerHTML = "";
    updateSearchResultText(filtered.length);

    if (!filtered.length) {
        grid.innerHTML = `
            <div class="text-center p-7 bg-[#fbf5ee] border border-dashed border-[#e6d7c7] rounded-3xl text-[#a97a52] md:col-span-2 xl:col-span-3">
                No menu items found
            </div>
        `;
        return;
    }

    filtered.forEach((menu) => {
        const card = document.createElement("div");
        card.className = [
            "menu-card",
            "group",
            "rounded-3xl",
            "border",
            "border-[#e6d7c7]",
            "bg-[#fbf5ee]",
            "p-4",
            "shadow-sm",
            "flex",
            "flex-col",
            "gap-4",
            orderingDisabled ? "opacity-90" : "cursor-pointer transition duration-200 hover:-translate-y-1 hover:shadow-lg"
        ].join(" ");

        card.innerHTML = `
            <div class="overflow-hidden rounded-2xl border border-[#e6d7c7] bg-[#efe4d8]">
                <img src="${resolveMenuImage(menu.name, menu.image)}" alt="${escapeText(menu.name)}" class="menu-image h-48 w-full object-cover transition duration-300 group-hover:scale-[1.03]">
            </div>
            <div class="menu-row flex items-center justify-between gap-4 px-1">
                <div class="min-w-0">
                    <h3 class="truncate text-xl font-bold text-[#5f4028] sm:text-2xl">${escapeText(menu.name)}</h3>
                </div>
                <div class="shrink-0 text-right text-xl font-extrabold text-[#7a4e2f] sm:text-2xl">${menu.price} Baht</div>
            </div>
        `;

        grid.appendChild(card);

        if (!orderingDisabled) {
            card.tabIndex = 0;
            card.setAttribute("role", "button");
            card.addEventListener("click", () => openItemModal(menu));
            card.addEventListener("keydown", (event) => {
                if (!["Enter", " "].includes(event.key)) return;
                event.preventDefault();
                openItemModal(menu);
            });
        }
    });
}

function renderPaymentSummary(context) {
    const container = getById("paymentSummaryContainer");
    if (!container) return;

    if (!context?.orders?.length) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = `
        <div class="rounded-3xl border border-[#e6d7c7] bg-[#fffaf5] p-4">
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
            <div class="rounded-3xl border border-[#e6d7c7] bg-[#fffaf5] p-4">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div class="font-bold text-[#5f4028]">Order #${order.id}</div>
                    <div class="text-sm font-semibold text-[#7a4e2f]">${order.total || 0} Baht</div>
                </div>
                <div class="text-sm text-[#a97a52]">${getOrderItemsText(order)}</div>
            </div>
        `).join("")}
    `;
}

function renderPaymentBlocked(message) {
    const container = getById("paymentSummaryContainer");
    if (!container) return;
    container.innerHTML = `
        <div class="rounded-3xl border border-[#d7b58f] bg-[#fff4e8] p-4">
            <div class="text-sm font-semibold text-[#7a4e2f]">${escapeText(message)}</div>
        </div>
    `;
}

function updatePaymentMethodUI() {
    const qrCodePanel = getById("qrCodePanel");
    const confirmPaymentBtn = getById("confirmPaymentBtn");

    document.querySelectorAll(".payment-method-btn").forEach((button) => {
        setPaymentMethodButtonStyle(button, button.dataset.method === state.currentPaymentMethod);
    });

    qrCodePanel?.classList.toggle("hidden", state.currentPaymentMethod !== "QR Code");

    if (confirmPaymentBtn) {
        confirmPaymentBtn.disabled = !state.currentPaymentContext?.orders?.length;
        confirmPaymentBtn.classList.toggle("opacity-60", !state.currentPaymentContext?.orders?.length);
        confirmPaymentBtn.classList.toggle("cursor-not-allowed", !state.currentPaymentContext?.orders?.length);
    }
}

function resetPaymentFlowState() {
    state.currentPaymentMethod = "";
    state.currentPaymentContext = null;
    renderPaymentSummary(null);
    updatePaymentMethodUI();
}

function openReviewModal(payment = null) {
    const resolvedPayment = payment || getPaymentById(state.currentReviewPaymentId || getPendingReviewPaymentId());
    const existingReview = resolvedPayment ? getReviewByPaymentId(resolvedPayment.id) : null;

    state.currentReviewPaymentId = resolvedPayment ? String(resolvedPayment.id) : "";
    state.currentRating = Number(existingReview?.rating || 0);

    const summary = getById("reviewSummaryText");
    if (summary) {
        summary.innerText = resolvedPayment
            ? `Payment received: ${resolvedPayment.amount} Baht via ${resolvedPayment.method || "Cash"}. Please leave a review to finish this session.`
            : "Tell us about your experience after payment.";
    }

    const textarea = getById("reviewTextarea");
    if (textarea) textarea.value = existingReview?.comment || "";

    document.querySelectorAll("#starRating .star").forEach((star, index) => {
        star.classList.toggle("text-[#f5b342]", index < state.currentRating);
    });

    openModal(getById("reviewModal"));
}

function applyOrderingState() {
    const banner = getById("sessionStateBanner");
    const cartBar = getById("cartBar");
    const openCartBtn = getById("openCartModal");
    const openCartInlineBtn = getById("openCartInlineBtn");
    const clearCartBtn = getById("clearCartBtn");
    const itemAddBtn = getById("itemAddBtn");
    const openPaymentBtn = getById("openPaymentBtn");
    const disabled = isOrderCreationDisabled();

    if (banner) {
        if (state.customerState.lockedAfterReview) {
            banner.innerText = "Payment and review are complete for this session. New orders are disabled.";
            banner.classList.remove("hidden");
        } else if (state.customerState.pendingReview) {
            banner.innerText = "Payment is already completed. Please submit the review to finish this session.";
            banner.classList.remove("hidden");
        } else {
            banner.innerText = "";
            banner.classList.add("hidden");
        }
    }

    [openCartBtn, openCartInlineBtn, clearCartBtn, itemAddBtn].forEach((button) => {
        if (!button) return;
        button.disabled = disabled;
        button.classList.toggle("opacity-60", disabled);
        button.classList.toggle("cursor-not-allowed", disabled);
    });

    if (itemAddBtn) {
        itemAddBtn.innerText = state.customerState.lockedAfterReview
            ? "Ordering Closed"
            : (state.customerState.pendingReview ? "Leave Review First" : "Add to Cart");
    }

    if (openCartBtn) {
        openCartBtn.innerText = state.customerState.lockedAfterReview
            ? "Session Closed"
            : (state.customerState.pendingReview ? "Leave Review First" : "View Cart");
    }

    if (openPaymentBtn) {
        openPaymentBtn.disabled = false;
        openPaymentBtn.classList.remove("opacity-60", "cursor-not-allowed");
    }

    if (cartBar) {
        cartBar.classList.toggle("opacity-75", disabled);
    }

    if (disabled) {
        closeItemModal();
    }

    renderMenu();
    updateCartUI();
}

async function openPaymentSelectionModal() {
    if (!(await ensureValidCustomerSession())) return;

    try {
        await refreshCustomerData();
        renderPaymentHistory();
        renderOrderStatus();
        applyOrderingState();
    } catch (error) {
        showActionFeedback(error.message || "Unable to load payment data");
        return;
    }

    if (state.customerState.lockedAfterReview) {
        showActionFeedback("Payment is complete for this session. Showing payment history.");
        await openPaymentHistoryModalNow();
        return;
    }

    if (state.customerState.pendingReview) {
        openReviewModal();
        showActionFeedback("Please submit review before another payment/order");
        return;
    }

    const outstandingOrders = getOutstandingOrders();
    if (!outstandingOrders.length) {
        showActionFeedback("No unpaid orders. Showing payment history.");
        await openPaymentHistoryModalNow();
        return;
    }

    state.currentPaymentMethod = "";

    if (!outstandingOrders.every((order) => isServedStatus(order.status))) {
        state.currentPaymentContext = null;
        renderPaymentBlocked("Payment is available only when all unpaid orders are in Serving status.");
    } else {
        state.currentPaymentContext = buildPaymentContext(outstandingOrders);
        renderPaymentSummary(state.currentPaymentContext);
    }

    updatePaymentMethodUI();
    openModal(getById("paymentModal"));
}

async function confirmPaymentSelection() {
    if (!state.currentPaymentContext?.orders?.length) {
        showActionFeedback("No unpaid orders for this session");
        return;
    }

    if (!state.currentPaymentMethod) {
        showToast("Please choose a payment method");
        return;
    }

    const confirmPaymentBtn = getById("confirmPaymentBtn");
    if (confirmPaymentBtn) confirmPaymentBtn.disabled = true;

    try {
        const result = await requestJson(API_ENDPOINTS.payments, {
            method: "POST",
            headers: customerApiHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                order_ids: state.currentPaymentContext.orderIds,
                method: state.currentPaymentMethod
            })
        }, "Unable to process payment");

        await refreshCustomerData();
        renderPaymentHistory();
        renderOrderStatus();
        closeModal(getById("paymentModal"));
        resetPaymentFlowState();
        state.currentReviewPaymentId = String(result.payment_id || result.payment?.id || getPendingReviewPaymentId());
        openReviewModal(getPaymentById(state.currentReviewPaymentId) || result.payment || null);
        applyOrderingState();
        showToast("Payment recorded");
    } catch (error) {
        showActionFeedback(error.message || "Unable to process payment");
    } finally {
        if (confirmPaymentBtn) confirmPaymentBtn.disabled = false;
    }
}

async function submitReview() {
    const reviewText = String(getById("reviewTextarea")?.value || "").trim();
    if (!reviewText && !state.currentRating) {
        showToast("Please add a rating or review before submitting");
        return;
    }

    const paymentId = state.currentReviewPaymentId || getPendingReviewPaymentId();
    if (!paymentId) {
        showToast("Payment not found for review");
        return;
    }

    const submitReviewBtn = getById("submitReviewBtn");
    if (submitReviewBtn) submitReviewBtn.disabled = true;

    try {
        await requestJson(API_ENDPOINTS.reviews, {
            method: "POST",
            headers: customerApiHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                payment_id: paymentId,
                rating: state.currentRating || 0,
                comment: reviewText
            })
        }, "Unable to submit review");

        await refreshCustomerData();
        state.cart = [];
        updateCartUI();
        closeModal(getById("reviewModal"));
        renderPaymentHistory();
        renderOrderStatus();
        applyOrderingState();
        showToast("Thanks for your review");
    } catch (error) {
        showToast(error.message || "Unable to submit review");
    } finally {
        if (submitReviewBtn) submitReviewBtn.disabled = false;
    }
}

async function logoutCustomer() {
    try {
        await fetch(API_ENDPOINTS.logout, { method: "POST", credentials: "same-origin" });
    } catch {
    }

    localStorage.removeItem(STORAGE_KEYS.cart);
    localStorage.removeItem(STORAGE_KEYS.cartOwnerId);
    localStorage.removeItem(STORAGE_KEYS.userType);
    localStorage.removeItem(STORAGE_KEYS.userId);
    localStorage.removeItem(STORAGE_KEYS.tableNumber);
    window.location.href = PAGE_PATHS.home;
}

function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove("hidden");
    modalEl.classList.add("flex", "modal-open");
}

function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add("hidden");
    modalEl.classList.remove("flex", "modal-open");
}

async function openOrderStatusModal() {
    try {
        await refreshCustomerData();
        renderOrderStatus();
        openModal(getById("orderStatusModal"));
    } catch (error) {
        showToast(error.message || "Unable to load order status");
    }
}

async function openPaymentHistoryModalNow() {
    try {
        await refreshCustomerData();
        renderPaymentHistory();
        openModal(getById("paymentHistoryModal"));
    } catch (error) {
        showToast(error.message || "Unable to load payment history");
    }
}

function bindCategoryButtons() {
    document.querySelectorAll(".cat-btn").forEach((button) => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".cat-btn").forEach((node) => setCategoryButtonStyle(node, false));
            setCategoryButtonStyle(button, true);
            state.currentCategory = button.dataset.cat || "all";
            renderMenu();
        });
    });
}

function bindSearchInput() {
    const searchInput = getById("menuSearch");
    searchInput?.addEventListener("input", (event) => {
        state.searchKeyword = String(event.target.value || "");
        renderMenu();
    });
}

function bindItemModalActions() {
    getById("closeItemModalBtn")?.addEventListener("click", closeItemModal);

    getById("itemQtyMinus")?.addEventListener("click", () => {
        if (state.currentQty > 1) {
            state.currentQty -= 1;
            getById("itemQtyValue").innerText = String(state.currentQty);
        }
    });

    getById("itemQtyPlus")?.addEventListener("click", () => {
        state.currentQty += 1;
        getById("itemQtyValue").innerText = String(state.currentQty);
    });

    getById("itemAddBtn")?.addEventListener("click", () => {
        if (!state.currentMenuItem) return;
        const note = String(getById("itemModalNote")?.value || "").trim();
        const options = state.currentSelections.length ? state.currentSelections.map((option) => ({ ...option })) : null;
        addToCart(state.currentMenuItem, options, state.currentQty, note);
        if (!isOrderCreationDisabled()) {
            closeItemModal();
        }
    });
}

function bindCartButtons() {
    getById("openCartModal")?.addEventListener("click", () => {
        if (isOrderCreationDisabled()) {
            showToast(getOrderingDisabledMessage());
            return;
        }
        window.location.href = PAGE_PATHS.cart;
    });

    getById("openCartInlineBtn")?.addEventListener("click", () => {
        if (isOrderCreationDisabled()) {
            showToast(getOrderingDisabledMessage());
            return;
        }
        window.location.href = PAGE_PATHS.cart;
    });

    getById("clearCartBtn")?.addEventListener("click", () => {
        if (isOrderCreationDisabled()) {
            showToast(getOrderingDisabledMessage());
            return;
        }

        if (!state.cart.length) {
            showToast("Cart is already empty");
            return;
        }

        state.cart = [];
        updateCartUI();
        showToast("Cleared all items");
    });
}

function bindModalActions() {
    getById("openPaymentHistoryBtn")?.addEventListener("click", openPaymentHistoryModalNow);
    getById("openOrderStatusBtn")?.addEventListener("click", (event) => {
        event.preventDefault();
        openOrderStatusModal();
    });
    getById("openPaymentBtn")?.addEventListener("click", (event) => {
        event.preventDefault();
        openPaymentSelectionModal();
    });
    getById("logoutBtn")?.addEventListener("click", logoutCustomer);

    getById("closePaymentHistoryBtn")?.addEventListener("click", () => closeModal(getById("paymentHistoryModal")));
    getById("closePaymentBtn")?.addEventListener("click", () => {
        closeModal(getById("paymentModal"));
        resetPaymentFlowState();
    });
    getById("closeOrderStatusBtn")?.addEventListener("click", () => closeModal(getById("orderStatusModal")));

    document.querySelectorAll(".payment-method-btn").forEach((button) => {
        button.addEventListener("click", () => {
            state.currentPaymentMethod = button.dataset.method || "";
            updatePaymentMethodUI();
        });
    });

    getById("confirmPaymentBtn")?.addEventListener("click", confirmPaymentSelection);
    getById("submitReviewBtn")?.addEventListener("click", submitReview);

    document.querySelectorAll("#starRating .star").forEach((star) => {
        star.addEventListener("click", () => {
            state.currentRating = Number(star.dataset.value || 0);
            document.querySelectorAll("#starRating .star").forEach((node, index) => {
                node.classList.toggle("text-[#f5b342]", index < state.currentRating);
            });
        });
    });
}

function bindWindowEvents() {
    window.addEventListener("click", (event) => {
        if (event.target === getById("paymentHistoryModal")) closeModal(getById("paymentHistoryModal"));
        if (event.target === getById("paymentModal")) {
            closeModal(getById("paymentModal"));
            resetPaymentFlowState();
        }
        if (event.target === getById("orderStatusModal")) closeModal(getById("orderStatusModal"));
        if (event.target === getById("itemModal")) closeItemModal();
        if (event.target === getById("reviewModal")) closeModal(getById("reviewModal"));
    });

    window.addEventListener("storage", (event) => {
        const eventKey = event.key || "";
        if (![STORAGE_KEYS.cart, STORAGE_KEYS.cartOwnerId, STORAGE_KEYS.userId, STORAGE_KEYS.tableNumber].includes(eventKey)) {
            return;
        }

        syncCartWithSession();
        updateCartUI();
    });
}

async function refreshMenuPageState() {
    await Promise.all([loadMenusFromApi(), refreshCustomerData()]);
    renderMenu();
    renderPaymentHistory();
    renderOrderStatus();
    applyOrderingState();
}

async function initMenuPage() {
    syncCartWithSession();
    updateCartUI();

    if (getCurrentTableNumber()) {
        const tableDisplay = getById("tableDisplay");
        if (tableDisplay) {
            tableDisplay.textContent = `Table ${getCurrentTableNumber()}`;
            tableDisplay.classList.remove("hidden");
        }
    }

    bindCategoryButtons();
    bindSearchInput();
    bindItemModalActions();
    bindCartButtons();
    bindModalActions();
    bindWindowEvents();

    if (!(await ensureValidCustomerSession())) {
        return;
    }

    try {
        await refreshMenuPageState();
    } catch (error) {
        showActionFeedback(error.message || "Unable to load menu");
    }

    window.setInterval(() => {
        if (!getCurrentSessionId() || !getCurrentTableNumber()) return;
        refreshCustomerData()
            .then(() => {
                renderPaymentHistory();
                renderOrderStatus();
                applyOrderingState();
                if (state.customerState.pendingReview && !isOrderingLocked()) {
                    openReviewModal();
                }
            })
            .catch(() => {});
    }, REFRESH_INTERVAL_MS);

    if (state.customerState.pendingReview && !isOrderingLocked()) {
        openReviewModal();
    }
}

window.openOrderStatusModal = openOrderStatusModal;
window.openPaymentHistoryModalNow = openPaymentHistoryModalNow;
window.openMenuPaymentModal = openPaymentSelectionModal;
window.openReviewForPayment = function openReviewForPayment(paymentId) {
    const payment = getPaymentById(paymentId);
    if (!payment) {
        showToast("Payment not found for this session");
        return;
    }
    openReviewModal(payment);
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMenuPage);
} else {
    initMenuPage();
}
