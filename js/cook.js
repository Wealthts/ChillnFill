function getOrders() {
    return JSON.parse(localStorage.getItem("orders") || "[]");
}

function saveOrders(orders) {
    localStorage.setItem("orders", JSON.stringify(orders));
}

function getReviews() {
    return JSON.parse(localStorage.getItem("reviews") || "[]");
}

function escapeHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getStatusClass(status) {
    const s = String(status || "pending").toLowerCase();
    if (s === "serving") return "bg-[#dff3e4] text-[#1f7a3d]";
    if (s === "cooking") return "bg-[#e5f0ff] text-[#1b4d8f]";
    return "bg-[#fff1cc] text-[#9a6a00]";
}

function isServedOrderStatus(status) {
    const normalized = String(status || "").toLowerCase();
    return ["serving", "served", "completed", "done"].includes(normalized);
}

function formatTime(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
}

function renderCookIdentity() {
    const cookName = localStorage.getItem("cook_name") || "Cook";
    const cookId = localStorage.getItem("cook_id") || "-";
    const el = document.getElementById("cookIdentity");
    if (el) {
        el.innerText = `${cookName} (ID: ${cookId})`;
    }
}

function renderOrders() {
    const container = document.getElementById("ordersContainer");
    if (!container) return;

    const orders = getOrders().sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
    if (!orders.length) {
        container.innerHTML = `<div class="rounded-[24px] border border-[#e6d7c7] bg-[#fbf5ee] p-6 text-center text-[#a97a52]">No orders yet</div>`;
        return;
    }

    container.innerHTML = orders.map((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        const itemsHtml = items.length
            ? items.map((item) => `<div>- ${escapeHtml(item.name)} x${Number(item.qty || 0)}</div>`).join("")
            : "-";
        const status = String(order.status || "pending").toLowerCase();

        return `
            <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow">
                <div class="card-body">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div class="font-bold text-lg">Order #${escapeHtml(order.id)}</div>
                            <div class="text-sm text-[#a97a52]">Table ${escapeHtml(order.table || "-")} • ${formatTime(order.time)}</div>
                        </div>
                        <div class="px-3 py-1 rounded-full text-xs font-bold ${getStatusClass(status)}">${status.toUpperCase()}</div>
                    </div>

                    <div class="mt-2 text-sm text-[#5f4028]">${itemsHtml}</div>
                    <div class="mt-2 font-semibold">Total: ${Number(order.total || 0)} Baht</div>

                    <div class="mt-3 flex items-center gap-3">
                        <span class="text-sm font-semibold">Status</span>
                        <select class="select select-sm bg-[#fffaf5] border-[#e6d7c7]" data-order-id="${escapeHtml(order.id)}">
                            <option value="pending" ${status === "pending" ? "selected" : ""}>Pending</option>
                            <option value="cooking" ${status === "cooking" ? "selected" : ""}>Cooking</option>
                            <option value="serving" ${status === "serving" ? "selected" : ""}>Serving</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    container.querySelectorAll("select[data-order-id]").forEach((selectEl) => {
        selectEl.addEventListener("change", (event) => {
            const orderId = selectEl.dataset.orderId;
            const nextStatus = event.target.value;
            updateOrderStatus(orderId, nextStatus);
        });
    });
}

function renderDashboard() {
    const container = document.getElementById("cookDashboardContainer");
    if (!container) return;

    const orders = getOrders();
    const servedOrders = orders.filter((order) => isServedOrderStatus(order.status));

    let servedMenusCount = 0;
    const menuCounts = {};

    servedOrders.forEach((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        items.forEach((item) => {
            const qty = Number(item.qty || 0);
            servedMenusCount += qty;
            const name = String(item.name || "").trim();
            if (!name) return;
            menuCounts[name] = (menuCounts[name] || 0) + qty;
        });
    });

    let topMenu = "-";
    let topMenuCount = 0;
    Object.entries(menuCounts).forEach(([name, count]) => {
        if (count > topMenuCount) {
            topMenu = name;
            topMenuCount = count;
        }
    });

    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow">
          <div class="card-body">
            <div class="text-sm text-[#a97a52]">Served Menus</div>
            <div class="text-2xl font-extrabold text-[#5f4028]">${servedMenusCount}</div>
          </div>
        </div>
        <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow">
          <div class="card-body">
            <div class="text-sm text-[#a97a52]">Top Menu Served</div>
            <div class="text-2xl font-extrabold text-[#5f4028]">${escapeHtml(topMenu)}</div>
            <div class="text-xs text-[#a97a52]">${topMenuCount ? `${topMenuCount} servings` : "No served menu yet"}</div>
          </div>
        </div>
      </div>
    `;
}

function renderReviews() {
    const container = document.getElementById("cookReviewsContainer");
    if (!container) return;

    const reviews = getReviews().sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
    const avg = reviews.length
        ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
        : "0.0";

    if (!reviews.length) {
        container.innerHTML = `
          <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow">
            <div class="card-body">
              <div class="text-sm text-[#a97a52]">Average Rating</div>
              <div class="text-2xl font-extrabold text-[#5f4028]">${avg}</div>
              <div class="text-sm text-[#a97a52] mt-2">No reviews yet</div>
            </div>
          </div>
        `;
        return;
    }

    container.innerHTML = `
      <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow mb-4">
        <div class="card-body">
          <div class="text-sm text-[#a97a52]">Average Rating</div>
          <div class="text-2xl font-extrabold text-[#5f4028]">${avg} / 5</div>
        </div>
      </div>
      ${reviews.map((review) => `
        <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow">
          <div class="card-body">
            <div class="flex items-center justify-between gap-3">
              <div class="font-bold text-[#5f4028]">⭐ ${Number(review.rating || 0)} / 5</div>
              <div class="text-xs text-[#a97a52]">${formatTime(review.time)}</div>
            </div>
            <div class="text-sm text-[#5f4028] mt-2">${escapeHtml(review.comment || "-")}</div>
            <div class="text-xs text-[#a97a52] mt-1">Table: ${escapeHtml(review.table || "-")}</div>
          </div>
        </div>
      `).join("")}
    `;
}

function updateOrderStatus(orderId, nextStatus) {
    const orders = getOrders();
    const idx = orders.findIndex((order) => String(order.id) === String(orderId));
    if (idx === -1) return;

    orders[idx].status = nextStatus;
    saveOrders(orders);
    renderOrders();
    renderDashboard();
}

function logoutCook() {
    localStorage.removeItem("user_type");
    localStorage.removeItem("cook_id");
    localStorage.removeItem("cook_name");
    window.location.href = "staff.html";
}

function showSection(section) {
    const ordersSection = document.getElementById("cookOrdersSection");
    const dashboardSection = document.getElementById("cookDashboardSection");
    const reviewsSection = document.getElementById("cookReviewsSection");

    if (ordersSection) ordersSection.classList.toggle("hidden", section !== "orders");
    if (dashboardSection) dashboardSection.classList.toggle("hidden", section !== "dashboard");
    if (reviewsSection) reviewsSection.classList.toggle("hidden", section !== "reviews");

    const showOrdersBtn = document.getElementById("showOrdersBtn");
    const showDashboardBtn = document.getElementById("showDashboardBtn");
    const showReviewsBtn = document.getElementById("showReviewsBtn");

    [showOrdersBtn, showDashboardBtn, showReviewsBtn].forEach((button) => {
        if (!button) return;
        button.classList.remove("bg-[#7a4e2f]", "text-[#fbf5ee]", "border-none");
        button.classList.add("bg-[#efe4d8]", "text-[#5f4028]", "border", "border-[#e6d7c7]");
    });

    const activeBtn = section === "orders" ? showOrdersBtn : section === "dashboard" ? showDashboardBtn : showReviewsBtn;
    if (activeBtn) {
        activeBtn.classList.remove("bg-[#efe4d8]", "text-[#5f4028]", "border", "border-[#e6d7c7]");
        activeBtn.classList.add("bg-[#7a4e2f]", "text-[#fbf5ee]", "border-none");
    }
}

function initCookPage() {
    const userType = (localStorage.getItem("user_type") || "").toLowerCase();
    if (userType !== "cook") {
        window.location.href = "staff.html";
        return;
    }

    renderCookIdentity();
    renderOrders();
    renderDashboard();
    renderReviews();
    showSection("orders");

    const logoutBtn = document.getElementById("logoutCookBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", logoutCook);

    const showOrdersBtn = document.getElementById("showOrdersBtn");
    const showDashboardBtn = document.getElementById("showDashboardBtn");
    const showReviewsBtn = document.getElementById("showReviewsBtn");

    if (showOrdersBtn) showOrdersBtn.addEventListener("click", () => showSection("orders"));
    if (showDashboardBtn) showDashboardBtn.addEventListener("click", () => {
        renderDashboard();
        showSection("dashboard");
    });
    if (showReviewsBtn) showReviewsBtn.addEventListener("click", () => {
        renderReviews();
        showSection("reviews");
    });

    setInterval(() => {
        renderOrders();
        renderDashboard();
        renderReviews();
    }, 2000);
}

initCookPage();
