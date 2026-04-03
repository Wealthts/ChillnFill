// 1. Fetch orders from API
async function getOrders() {
    try {
        const response = await fetch('/api/orders'); 
        if (response.ok) {
            const orders = await response.json();
            localStorage.setItem("orders", JSON.stringify(orders));
            return orders;
        }
        return JSON.parse(localStorage.getItem("orders") || "[]");
    } catch (error) {
        console.error("Network error:", error);
        return JSON.parse(localStorage.getItem("orders") || "[]");
    }
}

// 2. Core Function: Assign Cook ID to Order in Database

async function assignCookToOrder(orderId) {
    // 1. ดึง ID จริงที่เก็บไว้ตอน Login (ต้องชื่อเดียวกับที่หนู setItem ไว้นะลูก)
    const currentCookId = localStorage.getItem("cook_id");

    // 2. Security Check: ถ้าไม่มี ID (ไม่ได้ Login) ห้ามทำเด็ดขาด!
    if (!currentCookId) {
        alert("⚠️ Access Denied! Please login as a cook to accept this order.");
        window.location.href = "staff.html"; // พาไปหน้า Login ทันที
        return;
    }

    console.log(`[System] Processing Order #${orderId} by Cook ID: ${currentCookId}`);

    try {
        // 3. พยายามส่งไปหา API (ใช้ ID จริงจากระบบ)
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                cook_id: currentCookId, // ส่ง ID ที่ได้จากการ Login จริงๆ
                status: 'cooking' 
            })
        });

        if (response.ok) {
            console.log("✅ API Success: Linked to Database.");
            await refreshAllData();
            return;
        }
    } catch (err) {
        console.warn("⚠️ API Failed (Server Offline). Switching to Local Mock Mode.");
    }

    // 4. แผนสำรอง: ทำในเครื่องตัวเอง (Mock Mode)
    let orders = JSON.parse(localStorage.getItem("orders") || "[]");
    const idx = orders.findIndex(o => String(o.id) === String(orderId));
    
    if (idx !== -1) {
        // ใช้ currentCookId ที่เราเช็กแล้วว่ามีตัวตนจริงๆ
        orders[idx].cook_id = currentCookId;
        orders[idx].status = 'cooking';
        localStorage.setItem("orders", JSON.stringify(orders));
        
        console.log(`🚀 Mock Success: Order #${orderId} assigned to Cook ID: ${currentCookId} locally.`);
        await refreshAllData(); 
    }
}
// 3. Update Status (e.g., Mark as Served)
async function updateOrderStatus(orderId, nextStatus) {
    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus })
        });
        if (response.ok) await refreshAllData();
    } catch (err) {
        console.error("Update failed:", err);
    }
}

// 4. Security & Formatting Helpers
function escapeHtml(text) {
    return String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

function getStatusClass(status) {
    const s = String(status || "pending").toLowerCase();
    if (s === "serving") return "bg-[#dff3e4] text-[#1f7a3d]";
    if (s === "cooking") return "bg-[#e5f0ff] text-[#1b4d8f]";
    return "bg-[#fff1cc] text-[#9a6a00]";
}

function isServedOrderStatus(status) {
    return ["serving", "served", "completed", "done"].includes(String(status || "").toLowerCase());
}

function formatTime(value) {
    const date = new Date(value || 0);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString('en-US');
}

// 5. Render Orders with Search Functionality
// 5. Render Orders with Security Check
async function renderOrders() {
    const container = document.getElementById("ordersContainer");
    const searchInput = document.getElementById("orderSearchInput");
    if (!container) return;

    const allOrders = await getOrders();
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    
    // ดึง cook_id มาเช็คสถานะการ Login
    const currentCookId = localStorage.getItem("cook_id");

    const filteredOrders = allOrders.filter(order => 
        String(order.id).toLowerCase().includes(searchTerm) || 
        String(order.table).toLowerCase().includes(searchTerm)
    ).sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

    if (!filteredOrders.length) {
        container.innerHTML = `<div class="rounded-[24px] border border-[#e6d7c7] bg-[#fbf5ee] p-6 text-center text-[#a97a52]">No orders found</div>`;
        return;
    }

    container.innerHTML = filteredOrders.map((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        const itemsHtml = items.map((item) => `<div>- ${escapeHtml(item.name)} x${Number(item.qty || 0)}</div>`).join("");
        const status = String(order.status || "pending").toLowerCase();

        let actionUI = "";
        if (status === "pending") {
            // --- เช็คเงื่อนไขปุ่ม Accept ตรงนี้ลูก ---
            if (currentCookId) {
                // ✅ มี ID จริง: โชว์ปุ่มปกติ
                actionUI = `<button onclick="assignCookToOrder('${order.id}')" class="btn btn-sm w-full bg-[#7a4e2f] text-white border-none mt-3">Accept Order</button>`;
            } else {
                // ❌ ไม่มี ID: ปิดปุ่ม (Disabled) และเปลี่ยนสีเป็นเทา
                actionUI = `<button disabled class="btn btn-sm w-full bg-gray-400 text-white border-none mt-3 cursor-not-allowed">Please Login to Accept</button>`;
            }
        } else if (status === "cooking") {
            actionUI = `
                <div class="mt-3 p-2 bg-white rounded-lg border border-[#e5f0ff]">
                    <div class="text-xs font-bold text-[#1b4d8f] mb-2">🧑‍🍳 Cooking by ID: ${order.cook_id || '-'}</div>
                    <button onclick="updateOrderStatus('${order.id}', 'serving')" class="btn btn-xs w-full bg-[#1b4d8f] text-white border-none">Mark as Served</button>
                </div>`;
        }

        return `
            <div class="card bg-[#fbf5ee] border border-[#e6d7c7] shadow hover:shadow-md transition-shadow">
                <div class="card-body p-5">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="font-bold text-lg">Order #${escapeHtml(order.id)}</div>
                            <div class="text-sm text-[#a97a52]">Table: ${escapeHtml(order.table || "-")} • ${formatTime(order.time)}</div>
                        </div>
                        <div class="px-3 py-1 rounded-full text-xs font-bold ${getStatusClass(status)}">${status.toUpperCase()}</div>
                    </div>
                    <div class="mt-3 text-sm text-[#5f4028] bg-white/50 p-2 rounded-lg">${itemsHtml}</div>
                    <div class="mt-2 font-semibold border-t border-[#e6d7c7] pt-2">Total: ${Number(order.total || 0)} Baht</div>
                    ${actionUI}
                </div>
            </div>
        `;
    }).join("");
}

// 6. Dashboard & Statistics
async function renderDashboard() {
    const container = document.getElementById("cookDashboardContainer");
    if (!container) return;
    const orders = await getOrders();
    const servedOrders = orders.filter((order) => isServedOrderStatus(order.status));
    let servedCount = 0;
    servedOrders.forEach(o => (o.items || []).forEach(i => servedCount += Number(i.qty || 0)));

    container.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div class="card bg-[#fbf5ee] border border-[#e6d7c7] p-4 text-center">
                <div class="text-xs text-[#a97a52]">Total Served</div>
                <div class="text-2xl font-bold">${servedCount} Menus</div>
            </div>
            <div class="card bg-[#fbf5ee] border border-[#e6d7c7] p-4 text-center">
                <div class="text-xs text-[#a97a52]">Cook Status</div>
                <div class="text-sm font-bold text-[#1f7a3d]">Online ✅</div>
            </div>
        </div>
    `;
}

// 7. Utility & Init
async function refreshAllData() {
    await renderOrders();
    await renderDashboard();
}

function initCookPage() {
    renderCookIdentity();
    refreshAllData();

    const searchInput = document.getElementById("orderSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", renderOrders);
    }

    setInterval(refreshAllData, 5000);

    document.getElementById("showOrdersBtn")?.addEventListener("click", () => showSection("orders"));
    document.getElementById("showDashboardBtn")?.addEventListener("click", () => showSection("dashboard"));
    document.getElementById("logoutCookBtn")?.addEventListener("click", logoutCook);
}

function renderCookIdentity() {
    const name = localStorage.getItem("cook_name");
    const id = localStorage.getItem("cook_id");
    const el = document.getElementById("cookIdentity");
    
    if (el) {
        if (id && name) {
            el.innerText = `${name} (ID: ${id})`;
        } else {
            el.innerText = "Guest Cook (Please Login)"; // ให้มันโชว์เลยว่ายังไม่ได้ Login
            el.classList.add("text-red-500"); // ใส่สีแดงเตือนไปเลยลูก!
        }
    }
}
function showSection(section) {
    document.getElementById("cookOrdersSection")?.classList.toggle("hidden", section !== "orders");
    document.getElementById("cookDashboardSection")?.classList.toggle("hidden", section !== "dashboard");
    document.getElementById("cookReviewsSection")?.classList.toggle("hidden", section !== "reviews");
}

async function logoutCook() {
    localStorage.clear();
    window.location.href = "staff.html";
}

initCookPage();