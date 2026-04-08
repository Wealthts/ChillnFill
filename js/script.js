/*
 * Index/Login Script
 * 1. CONFIG + STATE
 * 2. HELPER FUNCTIONS
 * 3. API FUNCTIONS
 * 4. LOGIN/ROLE FUNCTIONS
 * 5. UI FUNCTIONS
 * 6. PAGE START
 */

const STORAGE_KEYS = Object.freeze({
    userId: "user_id",
    tableNumber: "table_number",
    userType: "user_type",
    cookId: "cook_id",
    cookName: "cook_name",
    adminLoggedIn: "admin_logged_in"
});

const PAGE_PATHS = Object.freeze({
    menu: "menu.html",
    cook: "cook.html",
    admin: "admin.html",
    staff: "staff.html"
});

const API_ENDPOINTS = Object.freeze({
    session: "session",
    health: "health",
    customerLogin: "customer/login",
    cookAccess: "cook/access",
    cookSetupPassword: "cook/setup-password",
    cookLogin: "cook/login",
    adminLogin: "admin/login"
});

const UI_IDS = Object.freeze({
    messageContainer: "message-container",
    roleButtons: "role-buttons",
    customerForm: "customer-form",
    cookRegisterForm: "cook-register-form",
    tableNumberInput: "table-number",
    cookIdInput: "cook-id",
    cookPasswordInput: "cook-password",
    cookNewPasswordInput: "cook-new-password",
    cookConfirmPasswordInput: "cook-confirm-password",
    adminUsernameInput: "admin-username",
    adminPasswordInput: "admin-password",
    cookLoginPanel: "cook-login-panel",
    cookSetupPanel: "cook-setup-panel",
    cookSetupTitle: "cook-setup-title",
    cookSetupSubtitle: "cook-setup-subtitle",
    customerRoleButton: "btn-role-customer",
    customerBackButton: "btn-customer-back"
});

const pageState = {
    apiBaseUrl: ""
};

// 2. HELPER FUNCTIONS
function getById(id) {
    return document.getElementById(id);
}

function readValue(id) {
    return String(getById(id)?.value || "").trim();
}

function normalizeApiBase(path) {
    if (!path) return "";
    return path.endsWith("/") ? path : `${path}/`;
}

function getApiBaseFromMeta() {
    const meta = document.querySelector('meta[name="api-base"]');
    const raw = String(meta?.content || "").trim();
    if (!raw) return "";

    if (raw.startsWith("http://") || raw.startsWith("https://")) {
        return normalizeApiBase(raw);
    }

    return normalizeApiBase(window.location.origin + raw);
}

async function isApiBaseAvailable(base) {
    const normalizedBase = normalizeApiBase(base);

    try {
        const healthResponse = await fetch(`${normalizedBase}${API_ENDPOINTS.health}`, { method: "GET" });
        const healthType = String(healthResponse.headers.get("content-type") || "");
        if (healthResponse.ok && healthType.includes("application/json")) {
            return true;
        }
    } catch (error) {
    }

    try {
        const sessionResponse = await fetch(`${normalizedBase}${API_ENDPOINTS.session}`, { method: "GET" });
        const sessionType = String(sessionResponse.headers.get("content-type") || "");
        if (sessionResponse.ok && sessionType.includes("application/json")) {
            return true;
        }
    } catch (error) {
    }

    return false;
}

function getApiBaseCandidates() {
    return [
        getApiBaseFromMeta(),
        normalizeApiBase(window.location.origin + "/api/"),
        "http://localhost:3000/api/",
        "http://127.0.0.1:3000/api/"
    ].filter(Boolean);
}

// 3. API FUNCTIONS
async function findApiBase() {
    const tested = new Set();

    for (const candidate of getApiBaseCandidates()) {
        const normalized = normalizeApiBase(candidate);
        if (tested.has(normalized)) continue;
        tested.add(normalized);

        if (await isApiBaseAvailable(normalized)) {
            return normalized;
        }
    }

    return normalizeApiBase(window.location.origin + "/api/");
}

async function parseJsonResponse(response) {
    const contentType = String(response.headers.get("content-type") || "");
    if (!contentType.includes("application/json")) {
        const textBody = await response.text();
        const preview = textBody ? `Body: ${textBody.slice(0, 200)}` : "";
        throw new Error(`API response is not JSON (status ${response.status}). ${preview}`.trim());
    }

    return response.json();
}

function showSweetAlertMessage(text, type = "error") {
    if (!window.Swal) return false;
    const icon = type === "success" ? "success" : "error";
    const title = icon === "success" ? "Success" : "Error";

    window.Swal.fire({
        icon,
        title,
        text: String(text || ""),
        confirmButtonColor: "#7a4e2f"
    });
    return true;
}

function showMessage(text, type = "error") {
    const container = getById(UI_IDS.messageContainer);
    if (showSweetAlertMessage(text, type)) {
        if (container) container.innerHTML = "";
        return;
    }

    if (!container) {
        console.warn("SweetAlert2 is unavailable:", text);
        return;
    }

    const variantClass = type === "success" ? "alert-success" : "alert-error";
    container.innerHTML = `<div role="alert" class="alert ${variantClass} text-sm font-medium">${text}</div>`;

    setTimeout(() => {
        if (container.textContent?.includes(text)) {
            container.innerHTML = "";
        }
    }, 3000);
}

function bindClick(id, handler) {
    const element = getById(id);
    if (!element) return;
    element.addEventListener("click", handler);
}

function bindEnter(ids, handler) {
    ids.forEach((id) => {
        const input = getById(id);
        if (!input) return;

        input.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            handler();
        });
    });
}

function normalizeTableNumber(value) {
    const parsed = Number.parseInt(String(value || "").trim(), 10);
    if (!Number.isInteger(parsed)) return null;
    if (parsed < 1 || parsed > 10) return null;
    return parsed;
}

function normalizeCookId(value) {
    return String(value || "").trim().toLowerCase();
}

function hideAllForms() {
    document.querySelectorAll(".login-form").forEach((form) => {
        form.classList.add("hidden");
    });

    const roleButtons = getById(UI_IDS.roleButtons);
    if (roleButtons) roleButtons.classList.remove("hidden");
}

function showLoginForm(role) {
    hideAllForms();

    const roleButtons = getById(UI_IDS.roleButtons);
    if (roleButtons) roleButtons.classList.add("hidden");

    const formMap = {
        customer: UI_IDS.customerForm
    };

    const formId = formMap[role];
    if (!formId) return;

    const formElement = getById(formId);
    if (formElement) formElement.classList.remove("hidden");
}

function showRegisterForm() {
    hideAllForms();

    const roleButtons = getById(UI_IDS.roleButtons);
    if (roleButtons) roleButtons.classList.add("hidden");

    const registerForm = getById(UI_IDS.cookRegisterForm);
    if (registerForm) registerForm.classList.remove("hidden");
}

function setCookSetupPanelVisible(isVisible, cook = null) {
    const loginPanel = getById(UI_IDS.cookLoginPanel);
    const setupPanel = getById(UI_IDS.cookSetupPanel);
    const titleEl = getById(UI_IDS.cookSetupTitle);
    const subtitleEl = getById(UI_IDS.cookSetupSubtitle);

    if (loginPanel) loginPanel.classList.toggle("hidden", isVisible);
    if (setupPanel) setupPanel.classList.toggle("hidden", !isVisible);

    if (isVisible && cook) {
        const cookName = cook.full_name || cook.cook_id || "Cook";
        const cookId = cook.cook_id || "-";

        if (titleEl) titleEl.textContent = `Create Password for ${cookName}`;
        if (subtitleEl) subtitleEl.textContent = `Cook ID: ${cookId}. Set your password to continue.`;
    }
}

function cookResetSetup() {
    setCookSetupPanelVisible(false);

    const newPasswordInput = getById(UI_IDS.cookNewPasswordInput);
    const confirmPasswordInput = getById(UI_IDS.cookConfirmPasswordInput);

    if (newPasswordInput) newPasswordInput.value = "";
    if (confirmPasswordInput) confirmPasswordInput.value = "";
}

function persistCookSession(cookId, fullName) {
    localStorage.setItem(STORAGE_KEYS.cookId, cookId || "");
    localStorage.setItem(STORAGE_KEYS.cookName, fullName || "");
    localStorage.setItem(STORAGE_KEYS.userType, "cook");
    localStorage.removeItem(STORAGE_KEYS.adminLoggedIn);
}

function persistAdminSession() {
    localStorage.setItem(STORAGE_KEYS.userType, "admin");
    localStorage.setItem(STORAGE_KEYS.adminLoggedIn, "true");
}

function persistCustomerSession(userId, tableNumber) {
    localStorage.setItem(STORAGE_KEYS.userId, String(userId || ""));
    localStorage.setItem(STORAGE_KEYS.tableNumber, String(tableNumber || ""));
    localStorage.setItem(STORAGE_KEYS.userType, "customer");
}

function redirectToPage(path, delayMs = 0) {
    if (!delayMs) {
        window.location.href = path;
        return;
    }

    setTimeout(() => {
        window.location.href = path;
    }, delayMs);
}

async function postJson(endpoint, payload) {
    const response = await fetch(`${pageState.apiBaseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await parseJsonResponse(response);
    return { response, data };
}

function setTablePickerButtonStyle(button, isSelected) {
    button.classList.toggle("bg-[#efe4d8]", isSelected);
    button.classList.toggle("text-[#7a4e2f]", isSelected);
    button.classList.toggle("ring-4", isSelected);
    button.classList.toggle("ring-[#d7b58f]", isSelected);
    button.classList.toggle("scale-105", isSelected);
    button.classList.toggle("bg-[#7a4e2f]", !isSelected);
    button.classList.toggle("text-[#f3eadf]", !isSelected);
}

function bindTablePickerButtons(tableButtons, applySelection, onSelect) {
    tableButtons.forEach((button) => {
        button.addEventListener("click", () => {
            applySelection(button.dataset.tableSelect || "");
            if (typeof onSelect === "function") {
                onSelect();
            }
        });
    });
}

function initTablePicker(onSelect) {
    const tableInput = getById(UI_IDS.tableNumberInput);
    const tableButtons = document.querySelectorAll(".table-picker-btn[data-table-select]");
    if (!tableInput || !tableButtons.length) return;

    const applySelection = (value) => {
        const selectedTable = normalizeTableNumber(value);
        tableInput.value = selectedTable === null ? "" : String(selectedTable);

        tableButtons.forEach((button) => {
            const buttonValue = String(button.dataset.tableSelect || "");
            const isSelected = buttonValue === String(selectedTable || "");
            setTablePickerButtonStyle(button, isSelected);
        });
    };

    bindTablePickerButtons(tableButtons, applySelection, onSelect);
    applySelection(tableInput.value);
}

// 4. LOGIN/ROLE FUNCTIONS
async function customerLogin() {
    const tableNumber = readValue(UI_IDS.tableNumberInput);
    const normalizedTableNumber = normalizeTableNumber(tableNumber);

    if (normalizedTableNumber === null) {
        showMessage("Please enter a table number from 1 to 10.", "error");
        return;
    }

    try {
        const { response, data } = await postJson(API_ENDPOINTS.customerLogin, {
            table_number: normalizedTableNumber,
            session_id: localStorage.getItem(STORAGE_KEYS.userId) || ""
        });

        if (!response.ok) {
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }

        if (!data.success) {
            showMessage(data.message || "Login failed", "error");
            return;
        }

        showMessage(data.message || "Login successful", "success");
        persistCustomerSession(data.user_id, data.table_number);
        redirectToPage(PAGE_PATHS.menu, 500);
    } catch (error) {
        // Fallback for static/offline usage.
        persistCustomerSession(Date.now(), normalizedTableNumber);
        redirectToPage(PAGE_PATHS.menu);
    }
}

async function cookRegister() {
    showMessage("Cook self-registration is disabled. Please ask an admin to create your Cook ID.", "error");
}

async function cookCheckAccess() {
    const cookId = readValue(UI_IDS.cookIdInput);

    if (!cookId) {
        showMessage("Please enter Cook ID.", "error");
        return;
    }

    try {
        const { response, data } = await postJson(API_ENDPOINTS.cookAccess, {
            cook_id: normalizeCookId(cookId)
        });

        if (!response.ok || !data.success) {
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }

        if (data.password_ready) {
            showMessage("This Cook ID already has a password. Please log in normally.", "success");
            cookResetSetup();
            return;
        }

        setCookSetupPanelVisible(true, data);
        showMessage("Set your password for first-time login.", "success");
    } catch (error) {
        showMessage(`Error: ${error.message}`, "error");
    }
}

async function cookSetupPassword() {
    const cookId = readValue(UI_IDS.cookIdInput);
    const password = String(getById(UI_IDS.cookNewPasswordInput)?.value || "");
    const confirmPassword = String(getById(UI_IDS.cookConfirmPasswordInput)?.value || "");

    if (!cookId || !password || !confirmPassword) {
        showMessage("Please enter Cook ID, new password, and confirm password.", "error");
        return;
    }

    if (password.length < 4) {
        showMessage("Password must be at least 4 characters.", "error");
        return;
    }

    if (password !== confirmPassword) {
        showMessage("Password confirmation does not match.", "error");
        return;
    }

    try {
        const { response, data } = await postJson(API_ENDPOINTS.cookSetupPassword, {
            cook_id: normalizeCookId(cookId),
            password
        });

        if (!response.ok || !data.success) {
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }

        persistCookSession(data.cook_id || normalizeCookId(cookId), data.full_name || "");
        showMessage(data.message || "Password created successfully.", "success");
        redirectToPage(PAGE_PATHS.cook, 800);
    } catch (error) {
        showMessage(`Error: ${error.message}`, "error");
    }
}

async function cookLogin() {
    const cookId = readValue(UI_IDS.cookIdInput);
    const password = String(getById(UI_IDS.cookPasswordInput)?.value || "");

    if (!cookId || !password) {
        showMessage("Please enter Cook ID and password.", "error");
        return;
    }

    try {
        const { response, data } = await postJson(API_ENDPOINTS.cookLogin, {
            cook_id: normalizeCookId(cookId),
            password
        });

        if (!response.ok || !data.success) {
            if (response.status === 403 && data.requires_password_setup) {
                setCookSetupPanelVisible(true, data);
                showMessage(data.message || "Please create your password first.", "error");
                return;
            }
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }

        const resolvedCookId = data.cook_id || normalizeCookId(cookId);
        persistCookSession(resolvedCookId, data.full_name || "");
        showMessage(data.message || "Cook login successful", "success");
        redirectToPage(PAGE_PATHS.cook, 1000);
    } catch (error) {
        showMessage(`Error: ${error.message}`, "error");
    }
}

async function adminLogin() {
    const username = readValue(UI_IDS.adminUsernameInput);
    const password = String(getById(UI_IDS.adminPasswordInput)?.value || "");

    if (!username || !password) {
        showMessage("Please enter username and password.", "error");
        return;
    }

    try {
        const { response, data } = await postJson(API_ENDPOINTS.adminLogin, { username, password });

        if (!response.ok || !data.success) {
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }

        persistAdminSession();
        showMessage(data.message || "Admin login successful", "success");
        redirectToPage(PAGE_PATHS.admin, 1000);
    } catch (error) {
        showMessage(`Error: ${error.message}`, "error");
    }
}

function getRedirectPathFromSession(data, currentPath) {
    if (!data?.logged_in) return "";
    if (data.user_type === "customer" && !currentPath.includes(PAGE_PATHS.menu)) return PAGE_PATHS.menu;
    if (data.user_type === "cook" && !currentPath.includes(PAGE_PATHS.cook)) return PAGE_PATHS.cook;
    if (data.user_type === "admin" && !currentPath.includes(PAGE_PATHS.admin)) return PAGE_PATHS.admin;
    return "";
}

async function checkSessionAndRedirect() {
    try {
        const response = await fetch(`${pageState.apiBaseUrl}${API_ENDPOINTS.session}`);
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await parseJsonResponse(response);
        const currentPath = window.location.pathname;
        const redirectPath = getRedirectPathFromSession(data, currentPath);
        if (redirectPath) redirectToPage(redirectPath);
    } catch (error) {
    }
}

function applyHashRouting() {
    const hashRole = String(window.location.hash || "").replace("#", "").trim().toLowerCase();

    if (hashRole === "customer") {
        showLoginForm("customer");
        return;
    }

    if (hashRole === "cook" || hashRole === "admin") {
        window.location.href = PAGE_PATHS.staff;
        return;
    }

    if (hashRole === "register-cook") {
        window.location.href = `${PAGE_PATHS.staff}#first-time`;
    }
}

// 5. UI FUNCTIONS
function initUiHandlers() {
    bindClick(UI_IDS.customerRoleButton, () => showLoginForm("customer"));
    bindClick(UI_IDS.customerBackButton, hideAllForms);

    bindEnter([UI_IDS.tableNumberInput], customerLogin);
    initTablePicker(() => {
        customerLogin();
    });
}

function shouldCheckSessionOnCurrentPage() {
    const path = window.location.pathname;
    const isRootPath = path === "/";
    const isHtmlPage = path.includes(".html");
    const isDashboardPath = path.includes("dashboard");
    return isRootPath || (isHtmlPage && !isDashboardPath);
}

async function initIndexPage() {
    pageState.apiBaseUrl = await findApiBase();

    initUiHandlers();
    applyHashRouting();

    if (shouldCheckSessionOnCurrentPage()) {
        checkSessionAndRedirect();
    }
}

// Keep compatibility with existing or legacy inline handlers.
window.showLoginForm = showLoginForm;
window.hideAllForms = hideAllForms;
window.showRegisterForm = showRegisterForm;
window.customerLogin = customerLogin;
window.cookRegister = cookRegister;
window.cookCheckAccess = cookCheckAccess;
window.cookSetupPassword = cookSetupPassword;
window.cookResetSetup = cookResetSetup;
window.cookLogin = cookLogin;
window.adminLogin = adminLogin;

// 6. PAGE START
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initIndexPage);
} else {
    initIndexPage();
}
