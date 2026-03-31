let cart = [];

function showToast(msg) {
    const toast = document.getElementById("toastMsg");
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.add("opacity-100");
    toast.classList.remove("opacity-0");
    setTimeout(() => {
        toast.classList.remove("opacity-100");
        toast.classList.add("opacity-0");
    }, 1800);
}

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

function getOrderingLockKey() {
    const scope = getCurrentSessionId() || getCurrentTableNumber() || "guest";
    return `ordering_locked_after_review_${scope}`;
}

function isOrderingLocked() {
    return localStorage.getItem(getOrderingLockKey()) === "1";
}

function getPendingReviewKey() {
    const scope = getCurrentSessionId() || getCurrentTableNumber() || "guest";
    return `pending_review_payment_${scope}`;
}

function hasPendingReview() {
    return Boolean(localStorage.getItem(getPendingReviewKey()));
}

function isOrderCreationDisabled() {
    return isOrderingLocked() || hasPendingReview();
}

function getOrderingDisabledMessage() {
    return isOrderingLocked()
        ? "Ordering is closed after review"
        : "Please submit the review before making another order";
}

function syncCartWithSession() {
    const sessionOwner = getCurrentSessionId() || getCurrentTableNumber() || "";
    const cartOwner = localStorage.getItem("cart_owner_id") || "";
    const storedCart = safeParseJSON(localStorage.getItem("cart"), []);

    if (sessionOwner && cartOwner && cartOwner !== sessionOwner) {
        cart = [];
        localStorage.setItem("cart", JSON.stringify(cart));
    } else {
        cart = Array.isArray(storedCart) ? storedCart : [];
    }

    if (sessionOwner) {
        localStorage.setItem("cart_owner_id", sessionOwner);
    }
}

function persistCart() {
    const sessionOwner = getCurrentSessionId() || getCurrentTableNumber() || "";
    if (sessionOwner) {
        localStorage.setItem("cart_owner_id", sessionOwner);
    }
    localStorage.setItem("cart", JSON.stringify(cart));
}

function updateSessionNotice() {
    const notice = document.getElementById("cartSessionNotice");
    const sendKitchenBtn = document.getElementById("sendKitchenBtn");
    const clearCartBtn = document.getElementById("clearCartBtn");
    const locked = isOrderingLocked();
    const disabled = isOrderCreationDisabled();

    if (notice) {
        if (locked) {
            notice.innerText = "Payment and review are complete for this session. New orders are disabled.";
            notice.classList.remove("hidden");
        } else if (disabled) {
            notice.innerText = "Payment is already completed. Please submit the review to finish this session.";
            notice.classList.remove("hidden");
        } else {
            notice.innerText = "";
            notice.classList.add("hidden");
        }
    }

    [sendKitchenBtn, clearCartBtn].forEach((button) => {
        if (!button) return;
        button.disabled = disabled;
        button.classList.toggle("opacity-60", disabled);
        button.classList.toggle("cursor-not-allowed", disabled);
    });
}

function renderCart() {
    const container = document.getElementById("cartItemsContainer");
    const totalSpan = document.getElementById("modalTotalPrice");
    const locked = isOrderCreationDisabled();

    if (!container || !totalSpan) return;

    if (!cart.length) {
        container.innerHTML = `<div class="text-center text-[#7a4e2f] py-6">${locked ? "Ordering is closed for this session." : "No items yet. Please add a menu item."}</div>`;
        totalSpan.innerText = "0";
        updateSessionNotice();
        return;
    }

    container.innerHTML = cart.map((item, index) => `
        <div class="flex items-center justify-between gap-3 py-2 border-b border-[#e6d7c7] text-sm">
            <div class="flex-1">
                <strong>${item.name}</strong>
                ${item.thaiName ? `<span class="ml-1 text-[0.7rem] text-[#a97a52]">(${item.thaiName})</span>` : ""}
                <div class="text-[0.7rem] text-[#a97a52] mt-1">${item.optionsText || "Standard"}</div>
                ${item.customerNote ? `<div class="text-[0.75rem] text-[#7a4e2f] mt-1">Note: ${item.customerNote}</div>` : ""}
                <div class="mt-2 flex items-center gap-2">
                    <button class="qty-btn btn btn-xs btn-circle border-none ${locked ? "bg-[#d8cabb] text-[#8b6c53] cursor-not-allowed" : "bg-[#7a4e2f] text-[#fbf5ee]"}" data-action="minus" data-index="${index}" ${locked ? "disabled" : ""}>-</button>
                    <span class="min-w-[24px] text-center font-bold">${item.quantity}</span>
                    <button class="qty-btn btn btn-xs btn-circle border-none ${locked ? "bg-[#d8cabb] text-[#8b6c53] cursor-not-allowed" : "bg-[#7a4e2f] text-[#fbf5ee]"}" data-action="plus" data-index="${index}" ${locked ? "disabled" : ""}>+</button>
                </div>
            </div>
            <div class="font-semibold">${item.price * item.quantity} Baht</div>
        </div>
    `).join("");

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalSpan.innerText = String(total);
    updateSessionNotice();
}

function bindQtyButtons() {
    document.querySelectorAll(".qty-btn").forEach((button) => {
        button.addEventListener("click", () => {
            if (isOrderCreationDisabled()) {
                showToast(getOrderingDisabledMessage());
                return;
            }

            const index = parseInt(button.getAttribute("data-index"), 10);
            if (Number.isNaN(index) || !cart[index]) return;

            const action = button.getAttribute("data-action");
            if (action === "minus") {
                cart[index].quantity = Math.max(1, (cart[index].quantity || 1) - 1);
            } else if (action === "plus") {
                cart[index].quantity = (cart[index].quantity || 1) + 1;
            }

            persistCart();
            renderCart();
            bindQtyButtons();
        });
    });
}

function persistOrderToLocal() {
    if (!cart.length) return false;
    if (isOrderCreationDisabled()) {
        showToast(getOrderingDisabledMessage());
        return false;
    }

    const tableNumber = getCurrentTableNumber() || "-";
    const sessionId = getCurrentSessionId() || "";
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orders = safeParseJSON(localStorage.getItem("orders"), []) || [];

    orders.push({
        id: Date.now(),
        table: tableNumber,
        userId: sessionId,
        items: cart.map((item) => ({
            name: item.name,
            qty: item.quantity,
            price: item.price,
            optionsText: item.optionsText || "",
            customerNote: item.customerNote || ""
        })),
        total,
        time: new Date().toISOString(),
        status: "pending"
    });

    localStorage.setItem("orders", JSON.stringify(orders));
    return true;
}

document.getElementById("clearCartBtn").addEventListener("click", () => {
    if (isOrderCreationDisabled()) {
        showToast(getOrderingDisabledMessage());
        return;
    }

    if (!cart.length) {
        showToast("Cart is already empty");
        return;
    }

    cart = [];
    persistCart();
    renderCart();
    showToast("Cleared all items");
});

document.getElementById("sendKitchenBtn").addEventListener("click", () => {
    if (isOrderCreationDisabled()) {
        showToast(getOrderingDisabledMessage());
        return;
    }

    if (!cart.length) {
        showToast("Please add items before sending");
        return;
    }

    const persisted = persistOrderToLocal();
    if (!persisted) return;

    cart = [];
    persistCart();
    renderCart();
    localStorage.setItem("open_order_status", "1");
    window.location.href = "order_status.html";
});

window.addEventListener("storage", (event) => {
    const eventKey = event.key || "";
    if (
        !["cart", "cart_owner_id", "orders"].includes(eventKey) &&
        !eventKey.startsWith("ordering_locked_after_review_") &&
        !eventKey.startsWith("pending_review_payment_")
    ) {
        return;
    }
    syncCartWithSession();
    renderCart();
    bindQtyButtons();
});

syncCartWithSession();
renderCart();
bindQtyButtons();
