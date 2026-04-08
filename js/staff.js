/*
 * Staff Login Script
 * 1. CONFIG + STATE
 * 2. HELPER FUNCTIONS
 * 3. API FUNCTIONS
 * 4. STAFF/COOK FUNCTIONS
 * 5. EVENT BINDINGS
 * 6. PAGE START
 */

const STORAGE_KEYS = Object.freeze({
    userType: "user_type",
    adminLoggedIn: "admin_logged_in",
    cookId: "cook_id",
    cookName: "cook_name"
});

const PAGE_PATHS = Object.freeze({
    home: "index.html",
    staff: "staff.html",
    cook: "cook.html",
    admin: "admin.html"
});

const API_ENDPOINTS = Object.freeze({
    health: "health",
    staffLogin: "staff/login",
    cookAccess: "cook/access",
    cookSetupPassword: "cook/setup-password"
});

const UI_IDS = Object.freeze({
    messageContainer: "message-container",
    staffLoginPanel: "staff-login-panel",
    cookSetupPanel: "cook-setup-panel",
    cookSetupTitle: "cook-setup-title",
    cookSetupSubtitle: "cook-setup-subtitle",
    staffIdInput: "staff-id",
    staffPasswordInput: "staff-password",
    cookNewPasswordInput: "cook-new-password",
    cookConfirmPasswordInput: "cook-confirm-password",
    staffLoginButton: "btn-staff-login",
    firstTimeButton: "btn-first-time",
    cookSetupSaveButton: "btn-cook-setup-password",
    cookSetupCancelButton: "btn-cook-setup-cancel"
});

const state = {
    apiBase: ""
};

function getById(id) {
    return document.getElementById(id);
}

function readValue(id) {
    return String(getById(id)?.value || "").trim();
}

function normalizeBase(path) {
    if (!path) return "";
    return path.endsWith("/") ? path : `${path}/`;
}

function resolveApiBaseFromMeta() {
    const meta = document.querySelector('meta[name="api-base"]');
    const raw = String(meta?.content || "").trim();
    if (!raw) return "";

    if (raw.startsWith("http://") || raw.startsWith("https://")) {
        return normalizeBase(raw);
    }

    return normalizeBase(window.location.origin + raw);
}

async function findApiBase() {
    const candidates = [
        resolveApiBaseFromMeta(),
        normalizeBase(window.location.origin + "/api/"),
        "http://localhost:3000/api/",
        "http://127.0.0.1:3000/api/"
    ].filter(Boolean);

    const tested = new Set();

    for (const base of candidates) {
        const normalizedBase = normalizeBase(base);
        if (tested.has(normalizedBase)) continue;
        tested.add(normalizedBase);

        try {
            const response = await fetch(`${normalizedBase}${API_ENDPOINTS.health}`, { method: "GET" });
            const contentType = String(response.headers.get("content-type") || "");
            if (response.ok && contentType.includes("application/json")) {
                return normalizedBase;
            }
        } catch (error) {
        }
    }

    return normalizeBase(window.location.origin + "/api/");
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
    }, 3500);
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

function setCookSetupPanelVisible(isVisible, cook = null) {
    const loginPanel = getById(UI_IDS.staffLoginPanel);
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

function resetCookSetupPanel() {
    setCookSetupPanelVisible(false);

    const newPasswordInput = getById(UI_IDS.cookNewPasswordInput);
    const confirmPasswordInput = getById(UI_IDS.cookConfirmPasswordInput);

    if (newPasswordInput) newPasswordInput.value = "";
    if (confirmPasswordInput) confirmPasswordInput.value = "";
}

function persistAdminSession() {
    localStorage.setItem(STORAGE_KEYS.userType, "admin");
    localStorage.setItem(STORAGE_KEYS.adminLoggedIn, "true");
    localStorage.removeItem(STORAGE_KEYS.cookId);
    localStorage.removeItem(STORAGE_KEYS.cookName);
}

function persistCookSession(cookId, fullName) {
    localStorage.setItem(STORAGE_KEYS.userType, "cook");
    localStorage.setItem(STORAGE_KEYS.cookId, cookId || "");
    localStorage.setItem(STORAGE_KEYS.cookName, fullName || "");
    localStorage.removeItem(STORAGE_KEYS.adminLoggedIn);
}

async function postJson(endpoint, payload) {
    const response = await fetch(`${state.apiBase}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await parseJsonResponse(response);
    return { response, data };
}

function redirectToPage(path, delayMs = 400) {
    window.setTimeout(() => {
        window.location.href = path;
    }, delayMs);
}

async function staffLogin() {
    const username = readValue(UI_IDS.staffIdInput);
    const password = String(getById(UI_IDS.staffPasswordInput)?.value || "");

    if (!username || !password) {
        showMessage("Please enter ID and password.", "error");
        return;
    }

    try {
        const { response, data } = await postJson(API_ENDPOINTS.staffLogin, { username, password });

        if (!response.ok || !data.success) {
            if (response.status === 403 && data.requires_password_setup) {
                setCookSetupPanelVisible(true, data);
                showMessage(data.message || "This cook must set password first.", "error");
                return;
            }
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }

        const role = String(data.role || data.user_type || "").trim().toLowerCase();

        if (role === "admin") {
            persistAdminSession();
            showMessage(data.message || "Admin login successful", "success");
            redirectToPage(PAGE_PATHS.admin, 400);
            return;
        }

        if (role === "cook") {
            const cookId = data.cook_id || data.user_id || username;
            persistCookSession(cookId, data.full_name || "");
            showMessage(data.message || "Cook login successful", "success");
            redirectToPage(PAGE_PATHS.cook, 400);
            return;
        }

        showMessage("Role not recognized.", "error");
    } catch (error) {
        showMessage(error.message || "Login failed", "error");
    }
}

async function cookCheckAccess() {
    const cookId = readValue(UI_IDS.staffIdInput);

    if (!cookId) {
        showMessage("Please enter Cook ID first.", "error");
        return;
    }

    try {
        const { response, data } = await postJson(API_ENDPOINTS.cookAccess, { cook_id: cookId });
        if (!response.ok || !data.success) {
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }

        if (data.password_ready) {
            showMessage("This Cook ID already has a password. Use normal login.", "success");
            resetCookSetupPanel();
            return;
        }

        setCookSetupPanelVisible(true, data);
        showMessage("First-time setup: create your password.", "success");
    } catch (error) {
        showMessage(error.message || "Unable to verify Cook ID.", "error");
    }
}

async function cookSetupPassword() {
    const cookId = readValue(UI_IDS.staffIdInput);
    const password = String(getById(UI_IDS.cookNewPasswordInput)?.value || "");
    const confirmPassword = String(getById(UI_IDS.cookConfirmPasswordInput)?.value || "");

    if (!cookId || !password || !confirmPassword) {
        showMessage("Please enter Cook ID and both password fields.", "error");
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
            cook_id: cookId,
            password
        });

        if (!response.ok || !data.success) {
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }

        persistCookSession(data.cook_id || cookId, data.full_name || "");
        showMessage(data.message || "Password created successfully", "success");
        redirectToPage(PAGE_PATHS.cook, 500);
    } catch (error) {
        showMessage(error.message || "Failed to set password", "error");
    }
}

function initFromHash() {
    const hashValue = String(window.location.hash || "").replace("#", "").trim().toLowerCase();
    if (hashValue === "first-time" || hashValue === "register-cook") {
        showMessage("Enter Cook ID, then click First Time Cook.", "success");
    }
}

function bindUiEvents() {
    getById(UI_IDS.staffLoginButton)?.addEventListener("click", staffLogin);
    getById(UI_IDS.firstTimeButton)?.addEventListener("click", cookCheckAccess);
    getById(UI_IDS.cookSetupSaveButton)?.addEventListener("click", cookSetupPassword);
    getById(UI_IDS.cookSetupCancelButton)?.addEventListener("click", resetCookSetupPanel);

    bindEnter([UI_IDS.staffIdInput, UI_IDS.staffPasswordInput], staffLogin);
    bindEnter([UI_IDS.cookNewPasswordInput, UI_IDS.cookConfirmPasswordInput], cookSetupPassword);
}

function ensureLocalhostUsesAppPort() {
    const isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!isLocalHost) return false;
    if (!window.location.port || window.location.port === "3000") return false;

    const targetUrl = `${window.location.protocol}//${window.location.hostname}:3000/${PAGE_PATHS.staff}${window.location.hash || ""}`;
    window.location.replace(targetUrl);
    return true;
}

async function initStaffPage() {
    if (ensureLocalhostUsesAppPort()) return;

    state.apiBase = await findApiBase();
    bindUiEvents();
    initFromHash();
}

// 6. PAGE START
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStaffPage);
} else {
    initStaffPage();
}
