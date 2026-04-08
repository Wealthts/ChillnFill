/*
 * Table Status Script
 * Displays live table statuses without reservation workflow.
 */

const API_ENDPOINTS = Object.freeze({
    tables: "/api/tables"
});

const REFRESH_INTERVAL_MS = 10000;

const state = {
    tablesByNumber: {}
};

function normalizeStatus(status, fallback = "available") {
    const normalized = String(status || "").trim().toLowerCase();
    return normalized || fallback;
}

function getStatusLabel(status) {
    switch (normalizeStatus(status)) {
        case "occupied":
            return "Occupied";
        case "maintenance":
            return "Maintenance";
        case "inactive":
            return "Inactive";
        default:
            return "Available";
    }
}

function isUnavailableStatus(status) {
    return ["occupied", "maintenance", "inactive"].includes(normalizeStatus(status));
}

function getStatusClasses(status) {
    switch (normalizeStatus(status)) {
        case "occupied":
            return "bg-[#d79b49] text-[#fff9ef] shadow-[0_8px_18px_rgba(152,101,37,0.22)]";
        case "maintenance":
            return "bg-[#7b8794] text-white shadow-[0_8px_18px_rgba(91,103,112,0.22)]";
        case "inactive":
            return "bg-[#d8d1c7] text-[#7a6a5a] shadow-none";
        default:
            return "bg-[#7a4e2f] text-[#f3eadf] shadow-[0_8px_18px_rgba(94,59,36,0.2)] hover:bg-[#5f4028]";
    }
}

function getTableRecord(tableNumber) {
    return state.tablesByNumber[String(tableNumber)] || {
        tableNumber,
        status: "available"
    };
}

function renderTableStatuses() {
    const tableButtons = document.querySelectorAll(".table-seat");
    tableButtons.forEach((button) => {
        const tableNumber = Number(button.dataset.table);
        const table = getTableRecord(tableNumber);
        const status = normalizeStatus(table.status);
        const unavailable = isUnavailableStatus(status);

        button.className = `table-seat flex h-[84px] w-[84px] cursor-pointer flex-col items-center justify-center rounded-full text-[1.1rem] font-bold tracking-[0.5px] transition ${getStatusClasses(status)}`;
        button.innerHTML = `
            <span class="leading-none">${tableNumber}</span>
            <span class="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em]">${getStatusLabel(status)}</span>
        `;
        button.setAttribute("title", `Table ${tableNumber}: ${getStatusLabel(status)}`);
        button.setAttribute("aria-disabled", unavailable ? "true" : "false");

        if (unavailable) {
            button.classList.add("cursor-not-allowed", "opacity-85");
            button.classList.remove("hover:bg-[#5f4028]");
        }
    });
}

async function loadTables() {
    try {
        const response = await fetch(API_ENDPOINTS.tables, { credentials: "same-origin" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) {
            throw new Error(result.message || "Unable to load tables");
        }

        const tables = Array.isArray(result.tables) ? result.tables : [];
        state.tablesByNumber = {};
        tables.forEach((table) => {
            const tableNumber = String(table.tableNumber || table.table_number || "");
            if (!tableNumber) return;
            state.tablesByNumber[tableNumber] = table;
        });

        renderTableStatuses();
    } catch (error) {
        console.warn("loadTables failed:", error);
    }
}

function bindTableButtons() {
    const tableButtons = document.querySelectorAll(".table-seat");
    tableButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const tableNumber = Number(button.dataset.table);
            if (!Number.isInteger(tableNumber) || tableNumber < 1) return;

            const table = getTableRecord(tableNumber);
            if (isUnavailableStatus(table.status)) {
                window.alert(`Table ${tableNumber} is currently ${getStatusLabel(table.status).toLowerCase()}.`);
                return;
            }

            localStorage.setItem("table_number", String(tableNumber));
            window.location.href = "customer.html";
        });
    });
}

function initTablePage() {
    bindTableButtons();
    loadTables();
    window.setInterval(loadTables, REFRESH_INTERVAL_MS);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTablePage);
} else {
    initTablePage();
}
