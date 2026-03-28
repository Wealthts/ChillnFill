// ==========================================
// 1. DATA AND SETTINGS
// ==========================================
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

const MENUS_BACKUP_KEY = "menus_backup_latest";
const defaultMenuImage = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

const mediaImageByMenuName = {
    "basil fried rice": "../media/basilfriedrice.jpg",
    "tom yum goong": "../media/tomyumkung.jpg",
    "pad thai": "../media/padthai.jpg",
    "hainanese chicken rice": "../media/hainanesechickenrice.jpg",
    "som tam thai": "../media/somtamthai.jpg",
    "korean bbq beef": "../media/koreanbbq.jpg",
    "beef basil": "../media/beefbasil.jpg",
    "lime juice": "../media/limejuice.jpg"
};

function resolveMenuImage(menuName, fallbackImage) {
    let key = "";
    if (menuName !== undefined && menuName !== null) {
        key = String(menuName).trim().toLowerCase();
    }

    if (mediaImageByMenuName[key] !== undefined) {
        return mediaImageByMenuName[key];
    }
    if (fallbackImage !== undefined && fallbackImage !== null && fallbackImage !== "") {
        return fallbackImage;
    }
    return defaultMenuImage;
}

const menuDatabase = [
    { id: 1, name: "Basil Fried Rice", thaiName: "ข้าวผัดกระเพรา", price: 65, category: "single", desc: "Crispy chicken basil rice with fried egg", hasOptions: true, optionKeys: ["spice"], image: resolveMenuImage("Basil Fried Rice") },
    { id: 2, name: "Tom Yum Goong", thaiName: "ต้มยำกุ้ง", price: 120, category: "tomyum", desc: "Clear spicy shrimp tom yum soup", hasOptions: true, optionKeys: ["spice"], image: resolveMenuImage("Tom Yum Goong") },
    { id: 3, name: "Pad Thai", thaiName: "ผัดไทย", price: 70, category: "single", desc: "Thai stir‑fried noodles with shrimp", hasOptions: true, optionKeys: ["spice"], image: resolveMenuImage("Pad Thai") },
    { id: 4, name: "Hainanese Chicken Rice", thaiName: "ข้าวมันไก่", price: 60, category: "single", desc: "Steamed chicken rice with special sauce", hasOptions: false, optionKeys: [], image: resolveMenuImage("Hainanese Chicken Rice") },
    { id: 5, name: "Som Tam Thai", thaiName: "ส้มตำไทย", price: 55, category: "salad", desc: "Spicy green papaya salad", hasOptions: true, optionKeys: ["spice"], image: resolveMenuImage("Som Tam Thai") },
    { id: 6, name: "Korean BBQ Beef", thaiName: "เนื้อย่างเกาหลี", price: 180, category: "main", desc: "Korean‑style marinated grilled beef", hasOptions: true, optionKeys: ["doneness"], image: resolveMenuImage("Korean BBQ Beef") },
    { id: 7, name: "Beef Basil", thaiName: "กระเพราเนื้อ", price: 85, category: "single", desc: "Minced beef basil with fried egg", hasOptions: true, optionKeys: ["spice"], image: resolveMenuImage("Beef Basil") },
    { id: 8, name: "Lime Juice", thaiName: "น้ำมะนาว", price: 25, category: "drink", desc: "Fresh lime juice", hasOptions: true, optionKeys: ["sweet", "ice"], image: resolveMenuImage("Lime Juice") },
    { id: 9, name: "Green Tea", thaiName: "ชาเขียว", price: 30, category: "drink", desc: "Iced green tea", hasOptions: true, optionKeys: ["sweet", "ice"], image: resolveMenuImage("Green Tea") },
    { id: 10, name: "Ice Cream", thaiName: "ไอศครีม", price: 35, category: "dessert", desc: "Vanilla ice cream", hasOptions: true, optionKeys: ["size"], image: resolveMenuImage("Ice Cream") },
    { id: 11, name: "Crispy Pork Basil", thaiName: "กระเพราหมูกรอบ", price: 70, category: "single", desc: "Crispy pork basil rice", hasOptions: true, optionKeys: ["spice"], image: resolveMenuImage("Crispy Pork Basil") },
    { id: 12, name: "Seafood Tom Yum", thaiName: "ต้มยำทะเล", price: 150, category: "tomyum", desc: "Mixed seafood tom yum soup", hasOptions: true, optionKeys: ["spice"], image: resolveMenuImage("Seafood Tom Yum") },
    { id: 13, name: "Soda", thaiName: "น้ำอัดลม", price: 20, category: "drink", desc: "Soda, Coke, Sprite", hasOptions: true, optionKeys: ["sweet", "ice"], image: resolveMenuImage("Soda") }
];

const paymentStatusLabels = { paid: "Paid", pending: "Pending", failed: "Failed" };

// ==========================================
// 2. STATE VARIABLES
// ==========================================
let cart = [];
let currentCategory = "all";
let searchKeyword = "";
let currentRating = 0;
let currentPaymentMethod = "";
let currentPaymentContext = null;
let paymentActionAllowed = false;
let paymentBlockingMessage = "";
let currentReviewPaymentId = "";
let currentMenuItem = null;
let currentQty = 1;
let currentSelections = [];

// ==========================================
// 3. CORE UTILITIES
// ==========================================
function safeParseJSON(value, fallback) {
    try {
        let parsed = JSON.parse(value);
        if (parsed === null) return fallback;
        return parsed;
    } catch (err) {
        return fallback;
    }
}

function escapeText(value) {
    if (!value) return "";
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function showToast(msg) {
    const toast = document.getElementById("toastMsg");
    if (toast !== null) {
        toast.innerText = msg;
        toast.classList.add("opacity-100");
        toast.classList.remove("opacity-0");
        setTimeout(function () {
            toast.classList.remove("opacity-100");
            toast.classList.add("opacity-0");
        }, 1800);
    }
}

function showActionFeedback(msg) {
    showToast(msg);
    const banner = document.getElementById("sessionStateBanner");
    if (banner !== null) {
        banner.innerText = msg;
        banner.classList.remove("hidden");
    }
}

function openModal(modalEl) {
    if (modalEl !== null) {
        modalEl.classList.remove("hidden");
        modalEl.classList.add("flex");
        modalEl.classList.add("modal-open");
    }
}

function closeModal(modalEl) {
    if (modalEl !== null) {
        modalEl.classList.add("hidden");
        modalEl.classList.remove("flex");
        modalEl.classList.remove("modal-open");
    }
}

// ==========================================
// 4. SESSION & LOCAL STORAGE LOGIC
// ==========================================
function getCurrentSessionId() { return localStorage.getItem("user_id") || ""; }
function getCurrentTableNumber() { return localStorage.getItem("table_number") || ""; }
function isCustomerSession() { return String(localStorage.getItem("user_type")).toLowerCase() === "customer"; }

function getScopedStorageKey(prefix) {
    const tableNumber = getCurrentTableNumber();
    if (isCustomerSession() === true && tableNumber !== "") {
        return prefix + "table_" + tableNumber;
    }
    let fallback = getCurrentSessionId();
    if (fallback === "") fallback = tableNumber;
    if (fallback === "") fallback = "guest";
    return prefix + fallback;
}

function getOrderingLockKey() { return getScopedStorageKey("ordering_locked_after_review_"); }
function getPendingReviewKey() { return getScopedStorageKey("pending_review_payment_"); }

function isOrderingLocked() { return localStorage.getItem(getOrderingLockKey()) === "1"; }
function getPendingReviewPaymentId() { return localStorage.getItem(getPendingReviewKey()) || ""; }

function isOrderCreationDisabled() {
    if (isOrderingLocked() === true) return true;
    if (getPendingReviewPaymentId() !== "") return true;
    return false;
}

function getOrderingDisabledMessage() {
    if (isOrderingLocked() === true) return "Ordering is closed after review";
    return "Please submit the review before making another order";
}

function setOrderingLocked(locked) {
    if (locked === true) {
        localStorage.setItem(getOrderingLockKey(), "1");
    } else {
        localStorage.removeItem(getOrderingLockKey());
    }
}

// Ensure the menu pulls from the admin's database if it exists
function getRuntimeMenuDatabase() {
    let storedMenus = safeParseJSON(localStorage.getItem("menus"), []);
    let backupMenus = safeParseJSON(localStorage.getItem(MENUS_BACKUP_KEY), []);

    let sourceMenus = [];
    if (Array.isArray(storedMenus) && storedMenus.length > 0) {
        sourceMenus = storedMenus;
    } else if (Array.isArray(backupMenus) && backupMenus.length > 0) {
        sourceMenus = backupMenus;
    }

    if (sourceMenus.length === 0) {
        return menuDatabase; // Use default if nothing in storage
    }

    let normalizedMenus = [];
    sourceMenus.forEach(function (item) {
        if (item.available !== false) {
            let optionKeysArr = [];
            if (Array.isArray(item.optionKeys)) optionKeysArr = item.optionKeys;

            normalizedMenus.push({
                id: item.id,
                name: item.name || "Unnamed Menu",
                thaiName: item.thaiName || "",
                price: Number(item.price) || 0,
                category: item.category || "single",
                desc: item.desc || "",
                hasOptions: optionKeysArr.length > 0,
                optionKeys: optionKeysArr,
                image: resolveMenuImage(item.name, item.img || item.image)
            });
        }
    });

    return normalizedMenus;
}

function normalizeTableKey(value) {
    const raw = String(value || "").trim();
    if (raw === "") return "";
    const digitsOnly = raw.replace(/\D+/g, "");
    if (digitsOnly !== "") return digitsOnly;
    return raw.toLowerCase();
}

function matchesCurrentSession(record) {
    if (!record) return false;

    const sessionId = getCurrentSessionId();
    const tableNumber = getCurrentTableNumber();
    const normalizedTable = normalizeTableKey(tableNumber);
    const recordTable = normalizeTableKey(record.table);

    if (isCustomerSession() === true && tableNumber !== "") {
        if (recordTable !== "" && normalizedTable !== "" && recordTable === normalizedTable) return true;
    }
    if (sessionId !== "" && record.userId) {
        return String(record.userId) === String(sessionId);
    }
    if (sessionId !== "" && !record.userId && tableNumber !== "") {
        if (recordTable !== "" && normalizedTable !== "") return recordTable === normalizedTable;
        return String(record.table) === String(tableNumber);
    }
    if (tableNumber !== "") {
        if (recordTable !== "" && normalizedTable !== "") return recordTable === normalizedTable;
        return String(record.table) === String(tableNumber);
    }
    return true;
}

// Database Getters & Setters
function getAllOrders() { return safeParseJSON(localStorage.getItem("orders"), []); }
function saveAllOrders(orders) { localStorage.setItem("orders", JSON.stringify(orders)); }
function getAllPayments() { return safeParseJSON(localStorage.getItem("payments"), []); }
function saveAllPayments(payments) { localStorage.setItem("payments", JSON.stringify(payments)); }
function getAllReviews() { return safeParseJSON(localStorage.getItem("reviews"), []); }
function saveAllReviews(reviews) { localStorage.setItem("reviews", JSON.stringify(reviews)); }

function getCurrentSessionOrders() {
    let allOrders = getAllOrders();
    let sessionOrders = [];
    allOrders.forEach(function (order) {
        if (matchesCurrentSession(order) === true) {
            sessionOrders.push(order);
        }
    });
    return sessionOrders;
}

function getCurrentSessionPayments() {
    let allPayments = getAllPayments();
    let sessionPayments = [];
    allPayments.forEach(function (payment) {
        if (matchesCurrentSession(payment) === true) {
            sessionPayments.push(payment);
        }
    });
    return sessionPayments;
}

function getCurrentSessionReviews() {
    let allReviews = getAllReviews();
    let sessionReviews = [];
    allReviews.forEach(function (review) {
        if (matchesCurrentSession(review) === true) {
            sessionReviews.push(review);
        }
    });

    if (sessionReviews.length > 0) return sessionReviews;

    // Fallback: Check if review matches a payment ID from this session
    let validPaymentIds = [];
    getCurrentSessionPayments().forEach(function (p) { validPaymentIds.push(String(p.id)); });

    let fallbackReviews = [];
    allReviews.forEach(function (review) {
        let reviewPayId = String(review.paymentId || "");
        if (validPaymentIds.indexOf(reviewPayId) !== -1) {
            fallbackReviews.push(review);
        }
    });
    return fallbackReviews;
}

function syncCartWithSession() {
    let sessionOwner = getCurrentSessionId();
    if (sessionOwner === "") sessionOwner = getCurrentTableNumber();

    const storedCart = safeParseJSON(localStorage.getItem("cart"), []);
    const cartOwner = localStorage.getItem("cart_owner_id") || "";

    if (sessionOwner !== "" && cartOwner !== "" && cartOwner !== sessionOwner) {
        cart = [];
        localStorage.setItem("cart", JSON.stringify(cart));
    } else {
        if (Array.isArray(storedCart)) {
            cart = storedCart;
        } else {
            cart = [];
        }
    }

    if (sessionOwner !== "") {
        localStorage.setItem("cart_owner_id", sessionOwner);
    }
}

// ==========================================
// 5. UI UPDATES & RENDERERS
// ==========================================
function applyOrderingState() {
    const locked = isOrderingLocked();
    const orderCreationDisabled = isOrderCreationDisabled();
    const pendingReviewId = getPendingReviewPaymentId();

    const banner = document.getElementById("sessionStateBanner");
    const cartBar = document.getElementById("cartBar");
    const previewCard = document.getElementById("cartPreviewCard");

    if (banner !== null) {
        if (locked === true) {
            banner.innerText = "Payment and review are complete for this session. New orders are disabled.";
            banner.classList.remove("hidden");
        } else if (pendingReviewId !== "") {
            banner.innerText = "Payment is already completed. Please submit the review to finish this session.";
            banner.classList.remove("hidden");
        } else {
            banner.innerText = "";
            banner.classList.add("hidden");
        }
    }

    const openPaymentBtn = document.getElementById("openPaymentBtn");
    if (openPaymentBtn !== null) {
        openPaymentBtn.disabled = false;
        if (locked === true) {
            openPaymentBtn.classList.add("opacity-60", "cursor-not-allowed");
        } else {
            openPaymentBtn.classList.remove("opacity-60", "cursor-not-allowed");
        }
    }

    // Disable all ordering buttons if disabled
    const buttonsToDisable = ["openCartModal", "openCartInlineBtn", "clearCartBtn", "fakeOrderBtn", "itemAddBtn"];
    buttonsToDisable.forEach(function (btnId) {
        let btn = document.getElementById(btnId);
        if (btn !== null) {
            btn.disabled = orderCreationDisabled;
            if (orderCreationDisabled === true) {
                btn.classList.add("opacity-60", "cursor-not-allowed");
            } else {
                btn.classList.remove("opacity-60", "cursor-not-allowed");
            }
        }
    });

    if (cartBar !== null) {
        if (orderCreationDisabled === true) cartBar.classList.add("opacity-75");
        else cartBar.classList.remove("opacity-75");
    }

    if (previewCard !== null && orderCreationDisabled === true) {
        previewCard.classList.add("hidden");
    }

    if (orderCreationDisabled === true) {
        closeModal(document.getElementById("itemModal"));
    }

    renderMenu();
    updateCartUI();
}

function renderMenu() {
    const grid = document.getElementById("menuGrid");
    if (grid === null) return;

    let allMenus = getRuntimeMenuDatabase();
    let filteredMenus = [];

    // Filter by Category and Keyword
    allMenus.forEach(function (menu) {
        let matchCat = false;
        if (currentCategory === "all" || menu.category === currentCategory) matchCat = true;

        let matchSearch = false;
        let searchLower = searchKeyword.trim().toLowerCase();
        let nameLower = String(menu.name).toLowerCase();
        let thaiLower = String(menu.thaiName).toLowerCase();
        let descLower = String(menu.desc).toLowerCase();

        if (searchLower === "") {
            matchSearch = true;
        } else if (nameLower.includes(searchLower) || thaiLower.includes(searchLower) || descLower.includes(searchLower)) {
            matchSearch = true;
        }

        if (matchCat === true && matchSearch === true) {
            filteredMenus.push(menu);
        }
    });

    // Update Result Text
    const resultText = document.getElementById("searchResultText");
    if (resultText !== null) {
        if (searchKeyword.trim() === "") {
            if (currentCategory === "all") resultText.innerText = "";
            else resultText.innerText = "Category: " + currentCategory + " • " + filteredMenus.length + " items";
        } else {
            resultText.innerText = 'Results for "' + searchKeyword + '" • ' + filteredMenus.length + " items";
        }
    }

    grid.innerHTML = "";
    if (filteredMenus.length === 0) {
        grid.innerHTML = '<div class="text-center p-7 bg-[#fbf5ee] border border-dashed border-[#e6d7c7] rounded-3xl text-[#a97a52] md:col-span-2 xl:col-span-3">No menu items found<br>Try another keyword</div>';
        return;
    }

    const orderingLocked = isOrderCreationDisabled();

    // Render HTML manually for each menu
    let menuHTML = "";
    filteredMenus.forEach(function (menu) {
        let cardClass = "menu-card group rounded-[30px] border border-[#e6d7c7] bg-[#fbf5ee] p-4 shadow-[0_10px_30px_rgba(95,64,40,0.08)] flex flex-col gap-4 ";
        if (orderingLocked === true) {
            cardClass += "opacity-90";
        } else {
            cardClass += "cursor-pointer transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(95,64,40,0.14)]";
        }

        // We use window.openItemModalById to safely pass data from HTML string
        let onClickAction = orderingLocked ? "" : `onclick="window.openItemModalById(${menu.id})"`;

        menuHTML += `
            <div class="${cardClass}" ${onClickAction} tabindex="0" role="button">
                <div class="overflow-hidden rounded-[22px] border border-[#e6d7c7] bg-[#efe4d8]">
                    <img src="${resolveMenuImage(menu.name, menu.image)}" class="menu-image h-48 w-full object-cover transition duration-300 group-hover:scale-[1.03]">
                </div>
                <div class="menu-row flex items-center justify-between gap-4 px-1">
                    <div class="min-w-0">
                        <h3 class="truncate text-xl font-bold text-[#5f4028] sm:text-2xl">${menu.name}</h3>
                    </div>
                    <div class="shrink-0 text-right text-xl font-extrabold text-[#7a4e2f] sm:text-2xl">${menu.price} Baht</div>
                </div>
            </div>
        `;
    });

    grid.innerHTML = menuHTML;
}

window.openItemModalById = function (id) {
    if (isOrderingLocked() === true) {
        showToast("Ordering is closed after review");
        return;
    }

    let allMenus = getRuntimeMenuDatabase();
    currentMenuItem = null;
    allMenus.forEach(function (menu) {
        if (String(menu.id) === String(id)) {
            currentMenuItem = menu;
        }
    });

    if (currentMenuItem === null) return;

    currentQty = 1;
    currentSelections = [];

    let titleHTML = currentMenuItem.name;
    if (currentMenuItem.thaiName !== undefined && currentMenuItem.thaiName !== "") {
        titleHTML += ' <span class="text-xs text-[#a97a52] font-medium ml-1">(' + currentMenuItem.thaiName + ')</span>';
    }

    document.getElementById("itemModalTitle").innerHTML = titleHTML;

    let priceEl = document.getElementById("itemModalPrice");
    if (priceEl !== null) priceEl.innerText = currentMenuItem.price + " Baht";

    let descEl = document.getElementById("itemModalDesc");
    if (descEl !== null) {
        if (currentMenuItem.desc) descEl.innerText = currentMenuItem.desc;
        else descEl.innerText = "Special from the Chill n Fill kitchen";
    }

    document.getElementById("itemModalImage").src = resolveMenuImage(currentMenuItem.name, currentMenuItem.image);
    document.getElementById("itemModalNote").value = "";
    document.getElementById("itemQtyValue").innerText = "1";

    renderItemOptions(currentMenuItem);
    openModal(document.getElementById("itemModal"));
};

function renderItemOptions(menu) {
    const wrapper = document.getElementById("itemOptionsWrapper");
    const container = document.getElementById("itemOptionsContainer");
    if (wrapper === null || container === null) return;

    container.innerHTML = "";
    currentSelections = [];

    let keys = menu.optionKeys || [];
    if (keys.length === 0) {
        wrapper.classList.add("hidden");
        return;
    }

    wrapper.classList.remove("hidden");
    let optionsHTML = "";

    keys.forEach(function (key) {
        let set = optionSets[key];
        if (set !== undefined && set.choices !== undefined && set.choices.length > 0) {

            let defaultValue = set.default || set.choices[0].value;
            currentSelections.push({ key: key, label: set.label, value: defaultValue });

            optionsHTML += `
                <div class="p-1">
                    <div class="text-sm font-semibold text-[#5f4028]">${set.label}</div>
                    <div class="mt-2 flex flex-wrap gap-2">
            `;

            set.choices.forEach(function (choice) {
                let isSelected = (choice.value === defaultValue);
                let btnClass = "opt-btn px-3 py-1 rounded-full border text-xs font-semibold transition ";

                if (isSelected === true) {
                    btnClass += "bg-[#7a4e2f] text-white border-[#7a4e2f] ring-2 ring-[#7a4e2f]/30";
                } else {
                    btnClass += "bg-[#fbf5ee] text-[#5f4028] border-[#e6d7c7] hover:bg-[#efe4d8]";
                }

                let btnText = choice.value;
                if (choice.th !== undefined) btnText += " (" + choice.th + ")";

                optionsHTML += `
                    <button type="button" class="${btnClass}" data-key="${key}" onclick="window.selectFoodOption(this, '${key}', '${choice.value}')">
                        ${btnText}
                    </button>
                `;
            });
            optionsHTML += `</div></div>`;
        }
    });

    container.innerHTML = optionsHTML;
}

window.selectFoodOption = function (clickedBtn, key, val) {
    let groupButtons = document.querySelectorAll('.opt-btn[data-key="' + key + '"]');
    groupButtons.forEach(function (btn) {
        btn.classList.remove("bg-[#7a4e2f]", "text-white", "border-[#7a4e2f]", "ring-2", "ring-[#7a4e2f]/30");
        btn.classList.add("bg-[#fbf5ee]", "text-[#5f4028]", "border-[#e6d7c7]");
    });

    clickedBtn.classList.remove("bg-[#fbf5ee]", "text-[#5f4028]", "border-[#e6d7c7]");
    clickedBtn.classList.add("bg-[#7a4e2f]", "text-white", "border-[#7a4e2f]", "ring-2", "ring-[#7a4e2f]/30");

    currentSelections.forEach(function (opt) {
        if (opt.key === key) opt.value = val;
    });
};

function updateCartUI() {
    let totalItems = 0;
    let total = 0;

    cart.forEach(function (item) {
        totalItems += item.quantity;
        total += (item.price * item.quantity);
    });

    let countSpan = document.getElementById("cartCount");
    let totalSpan = document.getElementById("cartTotalPrice");
    let modalTotalSpan = document.getElementById("modalTotalPrice");
    let modalContainer = document.getElementById("cartItemsContainer");
    let preview = document.getElementById("cartPreview");
    let previewCard = document.getElementById("cartPreviewCard");

    if (countSpan !== null) countSpan.innerText = String(totalItems);
    if (totalSpan !== null) totalSpan.innerText = total + " Baht";
    if (modalTotalSpan !== null) modalTotalSpan.innerText = total + " Baht";

    // Build Cart Modal HTML
    if (modalContainer !== null) {
        if (cart.length === 0) {
            modalContainer.innerHTML = '<div class="text-center text-[#7a4e2f] py-5">No items yet. Please add a menu item.</div>';
        } else {
            let html = "";
            cart.forEach(function (item) {
                let thaiDisplay = "";
                if (item.thaiName !== undefined && item.thaiName !== "") {
                    thaiDisplay = '<span class="ml-1 text-[0.7rem] text-[#a97a52]">(' + item.thaiName + ')</span>';
                }

                let optDisplay = item.optionsText || "Standard";
                let noteDisplay = "";
                if (item.customerNote !== undefined && item.customerNote !== "") {
                    noteDisplay = '<br><span class="text-[0.75rem] text-[#7a4e2f]">Note: ' + escapeText(item.customerNote) + '</span>';
                }

                html += `
                    <div class="flex justify-between gap-3 py-2 border-b border-[#e6d7c7] text-sm">
                        <div>
                            <strong>${item.name}</strong> ${thaiDisplay} x${item.quantity}<br>
                            <span class="text-[0.7rem] text-[#a97a52]">${optDisplay}</span>
                            ${noteDisplay}
                        </div>
                        <div>${item.price * item.quantity} Baht</div>
                    </div>
                `;
            });
            modalContainer.innerHTML = html;
        }
    }

    // Build Preview Bottom Bar
    if (preview !== null && previewCard !== null) {
        if (isOrderCreationDisabled() === true) {
            previewCard.classList.add("hidden");
        } else if (cart.length === 0) {
            preview.innerHTML = '<div class="text-[#a97a52]">No items in cart.</div>';
            previewCard.classList.add("hidden");
        } else {
            previewCard.classList.remove("hidden");
            let phtml = "";
            cart.forEach(function (item) {
                let thaiDisplay = "";
                if (item.thaiName !== undefined && item.thaiName !== "") thaiDisplay = '<span class="ml-1 text-xs font-medium text-[#a97a52]">(' + item.thaiName + ')</span>';

                phtml += `
                    <div class="flex items-center justify-between border-b border-[#e6d7c7] py-2">
                        <div>
                            <div class="font-semibold">${item.name} ${thaiDisplay}</div>
                            <div class="text-xs text-[#a97a52]">x${item.quantity}</div>
                        </div>
                        <div class="font-semibold">${item.price * item.quantity} Baht</div>
                    </div>
                `;
            });
            preview.innerHTML = phtml;
        }
    }

    let sessionOwner = getCurrentSessionId();
    if (sessionOwner === "") sessionOwner = getCurrentTableNumber();
    if (sessionOwner !== "") localStorage.setItem("cart_owner_id", sessionOwner);

    localStorage.setItem("cart", JSON.stringify(cart));
}

function addToCart() {
    if (isOrderCreationDisabled() === true) {
        showToast(getOrderingDisabledMessage());
        return;
    }
    if (currentMenuItem === null) return;

    // Format options text
    let optionsStrings = [];
    currentSelections.forEach(function (opt) {
        let cleanLabel = opt.label.replace(/^[^A-Za-z0-9]+\s*/g, ""); // removes emojis
        optionsStrings.push(cleanLabel + ": " + opt.value);
    });
    let optionsDisplay = optionsStrings.join(" • ");
    if (optionsDisplay === "") optionsDisplay = "Standard";

    let noteText = document.getElementById("itemModalNote").value.trim();

    cart.push({
        id: currentMenuItem.id,
        name: currentMenuItem.name,
        thaiName: currentMenuItem.thaiName || "",
        price: currentMenuItem.price,
        quantity: currentQty,
        optionsText: optionsDisplay,
        customerNote: noteText,
        timestamp: Date.now()
    });

    updateCartUI();
    showToast("Added " + currentMenuItem.name + " x" + currentQty);
    closeModal(document.getElementById("itemModal"));
}

// ==========================================
// 6. ORDER SUBMISSION
// ==========================================
function placeOrder() {
    if (cart.length === 0) return false;
    if (isOrderCreationDisabled() === true) {
        showToast(getOrderingDisabledMessage());
        return false;
    }

    let tableNumber = getCurrentTableNumber();
    if (tableNumber === "") tableNumber = "-";

    let sessionId = getCurrentSessionId();

    let total = 0;
    cart.forEach(function (item) { total += (item.price * item.quantity); });

    let orders = getAllOrders();

    let formattedItems = [];
    cart.forEach(function (c) {
        formattedItems.push({
            name: c.name,
            qty: c.quantity,
            price: c.price,
            optionsText: c.optionsText || "",
            customerNote: c.customerNote || ""
        });
    });

    orders.push({
        id: Date.now(),
        table: tableNumber,
        userId: sessionId,
        items: formattedItems,
        total: total,
        time: new Date().toISOString(),
        status: "pending"
    });

    saveAllOrders(orders);

    cart = [];
    updateCartUI();

    const orderModal = document.getElementById("orderStatusModal");
    if (orderModal !== null) {
        openModal(orderModal);
        renderOrderStatus();
    }
    showToast("Order sent to kitchen");
    return true;
}

// ==========================================
// 7. ORDER STATUS & PAYMENT HISTORY
// ==========================================
function getOrderStatusClass(status) {
    let norm = String(status || "").toLowerCase();
    if (norm === "completed" || norm === "served" || norm === "serving" || norm === "done") return "bg-[#dff3e4] text-[#1f7a3d]";
    if (norm === "cooking" || norm === "preparing") return "bg-[#e5f0ff] text-[#1b4d8f]";
    if (norm === "ready") return "bg-[#eaf7ff] text-[#0f5d7f]";
    if (norm === "cancelled" || norm === "canceled") return "bg-[#fde2e2] text-[#b42318]";
    return "bg-[#fff1cc] text-[#9a6a00]";
}

function renderOrderStatus() {
    const container = document.getElementById("orderStatusContainer");
    if (container === null) return;

    let orders = getCurrentSessionOrders();
    orders.sort(function (a, b) { return new Date(b.time || 0) - new Date(a.time || 0); });

    if (orders.length === 0) {
        container.innerHTML = '<div class="text-center py-5 text-[#a97a52]">No orders found</div>';
        return;
    }

    let html = "";
    orders.forEach(function (order) {
        let itemsArr = [];
        if (Array.isArray(order.items)) {
            order.items.forEach(function (it) { itemsArr.push(it.name + " x" + it.qty); });
        }
        let itemsText = itemsArr.join(", ");
        if (itemsText === "" && typeof order.items === "string") itemsText = order.items;
        if (itemsText === "") itemsText = "-";

        let payText = "Waiting for payment";
        let stat = String(order.status || "").toLowerCase();
        let isPaid = (order.paymentId !== undefined || order.paidAt !== undefined || String(order.paymentStatus).toLowerCase() === "paid");

        if (stat === "cancelled" || stat === "canceled") payText = "Not required";
        else if (isPaid === true) payText = "Paid (" + (order.paymentMethod || "Cash") + ")";

        let dDate = new Date(order.time);
        let timeStr = isNaN(dDate.getTime()) ? order.time : dDate.toLocaleString();

        html += `
            <div class="rounded-2xl border border-[#e6d7c7] bg-[#fffaf5] p-4 mb-3">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div class="font-bold text-[#5f4028]">Order #${order.id}</div>
                    <div class="px-3 py-1 rounded-full text-xs font-bold ${getOrderStatusClass(order.status)}">
                        ${String(order.status || "pending").toUpperCase()}
                    </div>
                </div>
                <div class="text-sm text-[#a97a52]">Table: ${order.table || "-"}</div>
                <div class="text-sm text-[#a97a52] mt-1">Time: ${timeStr}</div>
                <div class="text-sm text-[#a97a52] mt-1">Items: ${itemsText}</div>
                <div class="text-sm text-[#a97a52] mt-1">Payment: ${payText}</div>
                <div class="text-sm font-semibold text-[#7a4e2f] mt-2">Total: ${order.total || 0} Baht</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderPaymentHistory() {
    const container = document.getElementById("paymentHistoryContainer");
    if (container === null) return;

    let payments = getCurrentSessionPayments();
    payments.sort(function (a, b) { return new Date(b.time || 0) - new Date(a.time || 0); });

    if (payments.length === 0) {
        let tNum = getCurrentTableNumber() || "-";
        let uId = getCurrentSessionId() || "-";
        container.innerHTML = `
            <div class="text-center py-5 text-[#a97a52]">
                No payment/review history for this session
                <div class="text-xs mt-1">Table: ${escapeText(tNum)} | User: ${escapeText(uId)}</div>
            </div>
        `;
        return;
    }

    let allReviews = getCurrentSessionReviews();

    let html = "";
    payments.forEach(function (pay) {
        let orderLabel = pay.orderId || "-";
        if (Array.isArray(pay.orderIds) && pay.orderIds.length > 0) orderLabel = pay.orderIds.join(", ");

        let itemsText = "-";
        if (Array.isArray(pay.items) && pay.items.length > 0) {
            let iArr = [];
            pay.items.forEach(function (i) { iArr.push(i.name + " x" + i.qty); });
            itemsText = iArr.join(", ");
        }

        // Find review
        let myReview = null;
        allReviews.forEach(function (r) {
            if (String(r.paymentId || "") === String(pay.id)) myReview = r;
        });

        let hasReview = (myReview !== null || pay.reviewSubmitted === true);
        let revTime = "-";
        let revText = "-";
        let revRating = "Not rated";

        if (myReview !== null) {
            let rd = new Date(myReview.time);
            revTime = isNaN(rd.getTime()) ? myReview.time : rd.toLocaleString();
            if (myReview.comment) revText = myReview.comment;

            let val = Math.max(0, Math.min(5, Number(myReview.rating) || 0));
            revRating = "★".repeat(val) + "☆".repeat(5 - val);
        }

        let dDate = new Date(pay.time);
        let payTimeStr = isNaN(dDate.getTime()) ? pay.time : dDate.toLocaleString();

        let statColor = "bg-[#efe4d8] text-[#7a4e2f]"; // default
        if (pay.status === "paid") statColor = "bg-[#dff3e4] text-[#1f7a3d]";
        if (pay.status === "pending") statColor = "bg-[#fff1cc] text-[#9a6a00]";
        if (pay.status === "failed") statColor = "bg-[#fde2e2] text-[#b42318]";

        let statLabel = paymentStatusLabels[pay.status] || "Paid";

        html += `
            <div class="rounded-2xl border border-[#e6d7c7] bg-[#fffaf5] p-4 mb-3">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div class="font-bold text-[#5f4028]">Table ${escapeText(pay.table || "-")}</div>
                    <div class="px-3 py-1 rounded-full text-xs font-bold ${statColor}">
                        ${escapeText(statLabel)}
                    </div>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-3 mb-1">
                    <div class="text-sm text-[#a97a52]">Order: ${escapeText(orderLabel)}</div>
                    <div class="text-lg font-extrabold text-[#7a4e2f]">${escapeText(pay.amount)} Baht</div>
                </div>
                <div class="text-sm text-[#a97a52] mt-1">Date: ${escapeText(payTimeStr)}</div>
                <div class="text-sm text-[#a97a52] mt-1">Method: ${escapeText(pay.method || "Cash")}</div>
                <div class="text-sm text-[#a97a52] mt-1">Items: ${escapeText(itemsText)}</div>
                <div class="mt-3 rounded-xl border border-[#e6d7c7] bg-[#fbf5ee] px-3 py-2">
                    <div class="text-xs font-semibold text-[#7a4e2f] mb-1">Your Review</div>
                    <div class="text-sm text-[#a97a52]">Rating: ${escapeText(revRating)}</div>
                    <div class="text-sm text-[#a97a52] mt-1">Comment: ${escapeText(revText)}</div>
                    <div class="text-xs text-[#b48a63] mt-1">Reviewed At: ${escapeText(revTime)}</div>
                    <button class="btn btn-xs mt-2 rounded-full bg-[#a97a52] text-white border-none hover:bg-[#7a4e2f]" onclick="window.openReviewForPayment('${pay.id}')">
                        ${hasReview ? "Edit Review" : "Rate & Review"}
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

window.openOrderStatusModal = function () {
    openModal(document.getElementById("orderStatusModal"));
    renderOrderStatus();
};

window.openPaymentHistoryModalNow = function () {
    openModal(document.getElementById("paymentHistoryModal"));
    renderPaymentHistory();
};

// ==========================================
// 8. PAYMENT CHECKOUT LOGIC
// ==========================================
function updatePaymentMethodUI() {
    let qrCodePanel = document.getElementById("qrCodePanel");
    let confirmBtn = document.getElementById("confirmPaymentBtn");

    document.querySelectorAll(".payment-method-btn").forEach(function (button) {
        let isSelected = (button.dataset.method === currentPaymentMethod);
        if (isSelected === true) {
            button.classList.add("border-[#7a4e2f]", "bg-[#fff4e8]", "ring-2", "ring-[#7a4e2f]/20");
        } else {
            button.classList.remove("border-[#7a4e2f]", "bg-[#fff4e8]", "ring-2", "ring-[#7a4e2f]/20");
        }
    });

    if (qrCodePanel !== null) {
        if (currentPaymentMethod === "QR Code") qrCodePanel.classList.remove("hidden");
        else qrCodePanel.classList.add("hidden");
    }

    if (confirmBtn !== null) {
        let actionText = "Confirm Payment";
        if (currentPaymentMethod !== "") actionText = "Confirm " + currentPaymentMethod + " Payment";

        confirmBtn.innerText = (paymentActionAllowed === true) ? actionText : "Payment Not Available";
        confirmBtn.disabled = !paymentActionAllowed;

        if (paymentActionAllowed === true) {
            confirmBtn.classList.remove("opacity-60", "cursor-not-allowed");
        } else {
            confirmBtn.classList.add("opacity-60", "cursor-not-allowed");
        }
    }
}

window.openMenuPaymentModal = function () {
    currentPaymentMethod = "";
    currentPaymentContext = null;
    paymentActionAllowed = false;
    paymentBlockingMessage = "";

    const paymentModal = document.getElementById("paymentModal");
    const summaryContainer = document.getElementById("paymentSummaryContainer");

    if (isOrderingLocked() === true) {
        paymentBlockingMessage = "Ordering is closed after review";
        if (summaryContainer !== null) summaryContainer.innerHTML = '<div class="rounded-[24px] border border-[#d7b58f] bg-[#fff4e8] p-4"><div class="text-sm font-semibold text-[#7a4e2f]">' + paymentBlockingMessage + '</div></div>';
        showActionFeedback(paymentBlockingMessage);
        updatePaymentMethodUI();
        openModal(paymentModal);
        return;
    }

    if (getPendingReviewPaymentId() !== "") {
        window.openReviewModal();
        showActionFeedback("Please submit review before another payment/order");
        return;
    }

    let allOrders = getCurrentSessionOrders();
    let outstandingOrders = [];
    allOrders.forEach(function (o) {
        let stat = String(o.status || "").toLowerCase();
        let isCancelled = (stat === "cancelled" || stat === "canceled");
        let isPaid = (o.paymentId !== undefined || o.paidAt !== undefined || String(o.paymentStatus).toLowerCase() === "paid");
        if (isPaid === false && isCancelled === false) {
            outstandingOrders.push(o);
        }
    });

    if (outstandingOrders.length === 0) {
        paymentBlockingMessage = "No unpaid orders for this session";
        if (summaryContainer !== null) summaryContainer.innerHTML = '<div class="rounded-[24px] border border-[#d7b58f] bg-[#fff4e8] p-4"><div class="text-sm font-semibold text-[#7a4e2f]">' + paymentBlockingMessage + '</div></div>';
        showActionFeedback(paymentBlockingMessage);
        updatePaymentMethodUI();
        openModal(paymentModal);
        return;
    }

    let allServed = true;
    outstandingOrders.forEach(function (o) {
        let stat = String(o.status || "").toLowerCase();
        let served = (stat === "serving" || stat === "served" || stat === "completed" || stat === "done");
        if (served === false) allServed = false;
    });

    if (allServed === false) {
        paymentBlockingMessage = "Payment is available after all food is served";
        if (summaryContainer !== null) summaryContainer.innerHTML = '<div class="rounded-[24px] border border-[#d7b58f] bg-[#fff4e8] p-4"><div class="text-sm font-semibold text-[#7a4e2f]">' + paymentBlockingMessage + '</div></div>';
        showActionFeedback(paymentBlockingMessage);
        updatePaymentMethodUI();
        openModal(paymentModal);
        return;
    }

    // Build context
    let total = 0;
    let orderIds = [];
    let allItems = [];

    outstandingOrders.sort(function (a, b) { return new Date(a.time || 0) - new Date(b.time || 0); });

    outstandingOrders.forEach(function (o) {
        total += Number(o.total || 0);
        orderIds.push(o.id);
        if (Array.isArray(o.items)) {
            o.items.forEach(function (it) {
                allItems.push({ name: it.name, qty: it.qty, price: it.price || 0, orderId: o.id });
            });
        }
    });

    currentPaymentContext = { orders: outstandingOrders, items: allItems, orderIds: orderIds, total: total };
    paymentActionAllowed = true;

    // Render Summary
    if (summaryContainer !== null) {
        let html = `
            <div class="rounded-[24px] border border-[#e6d7c7] bg-[#fffaf5] p-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div class="text-sm text-[#a97a52]">Orders ready for payment</div>
                        <div class="text-lg font-extrabold text-[#5f4028]">${outstandingOrders.length} order${outstandingOrders.length > 1 ? "s" : ""}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-[#a97a52]">Total</div>
                        <div class="text-2xl font-extrabold text-[#7a4e2f]">${total} Baht</div>
                    </div>
                </div>
            </div>
        `;
        outstandingOrders.forEach(function (o) {
            let itemsArr = [];
            if (Array.isArray(o.items)) o.items.forEach(function (it) { itemsArr.push(it.name + " x" + it.qty); });
            html += `
                <div class="rounded-[24px] border border-[#e6d7c7] bg-[#fffaf5] p-4 mt-2">
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
                        <div class="font-bold text-[#5f4028]">Order #${o.id}</div>
                        <div class="text-sm font-semibold text-[#7a4e2f]">${o.total || 0} Baht</div>
                    </div>
                    <div class="text-sm text-[#a97a52]">${itemsArr.join(", ")}</div>
                </div>
            `;
        });
        summaryContainer.innerHTML = html;
    }

    updatePaymentMethodUI();
    openModal(paymentModal);
};

function confirmPaymentSelection() {
    if (paymentActionAllowed === false) {
        showActionFeedback(paymentBlockingMessage || "Payment is not available right now");
        return;
    }
    if (currentPaymentContext === null || currentPaymentContext.orders.length === 0) {
        showActionFeedback("No unpaid orders for this session");
        return;
    }
    if (currentPaymentMethod === "") {
        showToast("Please choose a payment method");
        return;
    }

    let paymentId = Date.now();
    let now = new Date().toISOString();

    let paymentRecord = {
        id: paymentId,
        orderId: currentPaymentContext.orderIds.join(", "),
        orderIds: currentPaymentContext.orderIds.slice(), // copy array
        table: getCurrentTableNumber() || "-",
        userId: getCurrentSessionId() || "",
        items: currentPaymentContext.items,
        amount: currentPaymentContext.total,
        time: now,
        method: currentPaymentMethod,
        status: "paid"
    };

    let payments = getAllPayments();
    payments.push(paymentRecord);
    saveAllPayments(payments);

    let orders = getAllOrders();
    orders.forEach(function (o) {
        if (currentPaymentContext.orderIds.indexOf(o.id) !== -1) {
            o.paymentId = paymentId;
            o.paymentStatus = "paid";
            o.paymentMethod = currentPaymentMethod;
            o.paidAt = now;
        }
    });
    saveAllOrders(orders);

    localStorage.setItem(getPendingReviewKey(), String(paymentId));

    renderPaymentHistory();
    renderOrderStatus();

    closeModal(document.getElementById("paymentModal"));

    currentPaymentMethod = "";
    currentPaymentContext = null;
    paymentActionAllowed = false;

    window.openReviewModal(paymentRecord);
    applyOrderingState();
    showToast("Payment recorded");
}

// ==========================================
// 9. REVIEW LOGIC
// ==========================================
window.openReviewModal = function (paymentRecordParam) {
    let reviewModal = document.getElementById("reviewModal");
    let summaryText = document.getElementById("reviewSummaryText");
    if (reviewModal === null) return;

    let targetPayment = null;

    // Resolve payment record
    if (paymentRecordParam !== undefined && paymentRecordParam !== null) {
        targetPayment = paymentRecordParam;
    } else {
        let pendingId = getPendingReviewPaymentId();
        let allPayments = getAllPayments();
        allPayments.forEach(function (p) {
            if (String(p.id) === String(pendingId)) targetPayment = p;
        });
    }

    currentReviewPaymentId = targetPayment !== null ? String(targetPayment.id) : "";

    // Load existing review if editing
    let existingReview = null;
    if (currentReviewPaymentId !== "") {
        let allReviews = getCurrentSessionReviews();
        allReviews.forEach(function (r) {
            if (String(r.paymentId || "") === currentReviewPaymentId) existingReview = r;
        });
    }

    if (summaryText !== null) {
        if (targetPayment !== null) {
            summaryText.innerText = "Payment received: " + targetPayment.amount + " Baht via " + (targetPayment.method || "Cash") + ". Please leave a review to finish this session.";
        } else {
            summaryText.innerText = "Tell us about your experience after payment.";
        }
    }

    currentRating = 0;
    if (existingReview !== null && existingReview.rating !== undefined) {
        currentRating = Math.max(0, Math.min(5, Number(existingReview.rating)));
    }

    let reviewTextarea = document.getElementById("reviewTextarea");
    if (reviewTextarea !== null) {
        if (existingReview !== null && existingReview.comment !== undefined) reviewTextarea.value = existingReview.comment;
        else reviewTextarea.value = "";
    }

    document.querySelectorAll("#starRating .star").forEach(function (star, index) {
        if (index < currentRating) star.classList.add("text-[#f5b342]");
        else star.classList.remove("text-[#f5b342]");
    });

    openModal(reviewModal);
};

window.openReviewForPayment = function (paymentId) {
    let allPayments = getAllPayments();
    let target = null;
    allPayments.forEach(function (p) { if (String(p.id) === String(paymentId)) target = p; });
    if (target === null) {
        showToast("Payment not found for this session");
        return;
    }
    window.openReviewModal(target);
};

function submitReview() {
    let reviewTextarea = document.getElementById("reviewTextarea");
    let reviewText = "";
    if (reviewTextarea !== null) reviewText = reviewTextarea.value.trim();

    if (reviewText === "" && currentRating === 0) {
        showToast("Please add a rating or review before submitting");
        return;
    }

    let now = new Date().toISOString();
    let paymentId = currentReviewPaymentId;
    if (paymentId === "") paymentId = getPendingReviewPaymentId();

    let reviews = getAllReviews();

    // Check if we are updating an existing review
    let existingIndex = -1;
    if (paymentId !== "") {
        for (let i = 0; i < reviews.length; i++) {
            if (String(reviews[i].paymentId || "") === String(paymentId) && matchesCurrentSession(reviews[i]) === true) {
                existingIndex = i;
                break;
            }
        }
    }

    let reviewPayload = {
        rating: currentRating || 0,
        comment: reviewText,
        time: now,
        table: getCurrentTableNumber() || "-",
        userId: getCurrentSessionId() || "",
        paymentId: paymentId || null
    };

    if (existingIndex >= 0) {
        // Update existing
        reviews[existingIndex].rating = reviewPayload.rating;
        reviews[existingIndex].comment = reviewPayload.comment;
        reviews[existingIndex].time = reviewPayload.time;
    } else {
        // Create new
        reviews.push(reviewPayload);
    }
    saveAllReviews(reviews);

    if (paymentId !== "") {
        let payments = getAllPayments();
        payments.forEach(function (p) {
            if (String(p.id) === String(paymentId)) {
                p.reviewSubmitted = true;
                p.reviewSubmittedAt = now;
            }
        });
        saveAllPayments(payments);

        let orders = getAllOrders();
        orders.forEach(function (o) {
            if (String(o.paymentId) === String(paymentId)) o.reviewSubmittedAt = now;
        });
        saveAllOrders(orders);
    }

    setOrderingLocked(true);
    localStorage.removeItem(getPendingReviewKey());
    currentReviewPaymentId = "";

    cart = [];
    updateCartUI();

    closeModal(document.getElementById("reviewModal"));
    renderPaymentHistory();
    renderOrderStatus();
    applyOrderingState();
    showToast("Thanks for your review");
}

function logoutCustomer() {
    localStorage.removeItem(getOrderingLockKey());
    localStorage.removeItem(getPendingReviewKey());
    localStorage.removeItem("open_order_status");
    localStorage.removeItem("open_payment_modal");
    localStorage.removeItem("open_review_modal");
    localStorage.removeItem("cart");
    localStorage.removeItem("cart_owner_id");
    localStorage.removeItem("user_type");
    localStorage.removeItem("user_id");
    localStorage.removeItem("table_number");
    window.location.href = "index.html";
}


// ==========================================
// 10. INITIALIZATION & EVENT LISTENERS
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    syncCartWithSession();

    let tableDisplay = document.getElementById("tableDisplay");
    let tNum = getCurrentTableNumber();
    if (tableDisplay !== null && tNum !== "") {
        tableDisplay.textContent = "Table " + tNum;
        tableDisplay.classList.remove("hidden");
    }

    // Modal Triggers
    const openCartBtn = document.getElementById("openCartModal");
    if (openCartBtn !== null) openCartBtn.addEventListener("click", function () {
        if (isOrderCreationDisabled() === true) { showToast(getOrderingDisabledMessage()); return; }
        window.location.href = "cart.html";
    });

    const openCartInlineBtn = document.getElementById("openCartInlineBtn");
    if (openCartInlineBtn !== null) openCartInlineBtn.addEventListener("click", function () {
        if (isOrderCreationDisabled() === true) { showToast(getOrderingDisabledMessage()); return; }
        window.location.href = "cart.html";
    });

    const closeCartBtn = document.getElementById("closeModalBtn");
    if (closeCartBtn !== null) closeCartBtn.addEventListener("click", function () { closeModal(document.getElementById("cartModal")); });

    const closeItemModalBtn = document.getElementById("closeItemModalBtn");
    if (closeItemModalBtn !== null) closeItemModalBtn.addEventListener("click", function () { closeModal(document.getElementById("itemModal")); });

    const openPaymentHistoryBtn = document.getElementById("openPaymentHistoryBtn");
    if (openPaymentHistoryBtn !== null) openPaymentHistoryBtn.addEventListener("click", window.openPaymentHistoryModalNow);

    const closePaymentHistoryBtn = document.getElementById("closePaymentHistoryBtn");
    if (closePaymentHistoryBtn !== null) closePaymentHistoryBtn.addEventListener("click", function () { closeModal(document.getElementById("paymentHistoryModal")); });

    const openOrderStatusBtn = document.getElementById("openOrderStatusBtn");
    if (openOrderStatusBtn !== null) openOrderStatusBtn.addEventListener("click", function (e) { e.preventDefault(); window.openOrderStatusModal(); });

    const closeOrderStatusBtn = document.getElementById("closeOrderStatusBtn");
    if (closeOrderStatusBtn !== null) closeOrderStatusBtn.addEventListener("click", function () { closeModal(document.getElementById("orderStatusModal")); });

    const openPaymentBtn = document.getElementById("openPaymentBtn");
    if (openPaymentBtn !== null) openPaymentBtn.addEventListener("click", function (e) { e.preventDefault(); window.openMenuPaymentModal(); });

    const closePaymentBtn = document.getElementById("closePaymentBtn");
    if (closePaymentBtn !== null) closePaymentBtn.addEventListener("click", function () {
        closeModal(document.getElementById("paymentModal"));
        currentPaymentMethod = "";
        currentPaymentContext = null;
        paymentActionAllowed = false;
    });

    // Category Buttons
    const catBtns = document.querySelectorAll(".cat-btn");
    catBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            catBtns.forEach(function (b) {
                b.classList.remove("bg-[#7a4e2f]", "text-[#fbf5ee]", "border-[#7a4e2f]");
                b.classList.add("bg-[#fbf5ee]", "text-[#7a4e2f]", "border-[#e6d7c7]");
            });
            btn.classList.remove("bg-[#fbf5ee]", "text-[#7a4e2f]", "border-[#e6d7c7]");
            btn.classList.add("bg-[#7a4e2f]", "text-[#fbf5ee]", "border-[#7a4e2f]");

            currentCategory = btn.getAttribute("data-cat");
            renderMenu();
        });
    });

    // Search
    const searchInput = document.getElementById("menuSearch");
    if (searchInput !== null) {
        searchInput.addEventListener("input", function () {
            searchKeyword = this.value;
            renderMenu();
        });
    }

    // Item Adding
    const itemQtyMinus = document.getElementById("itemQtyMinus");
    const itemQtyValue = document.getElementById("itemQtyValue");
    if (itemQtyMinus !== null) {
        itemQtyMinus.addEventListener("click", function () {
            if (currentQty > 1) {
                currentQty = currentQty - 1;
                itemQtyValue.innerText = String(currentQty);
            }
        });
    }

    const itemQtyPlus = document.getElementById("itemQtyPlus");
    if (itemQtyPlus !== null) {
        itemQtyPlus.addEventListener("click", function () {
            currentQty = currentQty + 1;
            itemQtyValue.innerText = String(currentQty);
        });
    }

    const itemAddBtn = document.getElementById("itemAddBtn");
    if (itemAddBtn !== null) itemAddBtn.addEventListener("click", addToCart);

    // Cart Management
    const clearCartBtn = document.getElementById("clearCartBtn");
    if (clearCartBtn !== null) {
        clearCartBtn.addEventListener("click", function () {
            if (isOrderCreationDisabled() === true) { showToast(getOrderingDisabledMessage()); return; }
            if (cart.length > 0) {
                cart = [];
                updateCartUI();
                showToast("Cleared all items");
            } else {
                showToast("Cart is already empty");
            }
        });
    }

    const fakeOrderBtn = document.getElementById("fakeOrderBtn");
    if (fakeOrderBtn !== null) {
        fakeOrderBtn.addEventListener("click", placeOrder);
    }

    // Payment Selection
    document.querySelectorAll(".payment-method-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            currentPaymentMethod = button.dataset.method || "";
            updatePaymentMethodUI();
        });
    });

    const confirmPaymentBtn = document.getElementById("confirmPaymentBtn");
    if (confirmPaymentBtn !== null) confirmPaymentBtn.addEventListener("click", confirmPaymentSelection);

    // Review Stars
    document.querySelectorAll("#starRating .star").forEach(function (star) {
        star.addEventListener("click", function () {
            currentRating = parseInt(star.dataset.value || "0", 10);
            document.querySelectorAll("#starRating .star").forEach(function (item, index) {
                if (index < currentRating) item.classList.add("text-[#f5b342]");
                else item.classList.remove("text-[#f5b342]");
            });
        });
    });

    const submitReviewBtn = document.getElementById("submitReviewBtn");
    if (submitReviewBtn !== null) submitReviewBtn.addEventListener("click", submitReview);

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn !== null) logoutBtn.addEventListener("click", logoutCustomer);

    // Global click listener to close modals
    window.addEventListener("click", function (event) {
        let cartModal = document.getElementById("cartModal");
        let payHisModal = document.getElementById("paymentHistoryModal");
        let payModal = document.getElementById("paymentModal");
        let statModal = document.getElementById("orderStatusModal");
        let itModal = document.getElementById("itemModal");

        if (event.target === cartModal) closeModal(cartModal);
        if (event.target === payHisModal) closeModal(payHisModal);
        if (event.target === statModal) closeModal(statModal);
        if (event.target === itModal) closeModal(itModal);
        if (event.target === payModal) {
            closeModal(payModal);
            currentPaymentMethod = "";
            currentPaymentContext = null;
            paymentActionAllowed = false;
        }
    });

    // Storage sync for multiple tabs
    window.addEventListener("storage", function (event) {
        let eventKey = event.key || "";
        let validKeys = ["orders", "payments", "reviews", "cart", "cart_owner_id", "menus"];
        let isValid = false;

        validKeys.forEach(function (vk) { if (eventKey === vk) isValid = true; });
        if (eventKey.indexOf("ordering_locked_after_review_") === 0) isValid = true;
        if (eventKey.indexOf("pending_review_payment_") === 0) isValid = true;

        if (isValid === true) {
            syncCartWithSession();
            renderPaymentHistory();
            renderOrderStatus();
            applyOrderingState();
        }
    });

    // Check for open modal flags from other pages (like cart.html)
    if (localStorage.getItem("open_order_status") === "1") {
        localStorage.removeItem("open_order_status");
        window.openOrderStatusModal();
    }
    if (localStorage.getItem("open_payment_modal") === "1") {
        localStorage.removeItem("open_payment_modal");
        window.openMenuPaymentModal();
    }
    if (localStorage.getItem("open_review_modal") === "1") {
        localStorage.removeItem("open_review_modal");
        window.openReviewModal();
    }

    renderMenu();
    updateCartUI();
    renderPaymentHistory();
    renderOrderStatus();
    applyOrderingState();

    if (getPendingReviewPaymentId() !== "" && isOrderingLocked() === false) {
        window.openReviewModal();
    }
});