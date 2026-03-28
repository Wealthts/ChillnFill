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

    const menuDatabase = [
        {
            id: 1,
            name: "Basil Fried Rice",
            thaiName: "ข้าวผัดกระเพรา",
            price: 65,
            category: "single",
            desc: "Crispy chicken basil rice with fried egg",
            hasOptions: true,
            optionKeys: ["spice"],
            image: "img/pad krapow.jpg"
        },
        {
            id: 2,
            name: "Tom Yum Goong",
            thaiName: "ต้มยำกุ้ง",
            price: 120,
            category: "tomyum",
            desc: "Clear spicy shrimp tom yum soup",
            hasOptions: true,
            optionKeys: ["spice"],
            image: "img/tom yum kung.jpg"
        },
        {
            id: 3,
            name: "Pad Thai",
            thaiName: "ผัดไทย",
            price: 70,
            category: "single",
            desc: "Thai stir‑fried noodles with shrimp",
            hasOptions: true,
            optionKeys: ["spice"],
            image: "img/pad thai shrimp.jpg"
        },
        {
            id: 4,
            name: "Hainanese Chicken Rice",
            thaiName: "ข้าวมันไก่",
            price: 60,
            category: "single",
            desc: "Steamed chicken rice with special sauce",
            hasOptions: false,
            optionKeys: [],
            image: "images/kaomunkai.jpg"
        },
        {
            id: 5,
            name: "Som Tam Thai",
            thaiName: "ส้มตำไทย",
            price: 55,
            category: "salad",
            desc: "Spicy green papaya salad",
            hasOptions: true,
            optionKeys: ["spice"],
            image: "images/somtam.jpg"
        },
        {
            id: 6,
            name: "Korean BBQ Beef",
            thaiName: "เนื้อย่างเกาหลี",
            price: 180,
            category: "main",
            desc: "Korean‑style marinated grilled beef",
            hasOptions: true,
            optionKeys: ["doneness"],
            image: "images/beef.jpg"
        },
        {
            id: 7,
            name: "Beef Basil",
            thaiName: "กระเพราเนื้อ",
            price: 85,
            category: "single",
            desc: "Minced beef basil with fried egg",
            hasOptions: true,
            optionKeys: ["spice"],
            image: "images/beef-basil.jpg"
        },
        {
            id: 8,
            name: "Lime Juice",
            thaiName: "น้ำมะนาว",
            price: 25,
            category: "drink",
            desc: "Fresh lime juice",
            hasOptions: true,
            optionKeys: ["sweet", "ice"],
            image: "images/lemon.jpg"
        },
        {
            id: 9,
            name: "Green Tea",
            thaiName: "ชาเขียว",
            price: 30,
            category: "drink",
            desc: "Iced green tea",
            hasOptions: true,
            optionKeys: ["sweet", "ice"],
            image: "images/greentea.jpg"
        },
        {
            id: 10,
            name: "Ice Cream",
            thaiName: "ไอศครีม",
            price: 35,
            category: "dessert",
            desc: "Vanilla ice cream",
            hasOptions: true,
            optionKeys: ["size"],
            image: "images/icecream.jpg"
        },
        {
            id: 11,
            name: "Crispy Pork Basil",
            thaiName: "กระเพราหมูกรอบ",
            price: 70,
            category: "single",
            desc: "Crispy pork basil rice",
            hasOptions: true,
            optionKeys: ["spice"],
            image: "images/crispy-pork.jpg"
        },
        {
            id: 12,
            name: "Seafood Tom Yum",
            thaiName: "ต้มยำทะเล",
            price: 150,
            category: "tomyum",
            desc: "Mixed seafood tom yum soup",
            hasOptions: true,
            optionKeys: ["spice"],
            image: "images/seafood-tomyum.jpg"
        },
        {
            id: 13,
            name: "Soda",
            thaiName: "น้ำอัดลม",
            price: 20,
            category: "drink",
            desc: "Soda, Coke, Sprite",
            hasOptions: true,
            optionKeys: ["sweet", "ice"],
            image: "images/soda.jpg"
        }
    ];

    const paymentStatusLabels = {
        paid: "Paid",
        pending: "Pending",
        failed: "Failed"
    };
    const defaultMenuImage = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

    let cart = [];
    let currentCategory = "all";
    let searchKeyword = "";
    let currentRating = 0;
    let currentPaymentMethod = "";
    let currentPaymentContext = null;
    let currentReviewPaymentId = "";
    let currentMenuItem = null;
    let currentQty = 1;
    let currentSelections = [];

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

    function normalizeMenuPrice(value) {
        const price = Number(value);
        return Number.isFinite(price) ? price : 0;
    }

    function normalizeAdminMenus(rawMenus) {
        if (!Array.isArray(rawMenus)) return [];

        return rawMenus
            .filter((item) => item && item.available !== false)
            .map((item, index) => ({
                id: item.id || Date.now() + index,
                name: item.name || "Unnamed Menu",
                thaiName: item.thaiName || "",
                price: normalizeMenuPrice(item.price),
                category: item.category || "single",
                desc: item.desc || "",
                hasOptions: Array.isArray(item.optionKeys) && item.optionKeys.length > 0,
                optionKeys: Array.isArray(item.optionKeys) ? item.optionKeys : [],
                image: item.img || item.image || defaultMenuImage
            }));
    }

    function getRuntimeMenuDatabase() {
        const storedMenus = safeParseJSON(localStorage.getItem("menus"), []);
        const normalizedMenus = normalizeAdminMenus(storedMenus);
        return normalizedMenus.length ? normalizedMenus : menuDatabase;
    }

    function getStatusClass(status) {
        if (status === "paid") return "bg-[#dff3e4] text-[#1f7a3d]";
        if (status === "pending") return "bg-[#fff1cc] text-[#9a6a00]";
        if (status === "failed") return "bg-[#fde2e2] text-[#b42318]";
        return "bg-[#efe4d8] text-[#7a4e2f]";
    }

    function getCurrentSessionId() {
        return localStorage.getItem("user_id") || "";
    }

    function getCurrentTableNumber() {
        return localStorage.getItem("table_number") || "";
    }

    function getScopedStorageKey(prefix) {
        return `${prefix}${getCurrentSessionId() || getCurrentTableNumber() || "guest"}`;
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

    function isOrderCreationDisabled() {
        return isOrderingLocked() || Boolean(getPendingReviewPaymentId());
    }

    function getOrderingDisabledMessage() {
        return isOrderingLocked()
            ? "Ordering is closed after review"
            : "Please submit the review before making another order";
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

    function syncCartWithSession() {
        const sessionOwner = getCurrentSessionId() || getCurrentTableNumber() || "";
        const storedCart = safeParseJSON(localStorage.getItem("cart"), []);
        const cartOwner = localStorage.getItem("cart_owner_id") || "";

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

    function matchesCurrentSession(record) {
        if (!record) return false;

        const sessionId = getCurrentSessionId();
        const tableNumber = getCurrentTableNumber();

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

    function getCurrentSessionOrders() {
        return getAllOrders().filter(matchesCurrentSession);
    }

    function getCurrentSessionPayments() {
        return getAllPayments().filter(matchesCurrentSession);
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

    function getOrderPaymentText(order) {
        if (isCancelledStatus(order.status)) return "Not required";
        if (isPaidOrder(order)) return `Paid (${order.paymentMethod || "Cash"})`;
        return "Waiting for payment";
    }

    function getOutstandingOrders() {
        return getCurrentSessionOrders().filter((order) => !isPaidOrder(order) && !isCancelledStatus(order.status));
    }

    function areOrdersReadyForPayment(orders) {
        return orders.length > 0 && orders.every((order) => isServedStatus(order.status));
    }

    function buildPaymentContext(orders) {
        const normalizedOrders = [...orders].sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));
        const items = normalizedOrders.flatMap((order) => {
            const sourceItems = Array.isArray(order.items) ? order.items : [];
            return sourceItems.map((item) => ({
                name: item.name,
                qty: item.qty,
                price: item.price || 0,
                orderId: order.id,
                optionsText: item.optionsText || "",
                customerNote: item.customerNote || ""
            }));
        });

        return {
            orders: normalizedOrders,
            items,
            orderIds: normalizedOrders.map((order) => order.id),
            total: normalizedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
        };
    }

    function renderPaymentHistory() {
        const container = document.getElementById("paymentHistoryContainer");
        if (!container) return;

        const payments = getCurrentSessionPayments().sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

        if (!payments.length) {
            container.innerHTML = `<div class="text-center py-5 text-[#a97a52]">No payment history</div>`;
            return;
        }

        container.innerHTML = payments.map((payment) => {
            const orderLabel = Array.isArray(payment.orderIds) && payment.orderIds.length
                ? payment.orderIds.join(", ")
                : (payment.orderId || "-");
            const itemsText = Array.isArray(payment.items) && payment.items.length
                ? payment.items.map((item) => `${item.name} x${item.qty}`).join(", ")
                : "-";

            return `
                <div class="rounded-2xl border border-[#e6d7c7] bg-[#fffaf5] p-4 mb-3">
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
                        <div class="font-bold text-[#5f4028]">Table ${payment.table || "-"}</div>
                        <div class="px-3 py-1 rounded-full text-xs font-bold ${getStatusClass(payment.status || "paid")}">
                            ${paymentStatusLabels[payment.status] || "Paid"}
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-1">
                        <div class="text-sm text-[#a97a52]">Order: ${orderLabel}</div>
                        <div class="text-lg font-extrabold text-[#7a4e2f]">${payment.amount} Baht</div>
                    </div>
                    <div class="text-sm text-[#a97a52] mt-1">Date: ${payment.time ? new Date(payment.time).toLocaleString() : "-"}</div>
                    <div class="text-sm text-[#a97a52] mt-1">Method: ${payment.method || "Cash"}</div>
                    <div class="text-sm text-[#a97a52] mt-1">Items: ${itemsText}</div>
                </div>
            `;
        }).join("");
    }

    function renderOrderStatus() {
        const container = document.getElementById("orderStatusContainer");
        if (!container) return;

        const orders = getCurrentSessionOrders().sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

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
        const preview = document.getElementById("cartPreview");
        const previewCard = document.getElementById("cartPreviewCard");
        if (!preview || !previewCard) return;

        if (isOrderCreationDisabled()) {
            previewCard.classList.add("hidden");
            return;
        }

        if (cart.length === 0) {
            preview.innerHTML = `<div class="text-[#a97a52]">No items in cart.</div>`;
            previewCard.classList.add("hidden");
            return;
        }

        previewCard.classList.remove("hidden");
        preview.innerHTML = cart.map((item) => `
            <div class="flex items-center justify-between border-b border-[#e6d7c7] py-2">
                <div>
                    <div class="font-semibold">
                        ${item.name}
                        ${item.thaiName ? `<span class="ml-1 text-xs font-medium text-[#a97a52]">(${item.thaiName})</span>` : ""}
                    </div>
                    <div class="text-xs text-[#a97a52]">x${item.quantity}</div>
                </div>
                <div class="font-semibold">${item.price * item.quantity} Baht</div>
            </div>
        `).join("");
    }

    function updateCartUI() {
        const cartCountSpan = document.getElementById("cartCount");
        const cartTotalSpan = document.getElementById("cartTotalPrice");
        const modalContainer = document.getElementById("cartItemsContainer");
        const modalTotalSpan = document.getElementById("modalTotalPrice");

        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        if (cartCountSpan) cartCountSpan.innerText = String(totalItems);
        if (cartTotalSpan) cartTotalSpan.innerText = `${total} Baht`;

        if (modalContainer) {
            if (cart.length === 0) {
                modalContainer.innerHTML = '<div class="text-center text-[#7a4e2f] py-5">No items yet. Please add a menu item.</div>';
            } else {
                modalContainer.innerHTML = cart.map((item) => `
                    <div class="flex justify-between gap-3 py-2 border-b border-[#e6d7c7] text-sm">
                        <div>
                            <strong>${item.name}</strong>
                            ${item.thaiName ? `<span class="ml-1 text-[0.7rem] text-[#a97a52]">(${item.thaiName})</span>` : ""}
                            x${item.quantity}<br>
                            <span class="text-[0.7rem] text-[#a97a52]">${item.optionsText || "Standard"}</span>
                            ${item.customerNote ? `<br><span class="text-[0.75rem] text-[#7a4e2f]">Note: ${item.customerNote}</span>` : ""}
                        </div>
                        <div>${item.price * item.quantity} Baht</div>
                    </div>
                `).join("");
            }
        }

        if (modalTotalSpan) {
            modalTotalSpan.innerText = `${total} Baht`;
        }

        const sessionOwner = getCurrentSessionId() || getCurrentTableNumber() || "";
        if (sessionOwner) {
            localStorage.setItem("cart_owner_id", sessionOwner);
        }
        localStorage.setItem("cart", JSON.stringify(cart));
        renderCartPreview();
    }

    function addToCart(menuItem, selectedOptions = null, quantity = 1, customerNote = "") {
        if (isOrderCreationDisabled()) {
            showToast(getOrderingDisabledMessage());
            return;
        }

        const optionsDisplay = formatOptionsText(selectedOptions);

        cart.push({
            id: menuItem.id,
            name: menuItem.name,
            thaiName: menuItem.thaiName || "",
            price: menuItem.price,
            quantity,
            optionsText: optionsDisplay || "Standard",
            customerNote: customerNote || "",
            timestamp: Date.now()
        });

        updateCartUI();
        showToast(`Added ${menuItem.name} x${quantity}`);
    }

    function getFilteredMenus() {
        let filtered = [...getRuntimeMenuDatabase()];

        if (currentCategory !== "all") {
            filtered = filtered.filter((menu) => menu.category === currentCategory);
        }

        if (searchKeyword.trim() !== "") {
            const keyword = searchKeyword.trim().toLowerCase();
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
        const resultText = document.getElementById("searchResultText");
        if (!resultText) return;

        if (searchKeyword.trim() === "") {
            if (currentCategory === "all") {
                resultText.innerText = "";
            } else {
                resultText.innerText = `Category: ${currentCategory} • ${total} items`;
            }
            return;
        }

        resultText.innerText = `Results for "${searchKeyword}" • ${total} items`;
    }

    function formatOptionsText(selectedOptions) {
        if (!Array.isArray(selectedOptions) || selectedOptions.length === 0) return "";
        return selectedOptions
            .map((option) => `${option.label.replace(/^[^A-Za-z0-9]+\s*/g, "")}: ${option.value}`)
            .join(" • ");
    }

    function renderItemOptions(menu) {
        const wrapper = document.getElementById("itemOptionsWrapper");
        const container = document.getElementById("itemOptionsContainer");
        if (!wrapper || !container) return;

        container.innerHTML = "";
        currentSelections = [];

        const keys = menu.optionKeys || [];
        if (!keys.length) {
            wrapper.classList.add("hidden");
            return;
        }

        wrapper.classList.remove("hidden");

        keys.forEach((key) => {
            const set = optionSets[key];
            if (!set || !set.choices || set.choices.length === 0) return;

            const defaultValue = set.default || set.choices[0].value;
            currentSelections.push({ key, label: set.label, value: defaultValue });

            const group = document.createElement("div");
            group.className = "p-1";

            const label = document.createElement("div");
            label.className = "text-sm font-semibold text-[#5f4028]";
            label.textContent = set.label;

            const buttons = document.createElement("div");
            buttons.className = "mt-2 flex flex-wrap gap-2";

            set.choices.forEach((choice) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.dataset.optionKey = key;
                btn.dataset.optionValue = choice.value;
                const isSelected = choice.value === defaultValue;

                btn.className = [
                    "px-3",
                    "py-1",
                    "rounded-full",
                    "border",
                    "text-xs",
                    "font-semibold",
                    "transition"
                ].join(" ");

                if (isSelected) {
                    btn.classList.add("bg-[#7a4e2f]", "text-white", "border-[#7a4e2f]", "ring-2", "ring-[#7a4e2f]/30");
                } else {
                    btn.classList.add("bg-[#fbf5ee]", "text-[#5f4028]", "border-[#e6d7c7]", "hover:bg-[#efe4d8]");
                }

                btn.textContent = choice.th ? `${choice.value} (${choice.th})` : choice.value;

                btn.addEventListener("click", () => {
                    const groupButtons = buttons.querySelectorAll("button[data-option-key]");
                    groupButtons.forEach((button) => {
                        button.classList.remove("bg-[#7a4e2f]", "text-white", "border-[#7a4e2f]", "ring-2", "ring-[#7a4e2f]/30");
                        button.classList.add("bg-[#fbf5ee]", "text-[#5f4028]", "border-[#e6d7c7]");
                    });

                    btn.classList.remove("bg-[#fbf5ee]", "text-[#5f4028]", "border-[#e6d7c7]");
                    btn.classList.add("bg-[#7a4e2f]", "text-white", "border-[#7a4e2f]", "ring-2", "ring-[#7a4e2f]/30");

                    const target = currentSelections.find((option) => option.key === key);
                    if (target) target.value = choice.value;
                });

                buttons.appendChild(btn);
            });

            group.appendChild(label);
            group.appendChild(buttons);
            container.appendChild(group);
        });
    }

    function openItemModal(menu) {
        if (isOrderingLocked()) {
            showToast("Ordering is closed after review");
            return;
        }

        currentMenuItem = menu;
        currentQty = 1;
        currentSelections = [];

        const thaiLabel = menu.thaiName
            ? `<span class="text-xs text-[#a97a52] font-medium ml-1">(${menu.thaiName})</span>`
            : "";

        document.getElementById("itemModalTitle").innerHTML = `${menu.name} ${thaiLabel}`;
        document.getElementById("itemModalDesc").innerText = menu.desc || "Special from the Chill n Fill kitchen";
        document.getElementById("itemModalImage").src = menu.image;
        document.getElementById("itemModalNote").value = "";
        document.getElementById("itemQtyValue").innerText = "1";

        renderItemOptions(menu);
        const itemModal = document.getElementById("itemModal");
        if (itemModal) {
            itemModal.classList.remove("hidden");
            itemModal.classList.add("flex");
        }
    }

    function closeItemModal() {
        const itemModal = document.getElementById("itemModal");
        if (!itemModal) return;
        itemModal.classList.add("hidden");
        itemModal.classList.remove("flex");
    }

    function renderMenu() {
        const grid = document.getElementById("menuGrid");
        if (!grid) return;

        const filtered = getFilteredMenus();
        const orderingLocked = isOrderCreationDisabled();
        const orderButtonLabel = isOrderingLocked() ? "Ordering Closed" : (orderingLocked ? "Leave Review First" : "Customize & Add");

        grid.innerHTML = "";
        updateSearchResultText(filtered.length);

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="text-center p-7 bg-[#fbf5ee] border border-dashed border-[#e6d7c7] rounded-3xl text-[#a97a52]">
                    No menu items found<br>
                    Try another keyword
                </div>
            `;
            return;
        }

        filtered.forEach((menu) => {
            const card = document.createElement("div");
            card.className = "menu-card rounded-[24px] border border-[#e6d7c7] bg-[#fbf5ee] p-4 shadow-sm flex flex-col gap-3";
            card.innerHTML = `
                <img src="${menu.image}" alt="${menu.name}" class="menu-image w-full h-40 sm:h-44 object-cover rounded-[18px] border border-[#e6d7c7] bg-[#efe4d8]">
                <div class="menu-row flex flex-wrap items-center justify-between gap-2">
                    <div class="menu-info">
                        <h3 class="text-lg font-bold text-[#5f4028]">
                            ${menu.name}
                            ${menu.thaiName ? `<span class="ml-2 text-xs font-medium text-[#a97a52]">(${menu.thaiName})</span>` : ""}
                        </h3>
                        <div class="menu-desc text-xs text-[#a97a52] mt-1">${menu.desc || "Special from the Chill n Fill kitchen"}</div>
                    </div>
                    <div class="price text-xl font-extrabold text-[#7a4e2f]">${menu.price} Baht</div>
                </div>
                <button class="order-btn btn btn-sm rounded-full border-none ${orderingLocked ? "bg-[#d8cabb] text-[#8b6c53] cursor-not-allowed" : "bg-[#7a4e2f] text-[#fbf5ee] hover:bg-[#5f4028]"}">
                    ${orderButtonLabel}
                </button>
            `;

            grid.appendChild(card);

            if (orderingLocked) {
                return;
            }

            const orderBtn = card.querySelector(".order-btn");
            orderBtn.addEventListener("click", (event) => {
                event.stopPropagation();
                openItemModal(menu);
            });

            card.addEventListener("click", () => {
                openItemModal(menu);
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
        const orders = getAllOrders();

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

        saveAllOrders(orders);
        return true;
    }

    function renderPaymentSummary(context) {
        const container = document.getElementById("paymentSummaryContainer");
        if (!container) return;

        if (!context || !context.orders || !context.orders.length) {
            container.innerHTML = "";
            return;
        }

        container.innerHTML = `
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

    function updatePaymentMethodUI() {
        const qrCodePanel = document.getElementById("qrCodePanel");
        const confirmPaymentBtn = document.getElementById("confirmPaymentBtn");

        document.querySelectorAll(".payment-method-btn").forEach((button) => {
            const isSelected = button.dataset.method === currentPaymentMethod;
            button.classList.toggle("border-[#7a4e2f]", isSelected);
            button.classList.toggle("bg-[#fff4e8]", isSelected);
            button.classList.toggle("ring-2", isSelected);
            button.classList.toggle("ring-[#7a4e2f]/20", isSelected);
        });

        if (qrCodePanel) {
            qrCodePanel.classList.toggle("hidden", currentPaymentMethod !== "QR Code");
        }

        if (confirmPaymentBtn) {
            confirmPaymentBtn.innerText = currentPaymentMethod
                ? `Confirm ${currentPaymentMethod} Payment`
                : "Confirm Payment";
        }
    }

    function resetPaymentFlowState() {
        currentPaymentMethod = "";
        currentPaymentContext = null;
        renderPaymentSummary(null);
        updatePaymentMethodUI();
    }

    function findPaymentById(paymentId) {
        return getAllPayments().find((payment) => String(payment.id) === String(paymentId)) || null;
    }

    function openReviewModal(payment = null) {
        const reviewModal = document.getElementById("reviewModal");
        const reviewSummaryText = document.getElementById("reviewSummaryText");
        if (!reviewModal) return;

        const resolvedPayment = payment || findPaymentById(getPendingReviewPaymentId());
        currentReviewPaymentId = resolvedPayment ? String(resolvedPayment.id) : "";

        if (reviewSummaryText) {
            if (resolvedPayment) {
                reviewSummaryText.innerText = `Payment received: ${resolvedPayment.amount} Baht via ${resolvedPayment.method || "Cash"}. Please leave a review to finish this session.`;
            } else {
                reviewSummaryText.innerText = "Tell us about your experience after payment.";
            }
        }

        currentRating = 0;
        const reviewTextarea = document.getElementById("reviewTextarea");
        if (reviewTextarea) reviewTextarea.value = "";
        document.querySelectorAll("#starRating .star").forEach((star) => star.classList.remove("text-[#f5b342]"));
        openModal(reviewModal);
    }

    function applyOrderingState() {
        const locked = isOrderingLocked();
        const orderCreationDisabled = isOrderCreationDisabled();
        const pendingReviewId = getPendingReviewPaymentId();
        const banner = document.getElementById("sessionStateBanner");
        const cartBar = document.getElementById("cartBar");
        const previewCard = document.getElementById("cartPreviewCard");

        if (banner) {
            if (locked) {
                banner.innerText = "Payment and review are complete for this session. New orders are disabled.";
                banner.classList.remove("hidden");
            } else if (pendingReviewId) {
                banner.innerText = "Payment is already completed. Please submit the review to finish this session.";
                banner.classList.remove("hidden");
            } else {
                banner.innerText = "";
                banner.classList.add("hidden");
            }
        }

        if (openPaymentBtn) {
            openPaymentBtn.disabled = locked;
            openPaymentBtn.classList.toggle("opacity-60", locked);
            openPaymentBtn.classList.toggle("cursor-not-allowed", locked);
        }

        if (openCartBtn) {
            openCartBtn.disabled = orderCreationDisabled;
            openCartBtn.innerText = locked ? "Session Closed" : (orderCreationDisabled ? "Leave Review First" : "View Cart");
            openCartBtn.classList.toggle("opacity-60", orderCreationDisabled);
            openCartBtn.classList.toggle("cursor-not-allowed", orderCreationDisabled);
        }

        if (openCartInlineBtn) {
            openCartInlineBtn.disabled = orderCreationDisabled;
            openCartInlineBtn.innerText = locked ? "Session Closed" : (orderCreationDisabled ? "Leave Review First" : "View Cart");
            openCartInlineBtn.classList.toggle("opacity-60", orderCreationDisabled);
            openCartInlineBtn.classList.toggle("cursor-not-allowed", orderCreationDisabled);
        }

        if (clearCartBtn) {
            clearCartBtn.disabled = orderCreationDisabled;
            clearCartBtn.classList.toggle("opacity-60", orderCreationDisabled);
            clearCartBtn.classList.toggle("cursor-not-allowed", orderCreationDisabled);
        }

        if (fakeOrderBtn) {
            fakeOrderBtn.disabled = orderCreationDisabled;
            fakeOrderBtn.classList.toggle("opacity-60", orderCreationDisabled);
            fakeOrderBtn.classList.toggle("cursor-not-allowed", orderCreationDisabled);
        }

        if (itemAddBtn) {
            itemAddBtn.disabled = orderCreationDisabled;
            itemAddBtn.innerText = locked ? "Ordering Closed" : (orderCreationDisabled ? "Leave Review First" : "Add to Cart");
            itemAddBtn.classList.toggle("opacity-60", orderCreationDisabled);
            itemAddBtn.classList.toggle("cursor-not-allowed", orderCreationDisabled);
        }

        if (cartBar) {
            cartBar.classList.toggle("opacity-75", orderCreationDisabled);
        }

        if (previewCard && orderCreationDisabled) {
            previewCard.classList.add("hidden");
        }

        if (orderCreationDisabled) {
            closeItemModal();
        }

        renderMenu();
        updateCartUI();
    }

    function openPaymentSelectionModal() {
        if (isOrderingLocked()) {
            showToast("Ordering is closed after review");
            return;
        }

        const pendingReviewId = getPendingReviewPaymentId();
        if (pendingReviewId) {
            openReviewModal();
            return;
        }

        const outstandingOrders = getOutstandingOrders();
        if (!outstandingOrders.length) {
            showToast("No unpaid orders for this session");
            return;
        }

        if (!areOrdersReadyForPayment(outstandingOrders)) {
            showToast("Payment is available after all food is served");
            return;
        }

        currentPaymentContext = buildPaymentContext(outstandingOrders);
        currentPaymentMethod = "";
        renderPaymentSummary(currentPaymentContext);
        updatePaymentMethodUI();
        openModal(paymentModal);
    }

    function confirmPaymentSelection() {
        if (!currentPaymentContext || !currentPaymentContext.orders.length) {
            closeModal(paymentModal);
            return;
        }

        if (!currentPaymentMethod) {
            showToast("Please choose a payment method");
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
        setPendingReviewPaymentId(paymentId);
        renderPaymentHistory();
        renderOrderStatus();
        closeModal(paymentModal);
        resetPaymentFlowState();
        openReviewModal(paymentRecord);
        applyOrderingState();
        showToast("Payment recorded");
    }

    function submitReview() {
        const reviewTextarea = document.getElementById("reviewTextarea");
        const reviewText = reviewTextarea ? reviewTextarea.value.trim() : "";

        if (!reviewText && currentRating === 0) {
            showToast("Please add a rating or review before submitting");
            return;
        }

        const now = new Date().toISOString();
        const paymentId = currentReviewPaymentId || getPendingReviewPaymentId() || "";

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
        currentReviewPaymentId = "";
        cart = [];
        updateCartUI();
        closeModal(reviewModal);
        renderPaymentHistory();
        renderOrderStatus();
        applyOrderingState();
        showToast("Thanks for your review");
    }

    const cartModal = document.getElementById("cartModal");
    const paymentHistoryModal = document.getElementById("paymentHistoryModal");
    const paymentModal = document.getElementById("paymentModal");
    const reviewModal = document.getElementById("reviewModal");
    const orderStatusModal = document.getElementById("orderStatusModal");

    const openCartBtn = document.getElementById("openCartModal");
    const openCartInlineBtn = document.getElementById("openCartInlineBtn");
    const closeCartBtn = document.getElementById("closeModalBtn");
    const openPaymentHistoryBtn = document.getElementById("openPaymentHistoryBtn");
    const openPaymentBtn = document.getElementById("openPaymentBtn");
    const closePaymentHistoryBtn = document.getElementById("closePaymentHistoryBtn");
    const closePaymentBtn = document.getElementById("closePaymentBtn");
    const closeOrderStatusBtn = document.getElementById("closeOrderStatusBtn");
    const clearCartBtn = document.getElementById("clearCartBtn");
    const fakeOrderBtn = document.getElementById("fakeOrderBtn");
    const confirmPaymentBtn = document.getElementById("confirmPaymentBtn");
    const searchInput = document.getElementById("menuSearch");
    const catBtns = document.querySelectorAll(".cat-btn");
    const closeItemModalBtn = document.getElementById("closeItemModalBtn");
    const itemQtyMinus = document.getElementById("itemQtyMinus");
    const itemQtyPlus = document.getElementById("itemQtyPlus");
    const itemQtyValue = document.getElementById("itemQtyValue");
    const itemAddBtn = document.getElementById("itemAddBtn");
    const tableDisplay = document.getElementById("tableDisplay");
    const submitReviewBtn = document.getElementById("submitReviewBtn");

    function openModal(modalEl) {
        if (!modalEl) return;
        modalEl.classList.remove("hidden");
        modalEl.classList.add("flex");
    }

    function closeModal(modalEl) {
        if (!modalEl) return;
        modalEl.classList.add("hidden");
        modalEl.classList.remove("flex");
    }

    function openOrderStatusModal() {
        if (orderStatusModal) {
            openModal(orderStatusModal);
        }
        try {
            renderOrderStatus();
        } catch (err) {
            const container = document.getElementById("orderStatusContainer");
            if (container) {
                container.innerHTML = `<div class="text-center py-5 text-[#a97a52]">Unable to load order status</div>`;
            }
        }
    }

    window.openOrderStatusModal = openOrderStatusModal;

    syncCartWithSession();

    if (tableDisplay) {
        const tableNumber = getCurrentTableNumber();
        if (tableNumber) {
            tableDisplay.textContent = `Table ${tableNumber}`;
            tableDisplay.classList.remove("hidden");
        }
    }

    if (openCartBtn) {
        openCartBtn.addEventListener("click", () => {
            if (isOrderCreationDisabled()) {
                showToast(getOrderingDisabledMessage());
                return;
            }
            window.location.href = "cart.html";
        });
    }

    if (openCartInlineBtn) {
        openCartInlineBtn.addEventListener("click", () => {
            if (isOrderCreationDisabled()) {
                showToast(getOrderingDisabledMessage());
                return;
            }
            window.location.href = "cart.html";
        });
    }

    if (closeCartBtn) {
        closeCartBtn.addEventListener("click", () => {
            closeModal(cartModal);
        });
    }

    if (closeItemModalBtn) {
        closeItemModalBtn.addEventListener("click", closeItemModal);
    }

    if (openPaymentHistoryBtn) {
        openPaymentHistoryBtn.addEventListener("click", () => {
            renderPaymentHistory();
            openModal(paymentHistoryModal);
        });
    }

    if (closePaymentHistoryBtn) {
        closePaymentHistoryBtn.addEventListener("click", () => {
            closeModal(paymentHistoryModal);
        });
    }

    if (openPaymentBtn) {
        openPaymentBtn.addEventListener("click", openPaymentSelectionModal);
    }

    if (closePaymentBtn) {
        closePaymentBtn.addEventListener("click", () => {
            closeModal(paymentModal);
            resetPaymentFlowState();
        });
    }

    document.querySelectorAll(".payment-method-btn").forEach((button) => {
        button.addEventListener("click", () => {
            currentPaymentMethod = button.dataset.method || "";
            updatePaymentMethodUI();
        });
    });

    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener("click", confirmPaymentSelection);
    }

    if (closeOrderStatusBtn) {
        closeOrderStatusBtn.addEventListener("click", () => {
            closeModal(orderStatusModal);
        });
    }

    if (itemQtyMinus) {
        itemQtyMinus.addEventListener("click", () => {
            if (currentQty > 1) {
                currentQty -= 1;
                itemQtyValue.innerText = String(currentQty);
            }
        });
    }

    if (itemQtyPlus) {
        itemQtyPlus.addEventListener("click", () => {
            currentQty += 1;
            itemQtyValue.innerText = String(currentQty);
        });
    }

    if (itemAddBtn) {
        itemAddBtn.addEventListener("click", () => {
            if (!currentMenuItem) return;
            const note = document.getElementById("itemModalNote").value.trim();
            const options = currentSelections.length ? currentSelections.map((option) => ({ ...option })) : null;
            addToCart(currentMenuItem, options, currentQty, note);
            if (!isOrderCreationDisabled()) {
                closeItemModal();
            }
        });
    }

    if (clearCartBtn) {
        clearCartBtn.addEventListener("click", () => {
            if (isOrderCreationDisabled()) {
                showToast(getOrderingDisabledMessage());
                return;
            }
            if (cart.length > 0) {
                cart = [];
                updateCartUI();
                showToast("Cleared all items");
            } else {
                showToast("Cart is already empty");
            }
        });
    }

    if (fakeOrderBtn) {
        fakeOrderBtn.addEventListener("click", () => {
            if (isOrderCreationDisabled()) {
                showToast(getOrderingDisabledMessage());
                return;
            }
            if (!cart.length) {
                showToast("Please add items before ordering");
                return;
            }

            const persisted = persistOrderToLocal();
            if (!persisted) return;

            cart = [];
            updateCartUI();
            openOrderStatusModal();
            showToast("Order sent to kitchen");
        });
    }

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

    if (submitReviewBtn) {
        submitReviewBtn.addEventListener("click", submitReview);
    }

    catBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            catBtns.forEach((button) => {
                button.classList.remove("bg-[#7a4e2f]", "text-[#fbf5ee]", "border-[#7a4e2f]");
                button.classList.add("bg-[#fbf5ee]", "text-[#7a4e2f]", "border-[#e6d7c7]");
            });
            btn.classList.remove("bg-[#fbf5ee]", "text-[#7a4e2f]", "border-[#e6d7c7]");
            btn.classList.add("bg-[#7a4e2f]", "text-[#fbf5ee]", "border-[#7a4e2f]");
            currentCategory = btn.getAttribute("data-cat");
            renderMenu();
        });
    });

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            searchKeyword = this.value;
            renderMenu();
        });
    }

    window.addEventListener("click", (event) => {
        if (event.target === cartModal) closeModal(cartModal);
        if (event.target === paymentHistoryModal) closeModal(paymentHistoryModal);
        if (event.target === paymentModal) {
            closeModal(paymentModal);
            resetPaymentFlowState();
        }
        if (event.target === orderStatusModal) closeModal(orderStatusModal);
        if (event.target === document.getElementById("itemModal")) closeItemModal();
    });

    window.addEventListener("storage", (event) => {
        const eventKey = event.key || "";
        if (
            !["orders", "payments", "reviews", "cart", "cart_owner_id", "menus"].includes(eventKey) &&
            !eventKey.startsWith("ordering_locked_after_review_") &&
            !eventKey.startsWith("pending_review_payment_")
        ) {
            return;
        }

        syncCartWithSession();
        renderPaymentHistory();
        renderOrderStatus();
        applyOrderingState();
    });

    const shouldOpenStatus = localStorage.getItem("open_order_status");
    if (shouldOpenStatus === "1") {
        localStorage.removeItem("open_order_status");
        openOrderStatusModal();
    }

    renderMenu();
    updateCartUI();
    renderPaymentHistory();
    renderOrderStatus();
    applyOrderingState();

    if (getPendingReviewPaymentId() && !isOrderingLocked()) {
        openReviewModal();
    }
