const STORAGE_KEYS = Object.freeze({
    cart: "cart",
    cartOwnerId: "cart_owner_id",
    userId: "user_id",
    tableNumber: "table_number"
});

const PAGE_PATHS = Object.freeze({
    orderStatus: "order_status.html",
    login: "index.html"
});

const API_ENDPOINTS = Object.freeze({
    session: "/api/session",
    customerLogin: "/api/customer/login",
    customerState: "/api/customer/state",
    orders: "/api/orders"
});

const UI_IDS = Object.freeze({
    cartItemsContainer: "cartItemsContainer",
    totalPrice: "modalTotalPrice",
    toastMessage: "toastMsg",
    sessionNotice: "cartSessionNotice",
    clearCartButton: "clearCartBtn",
    sendKitchenButton: "sendKitchenBtn"
});

const state = {
    cartItems: [],
    customerState: {
        orderingAllowed: true,
        pendingReview: false,
        pendingReviewPaymentId: "",
        lockedAfterReview: false
    }
};

function getById(id) {
    return document.getElementById(id);
}

function readJson(value, fallback) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

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

function isOrderCreationDisabled() {
    return Boolean(state.customerState.pendingReview || state.customerState.lockedAfterReview || !state.customerState.orderingAllowed);
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

function showToast(message) {
    const toastElement = getById(UI_IDS.toastMessage);
    if (!toastElement) return;

    toastElement.innerText = message;
    toastElement.classList.add("opacity-100");
    toastElement.classList.remove("opacity-0");

    window.setTimeout(() => {
        toastElement.classList.remove("opacity-100");
        toastElement.classList.add("opacity-0");
    }, 1800);
}

function getStoredCart() {
    return readJson(localStorage.getItem(STORAGE_KEYS.cart), []);
}

function setStoredCart(cartItems) {
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cartItems));
}

function syncCartWithSession() {
    const currentOwner = getCurrentSessionId() || getCurrentTableNumber() || "";
    const storedOwner = localStorage.getItem(STORAGE_KEYS.cartOwnerId) || "";
    const storedCart = getStoredCart();

    if (currentOwner && storedOwner && currentOwner !== storedOwner) {
        state.cartItems = [];
        setStoredCart(state.cartItems);
    } else {
        state.cartItems = Array.isArray(storedCart) ? storedCart : [];
    }

    if (currentOwner) {
        localStorage.setItem(STORAGE_KEYS.cartOwnerId, currentOwner);
    }
}

function persistCart() {
    const owner = getCurrentSessionId() || getCurrentTableNumber() || "";
    if (owner) {
        localStorage.setItem(STORAGE_KEYS.cartOwnerId, owner);
    }
    setStoredCart(state.cartItems);
}

function updateSessionNotice() {
    const noticeElement = getById(UI_IDS.sessionNotice);
    const sendKitchenButton = getById(UI_IDS.sendKitchenButton);
    const clearCartButton = getById(UI_IDS.clearCartButton);
    const disabled = isOrderCreationDisabled();

    if (noticeElement) {
        if (state.customerState.lockedAfterReview) {
            noticeElement.innerText = "Payment and review are complete for this session. New orders are disabled.";
            noticeElement.classList.remove("hidden");
        } else if (state.customerState.pendingReview) {
            noticeElement.innerText = "Payment is already completed. Please submit the review to finish this session.";
            noticeElement.classList.remove("hidden");
        } else {
            noticeElement.innerText = "";
            noticeElement.classList.add("hidden");
        }
    }

    [sendKitchenButton, clearCartButton].forEach((button) => {
        if (!button) return;
        button.disabled = disabled;
        button.classList.toggle("opacity-60", disabled);
        button.classList.toggle("cursor-not-allowed", disabled);
    });
}

function getCartTotal(cartItems) {
    return cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
}

function buildCartItemHtml(item, index, disabled) {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);

    return `
        <div class="flex items-center justify-between gap-3 py-2 border-b border-[#e6d7c7] text-sm">
            <div class="flex-1">
                <strong>${item.name}</strong>
                ${item.thaiName ? `<span class="ml-1 text-[0.7rem] text-[#a97a52]">(${item.thaiName})</span>` : ""}
                <div class="text-[0.7rem] text-[#a97a52] mt-1">${item.optionsText || "Standard"}</div>
                ${item.customerNote ? `<div class="text-[0.75rem] text-[#7a4e2f] mt-1">Note: ${item.customerNote}</div>` : ""}
                <div class="mt-2 flex items-center gap-2">
                    <button class="qty-btn btn btn-xs btn-circle border-none ${disabled ? "bg-[#d8cabb] text-[#8b6c53] cursor-not-allowed" : "bg-[#7a4e2f] text-[#fbf5ee]"}" data-action="minus" data-index="${index}" ${disabled ? "disabled" : ""}>-</button>
                    <span class="min-w-[24px] text-center font-bold">${quantity}</span>
                    <button class="qty-btn btn btn-xs btn-circle border-none ${disabled ? "bg-[#d8cabb] text-[#8b6c53] cursor-not-allowed" : "bg-[#7a4e2f] text-[#fbf5ee]"}" data-action="plus" data-index="${index}" ${disabled ? "disabled" : ""}>+</button>
                </div>
            </div>
            <div class="font-semibold">${price * quantity} Baht</div>
        </div>
    `;
}

function bindQuantityButtons() {
    document.querySelectorAll(".qty-btn").forEach((button) => {
        button.addEventListener("click", () => {
            if (isOrderCreationDisabled()) {
                showToast(getOrderingDisabledMessage());
                return;
            }

            const index = Number.parseInt(button.getAttribute("data-index"), 10);
            if (!Number.isInteger(index) || !state.cartItems[index]) return;

            const action = button.getAttribute("data-action");
            if (action === "minus") {
                state.cartItems[index].quantity = Math.max(1, Number(state.cartItems[index].quantity || 1) - 1);
            } else if (action === "plus") {
                state.cartItems[index].quantity = Number(state.cartItems[index].quantity || 1) + 1;
            }

            persistCart();
            renderCart();
        });
    });
}

function renderCart() {
    const container = getById(UI_IDS.cartItemsContainer);
    const totalElement = getById(UI_IDS.totalPrice);
    if (!container || !totalElement) return;

    const disabled = isOrderCreationDisabled();

    if (!state.cartItems.length) {
        container.innerHTML = `<div class="text-center text-[#7a4e2f] py-6">${disabled ? "Ordering is closed for this session." : "No items yet. Please add a menu item."}</div>`;
        totalElement.innerText = "0";
        updateSessionNotice();
        return;
    }

    container.innerHTML = state.cartItems
        .map((item, index) => buildCartItemHtml(item, index, disabled))
        .join("");

    totalElement.innerText = String(getCartTotal(state.cartItems));
    updateSessionNotice();
    bindQuantityButtons();
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
    const tableNumber = getCurrentTableNumber();
    if (!tableNumber) return false;

    try {
        const result = await requestJson(API_ENDPOINTS.customerLogin, {
            method: "POST",
            headers: customerApiHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                table_number: Number(tableNumber),
                session_id: getCurrentSessionId()
            })
        }, "Unable to restore session");

        if (result.user_id) {
            localStorage.setItem(STORAGE_KEYS.userId, String(result.user_id));
        }
        localStorage.setItem(STORAGE_KEYS.tableNumber, String(result.table_number || tableNumber));
        localStorage.setItem("user_type", "customer");
        return true;
    } catch {
        return false;
    }
}

async function refreshCustomerState() {
    const result = await requestJson(API_ENDPOINTS.customerState, { method: "GET" }, "Unable to load customer state");
    state.customerState = {
        orderingAllowed: Boolean(result.ordering_allowed),
        pendingReview: Boolean(result.pending_review),
        pendingReviewPaymentId: String(result.pending_review_payment_id || ""),
        lockedAfterReview: Boolean(result.locked_after_review)
    };
}

async function submitOrderViaApi() {
    const payload = {
        items: state.cartItems.map((item) => ({
            menuId: item.menuId || item.id || null,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            optionsText: item.optionsText || "",
            customerNote: item.customerNote || ""
        }))
    };

    await requestJson(API_ENDPOINTS.orders, {
        method: "POST",
        headers: customerApiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload)
    }, "Unable to place order");
}

async function ensureValidCustomerSession() {
    let validSession = await verifyCustomerSession();
    if (!validSession) {
        validSession = await restoreCustomerSession();
    }

    if (validSession) return true;

    showToast("Session expired. Please log in again.");
    window.setTimeout(() => {
        window.location.href = PAGE_PATHS.login;
    }, 1200);
    return false;
}

async function handleSendToKitchen() {
    if (isOrderCreationDisabled()) {
        showToast(getOrderingDisabledMessage());
        return;
    }

    if (!state.cartItems.length) {
        showToast("Please add items before sending");
        return;
    }

    const sendKitchenButton = getById(UI_IDS.sendKitchenButton);
    if (sendKitchenButton) {
        sendKitchenButton.disabled = true;
        sendKitchenButton.classList.add("opacity-60", "cursor-not-allowed");
    }

    try {
        await submitOrderViaApi();
        state.cartItems = [];
        persistCart();
        renderCart();
        window.location.href = PAGE_PATHS.orderStatus;
    } catch (error) {
        showToast(error.message || "Unable to send order to kitchen");
        try {
            await refreshCustomerState();
            renderCart();
        } catch {
        }
    } finally {
        if (sendKitchenButton) {
            sendKitchenButton.disabled = false;
            sendKitchenButton.classList.remove("opacity-60", "cursor-not-allowed");
        }
    }
}

function handleClearCart() {
    if (isOrderCreationDisabled()) {
        showToast(getOrderingDisabledMessage());
        return;
    }

    if (!state.cartItems.length) {
        showToast("Cart is already empty");
        return;
    }

    state.cartItems = [];
    persistCart();
    renderCart();
    showToast("Cleared all items");
}

function bindActionButtons() {
    getById(UI_IDS.clearCartButton)?.addEventListener("click", handleClearCart);
    getById(UI_IDS.sendKitchenButton)?.addEventListener("click", handleSendToKitchen);
}

function bindStorageSync() {
    window.addEventListener("storage", (event) => {
        const key = event.key || "";
        if (![STORAGE_KEYS.cart, STORAGE_KEYS.cartOwnerId, STORAGE_KEYS.userId, STORAGE_KEYS.tableNumber].includes(key)) {
            return;
        }

        syncCartWithSession();
        renderCart();
    });
}

async function initCartPage() {
    syncCartWithSession();
    bindActionButtons();
    bindStorageSync();

    if (!(await ensureValidCustomerSession())) {
        return;
    }

    try {
        await refreshCustomerState();
    } catch (error) {
        showToast(error.message || "Unable to load cart state");
    }

    renderCart();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCartPage);
} else {
    initCartPage();
}
