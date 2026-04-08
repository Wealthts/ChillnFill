/*
 * Cook Page Script
 * 1. STATE VARIABLES
 * 2. HELPER FUNCTIONS
 * 3. HTML BUILDERS
 * 4. RENDER FUNCTIONS
 * 5. API FUNCTIONS
 * 6. EVENT BINDINGS
 */

const REFRESH_TIME_MS = 5000;

let orderList = [];
let reviewList = [];
let dashboardData = {};
let currentSection = "orders";

function getElement(id) {
    return document.getElementById(id);
}

function textValue(value) {
    if (value === undefined || value === null) return "";
    return String(value);
}

function numberValue(value) {
    const output = Number(value);
    if (Number.isFinite(output)) return output;
    return 0;
}

function escapeHtml(value) {
    return textValue(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function normalizeStatus(status, fallback) {
    const output = textValue(status || fallback || "pending").trim().toLowerCase();
    if (!output) return fallback || "pending";
    return output;
}

function formatDateTime(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
}

function showErrorAlert(message, title = "Error") {
    const text = textValue(message);
    if (window.Swal) {
        window.Swal.fire({
            icon: "error",
            title,
            text,
            confirmButtonColor: "#7a4e2f"
        });
        return;
    }
    console.warn("SweetAlert2 is unavailable:", text);
}

function getCookId() {
    return localStorage.getItem("cook_id") || "";
}

function getCookName() {
    return localStorage.getItem("cook_name") || "Cook";
}

function clearCookSession() {
    localStorage.removeItem("user_type");
    localStorage.removeItem("cook_id");
    localStorage.removeItem("cook_name");
}

function goToStaffPage() {
    window.location.href = "staff.html";
}

function handleUnauthorized(response) {
    if (!response || response.status !== 401) return false;
    clearCookSession();
    goToStaffPage();
    return true;
}

function getOrderItems(order) {
    if (order && Array.isArray(order.items)) return order.items;
    return [];
}

function getAssignedCookId(item) {
    return textValue((item && (item.cookId || item.cook_id)) || "").trim();
}

function getItemQuantity(item) {
    if (!item) return 0;
    if (item.qty !== undefined && item.qty !== null) return numberValue(item.qty);
    return numberValue(item.quantity);
}

function isFinalStatus(status) {
    const output = normalizeStatus(status, "pending");
    return output === "completed" || output === "cancelled";
}

function isServedStatus(status) {
    const output = normalizeStatus(status, "pending");
    return output === "serving" || output === "served" || output === "completed" || output === "done";
}

function getStatusColor(status) {
    const output = normalizeStatus(status, "pending");

    if (output === "completed" || output === "serving") {
        return "bg-[#dff3e4] text-[#1f7a3d]";
    }
    if (output === "cooking") {
        return "bg-[#e5f0ff] text-[#1b4d8f]";
    }
    if (output === "cancelled") {
        return "bg-[#fde2e2] text-[#b42318]";
    }
    return "bg-[#fff1cc] text-[#9a6a00]";
}

function getStatusBadgeHtml(status) {
    return '<div class="px-3 py-1 rounded-full text-xs font-bold ' + getStatusColor(status) + '">' + escapeHtml(textValue(status).toUpperCase()) + '</div>';
}

function getEmptyBoxHtml(message) {
    return '<div class="rounded-3xl border border-[#e6d7c7] bg-[#fbf5ee] p-6 text-center text-[#a97a52]">' + escapeHtml(message) + '</div>';
}

function setSectionButtonStyle(button, isActive) {
    if (!button) return;

    if (isActive) {
        button.className = "btn btn-sm rounded-full bg-[#7a4e2f] text-[#fbf5ee] border-none";
        return;
    }

    button.className = "btn btn-sm rounded-full bg-[#efe4d8] text-[#5f4028] border border-[#e6d7c7]";
}

function showCookIdentity() {
    const identityBox = getElement("cookIdentity");
    if (!identityBox) return;
    identityBox.innerText = getCookName() + " (ID: " + (getCookId() || "-") + ")";
}

function buildOrderItemHtml(item) {
    const itemId = textValue(item && item.id);
    const itemName = textValue(item && item.name) || "Unknown menu";
    const quantity = getItemQuantity(item);
    const notes = textValue(item && item.notes).trim();
    const itemStatus = normalizeStatus(item && item.status, "pending");
    const assignedCookId = getAssignedCookId(item);
    const myCookId = getCookId();
    const isMyItem = assignedCookId && assignedCookId === myCookId;
    const canClaim = !isFinalStatus(itemStatus) && (!assignedCookId || assignedCookId === myCookId) && !isMyItem;

    let assignedText = "Unassigned";
    if (assignedCookId) {
        if (assignedCookId === myCookId) {
            assignedText = "Assigned to you";
        } else {
            assignedText = "Assigned to " + assignedCookId;
        }
    }

    let notesHtml = "";
    if (notes) {
        notesHtml = '<div class="mt-1 text-xs text-[#a97a52]">' + escapeHtml(notes) + '</div>';
    }

    let claimButtonHtml = "";
    if (canClaim) {
        claimButtonHtml = '<button class="btn btn-sm rounded-full bg-[#7a4e2f] text-[#fbf5ee] border-none" data-claim-item-id="' + escapeHtml(itemId) + '">Claim Item</button>';
    }

    let actionsHtml = "";
    if (claimButtonHtml) {
        actionsHtml = '<div class="mt-3 flex flex-wrap items-center gap-3">' + claimButtonHtml + '</div>';
    }

    return `
        <div class="rounded-2xl border border-[#e6d7c7] bg-[#fffaf5] p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div class="font-medium text-[#5f4028]">${escapeHtml(itemName)} x${quantity}</div>
                    <div class="mt-1 text-xs text-[#a97a52]">Item ID: ${escapeHtml(itemId || "-")}</div>
                    <div class="mt-1 text-xs font-semibold ${assignedCookId ? "text-[#7a4e2f]" : "text-[#a97a52]"}">${escapeHtml(assignedText)}</div>
                    ${notesHtml}
                </div>
                ${getStatusBadgeHtml(itemStatus)}
            </div>
            ${actionsHtml}
        </div>
    `;
}

function buildOrderCardHtml(order) {
    const items = getOrderItems(order);

    let itemsHtml = '<div class="text-sm text-[#a97a52]">No items found</div>';
    if (items.length > 0) {
        itemsHtml = items.map(buildOrderItemHtml).join("");
    }

    const orderId = textValue(order && order.id) || "-";
    const tableNumber = textValue(order && order.table) || "-";
    const orderTime = formatDateTime(order && order.time);
    const orderStatus = normalizeStatus(order && order.status, "pending");
    const total = numberValue(order && order.total);

    return `
        <div class="card border border-[#e6d7c7] bg-[#fbf5ee] shadow-sm">
            <div class="card-body">
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div class="text-lg font-bold text-[#5f4028]">Order #${escapeHtml(orderId)}</div>
                        <div class="text-sm text-[#a97a52]">Table ${escapeHtml(tableNumber)} | ${escapeHtml(orderTime)}</div>
                    </div>
                    ${getStatusBadgeHtml(orderStatus)}
                </div>
                <div class="mt-4 grid gap-3">${itemsHtml}</div>
                <div class="mt-3 font-semibold text-[#5f4028]">Total: ${total} Baht</div>
            </div>
        </div>
    `;
}

function buildDashboardBoxHtml(title, value, extraText) {
    let extraHtml = "";
    if (extraText) {
        extraHtml = '<div class="mt-1 text-xs text-[#a97a52]">' + escapeHtml(extraText) + '</div>';
    }

    return `
        <div class="card border border-[#e6d7c7] bg-[#fbf5ee] shadow-sm">
            <div class="card-body">
                <div class="text-sm text-[#a97a52]">${escapeHtml(title)}</div>
                <div class="text-2xl font-extrabold text-[#5f4028]">${escapeHtml(value)}</div>
                ${extraHtml}
            </div>
        </div>
    `;
}

function buildReviewCardHtml(review) {
    return `
        <div class="card border border-[#e6d7c7] bg-[#fbf5ee] shadow-sm">
            <div class="card-body">
                <div class="flex items-center justify-between gap-3">
                    <div class="font-bold text-[#5f4028]">Rating ${numberValue(review && review.rating)} / 5</div>
                    <div class="text-xs text-[#a97a52]">${escapeHtml(formatDateTime(review && (review.created_at || review.time)))}</div>
                </div>
                <div class="mt-2 text-sm text-[#5f4028]">${escapeHtml((review && review.comment) || "-")}</div>
                <div class="mt-1 text-xs text-[#a97a52]">Table: ${escapeHtml((review && review.table) || "-")}</div>
            </div>
        </div>
    `;
}

function bindOrderButtons() {
    const ordersContainer = getElement("ordersContainer");
    if (!ordersContainer) return;

    const claimButtons = ordersContainer.querySelectorAll("button[data-claim-item-id]");
    claimButtons.forEach(function (button) {
        button.addEventListener("click", async function () {
            await claimItem(button.dataset.claimItemId);
        });
    });
}

function renderOrders(isLoading) {
    const ordersContainer = getElement("ordersContainer");
    if (!ordersContainer) return;

    if (isLoading && orderList.length === 0) {
        ordersContainer.innerHTML = getEmptyBoxHtml("Loading orders...");
        return;
    }

    const sortedOrders = orderList.slice().sort(function (a, b) {
        return new Date((b && b.time) || 0).getTime() - new Date((a && a.time) || 0).getTime();
    });

    if (sortedOrders.length === 0) {
        ordersContainer.innerHTML = getEmptyBoxHtml("No kitchen orders right now");
        return;
    }

    ordersContainer.innerHTML = sortedOrders.map(buildOrderCardHtml).join("");
    bindOrderButtons();
}

function getTopServedMenu(orders) {
    const menuCount = {};
    let topMenuName = "-";
    let topMenuCount = 0;

    for (let i = 0; i < orders.length; i += 1) {
        const items = getOrderItems(orders[i]);

        for (let j = 0; j < items.length; j += 1) {
            const item = items[j];
            if (!isServedStatus(item && item.status)) continue;

            const itemName = textValue(item && item.name).trim();
            if (!itemName) continue;

            menuCount[itemName] = (menuCount[itemName] || 0) + getItemQuantity(item);
        }
    }

    const menuNames = Object.keys(menuCount);
    for (let i = 0; i < menuNames.length; i += 1) {
        const menuName = menuNames[i];
        if (menuCount[menuName] > topMenuCount) {
            topMenuName = menuName;
            topMenuCount = menuCount[menuName];
        }
    }

    return {
        name: topMenuName,
        count: topMenuCount
    };
}

function renderDashboard() {
    const dashboardContainer = getElement("cookDashboardContainer");
    if (!dashboardContainer) return;

    const summary = dashboardData.summary || {};
    const recentOrders = Array.isArray(dashboardData.recent_orders) ? dashboardData.recent_orders : [];
    const topMenu = getTopServedMenu(recentOrders);

    dashboardContainer.innerHTML = `
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            ${buildDashboardBoxHtml("Pending Orders", numberValue(summary.pending))}
            ${buildDashboardBoxHtml("Cooking Orders", numberValue(summary.cooking))}
            ${buildDashboardBoxHtml("Serving Orders", numberValue(summary.serving))}
            ${buildDashboardBoxHtml("Top Menu Served", topMenu.name, topMenu.count ? topMenu.count + " servings" : "No served menu yet")}
        </div>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
            ${buildDashboardBoxHtml("Completed Orders", numberValue(summary.completed))}
            ${buildDashboardBoxHtml("Active Cooks", numberValue(summary.active_cooks) + " / " + numberValue(summary.total_cooks))}
        </div>
    `;
}

function renderReviews() {
    const reviewsContainer = getElement("cookReviewsContainer");
    if (!reviewsContainer) return;

    const sortedReviews = reviewList.slice().sort(function (a, b) {
        return new Date((b && (b.created_at || b.time)) || 0).getTime() - new Date((a && (a.created_at || a.time)) || 0).getTime();
    });

    let averageRating = 0;
    if (sortedReviews.length > 0) {
        let totalRating = 0;
        for (let i = 0; i < sortedReviews.length; i += 1) {
            totalRating += numberValue(sortedReviews[i] && sortedReviews[i].rating);
        }
        averageRating = totalRating / sortedReviews.length;
    }

    if (sortedReviews.length === 0) {
        reviewsContainer.innerHTML = buildDashboardBoxHtml("Average Rating", averageRating.toFixed(1), "No reviews yet");
        return;
    }

    const reviewCards = sortedReviews.map(buildReviewCardHtml).join("");
    reviewsContainer.innerHTML = `
        <div class="mb-4">
            ${buildDashboardBoxHtml("Average Rating", averageRating.toFixed(1) + " / 5")}
        </div>
        ${reviewCards}
    `;
}

function showSection(sectionName) {
    currentSection = sectionName || "orders";

    const ordersSection = getElement("cookOrdersSection");
    const dashboardSection = getElement("cookDashboardSection");
    const reviewsSection = getElement("cookReviewsSection");

    if (ordersSection) ordersSection.classList.toggle("hidden", currentSection !== "orders");
    if (dashboardSection) dashboardSection.classList.toggle("hidden", currentSection !== "dashboard");
    if (reviewsSection) reviewsSection.classList.toggle("hidden", currentSection !== "reviews");

    setSectionButtonStyle(getElement("showOrdersBtn"), currentSection === "orders");
    setSectionButtonStyle(getElement("showDashboardBtn"), currentSection === "dashboard");
    setSectionButtonStyle(getElement("showReviewsBtn"), currentSection === "reviews");
}

async function requestJson(url, options, errorMessage) {
    const fetchOptions = Object.assign({ credentials: "same-origin" }, options || {});
    const response = await fetch(url, fetchOptions);

    let data = {};
    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }

    if (handleUnauthorized(response)) {
        return null;
    }

    if (!response.ok || !data.success) {
        throw new Error(textValue(data.message) || errorMessage || "Request failed");
    }

    return data;
}

async function loadOrders() {
    renderOrders(true);

    try {
        const result = await requestJson("/api/orders", {}, "Unable to load orders");
        if (!result) return;
        orderList = Array.isArray(result.orders) ? result.orders : [];
    } catch (error) {
        console.error("loadOrders failed:", error);
    }

    renderOrders(false);
    renderDashboard();
}

async function loadDashboard() {
    try {
        const result = await requestJson("/api/cook/dashboard", {}, "Unable to load dashboard");
        if (!result) return;
        dashboardData = result;
        renderDashboard();
    } catch (error) {
        console.error("loadDashboard failed:", error);
    }
}

async function loadReviews() {
    try {
        const result = await requestJson("/api/reviews", {}, "Unable to load reviews");
        if (!result) return;
        reviewList = Array.isArray(result.reviews) ? result.reviews : [];
        renderReviews();
    } catch (error) {
        console.error("loadReviews failed:", error);
    }
}

async function claimItem(itemId) {
    if (!itemId) return;

    try {
        const url = "/api/order-items/" + encodeURIComponent(itemId) + "/claim";
        const result = await requestJson(url, { method: "POST" }, "Unable to claim item");
        if (!result) return;
        await loadOrders();
    } catch (error) {
        console.error("claimItem failed:", error);
        showErrorAlert(error.message || "Unable to claim item");
    }
}

async function logoutCook() {
    try {
        await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
    } catch (error) {
        console.warn("Logout API failed:", error);
    }

    clearCookSession();
    goToStaffPage();
}

function refreshAllData() {
    loadOrders();
    loadDashboard();
    loadReviews();
}

function bindPageButtons() {
    const logoutButton = getElement("logoutCookBtn");
    if (logoutButton) logoutButton.addEventListener("click", logoutCook);

    const ordersButton = getElement("showOrdersBtn");
    if (ordersButton) {
        ordersButton.addEventListener("click", function () {
            showSection("orders");
            loadOrders();
        });
    }

    const dashboardButton = getElement("showDashboardBtn");
    if (dashboardButton) {
        dashboardButton.addEventListener("click", function () {
            showSection("dashboard");
            loadDashboard();
        });
    }

    const reviewsButton = getElement("showReviewsBtn");
    if (reviewsButton) {
        reviewsButton.addEventListener("click", function () {
            showSection("reviews");
            loadReviews();
        });
    }
}

function startCookPage() {
    const userType = normalizeStatus(localStorage.getItem("user_type"), "");
    if (userType !== "cook") {
        goToStaffPage();
        return;
    }

    showCookIdentity();
    renderOrders(false);
    renderDashboard();
    renderReviews();
    showSection("orders");
    bindPageButtons();
    refreshAllData();
    setInterval(refreshAllData, REFRESH_TIME_MS);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startCookPage);
} else {
    startCookPage();
}
