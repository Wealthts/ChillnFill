/*
 * Table Reservation Script
 * Uses the backend table-status APIs instead of temporary in-memory state.
 */

const API_ENDPOINTS = Object.freeze({
    tables: "/api/tables"
});

const UI_IDS = Object.freeze({
    bookingModal: "bookingModal",
    confirmModal: "confirmModal",
    tableNumberText: "tableNum",
    confirmText: "confirmText",
    nameInput: "name",
    timeInput: "time",
    bookingConfirmButton: "btn-booking-confirm",
    bookingCancelButton: "btn-booking-cancel",
    confirmYesButton: "btn-confirm-yes",
    confirmNoButton: "btn-confirm-no"
});

const REFRESH_INTERVAL_MS = 10000;

const state = {
    selectedTable: null,
    isSubmitting: false,
    tablesByNumber: {}
};

function getById(id) {
    return document.getElementById(id);
}

function getElements() {
    return {
        tableButtons: document.querySelectorAll(".table-seat"),
        bookingModal: getById(UI_IDS.bookingModal),
        confirmModal: getById(UI_IDS.confirmModal),
        tableNumberText: getById(UI_IDS.tableNumberText),
        confirmText: getById(UI_IDS.confirmText),
        nameInput: getById(UI_IDS.nameInput),
        timeInput: getById(UI_IDS.timeInput),
        bookingConfirmButton: getById(UI_IDS.bookingConfirmButton),
        bookingCancelButton: getById(UI_IDS.bookingCancelButton),
        confirmYesButton: getById(UI_IDS.confirmYesButton),
        confirmNoButton: getById(UI_IDS.confirmNoButton)
    };
}

function normalizeStatus(status, fallback = "available") {
    const normalized = String(status || "").trim().toLowerCase();
    return normalized || fallback;
}

function getTableRecord(tableNumber) {
    return state.tablesByNumber[String(tableNumber)] || {
        tableNumber,
        status: "available",
        reservationName: "",
        reservationTime: ""
    };
}

function getStatusLabel(status) {
    switch (normalizeStatus(status)) {
        case "reserved":
            return "Reserved";
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
    return ["reserved", "occupied", "maintenance"].includes(normalizeStatus(status));
}

function getStatusClasses(status) {
    switch (normalizeStatus(status)) {
        case "reserved":
            return "bg-[#b5655a] text-[#fff7f2] shadow-[0_8px_18px_rgba(138,84,78,0.22)]";
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

function showModal(modal) {
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function hideModal(modal) {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function closeBookingModal() {
    hideModal(getElements().bookingModal);
}

function closeConfirmModal() {
    hideModal(getElements().confirmModal);
}

function setButtonBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    button.classList.toggle("opacity-70", busy);
    button.classList.toggle("cursor-not-allowed", busy);
}

function renderTableStatuses() {
    const { tableButtons } = getElements();

    tableButtons.forEach((button) => {
        const tableNumber = Number(button.dataset.table);
        const table = getTableRecord(tableNumber);
        const status = normalizeStatus(table.status);
        const unavailable = isUnavailableStatus(status);
        const reservationText = table.reservationName || table.reservationTime
            ? ` - ${[table.reservationName, table.reservationTime].filter(Boolean).join(" @ ")}`
            : "";

        button.className = `table-seat flex h-[84px] w-[84px] cursor-pointer flex-col items-center justify-center rounded-full text-[1.1rem] font-bold tracking-[0.5px] transition ${getStatusClasses(status)}`;
        button.innerHTML = `
            <span class="leading-none">${tableNumber}</span>
            <span class="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em]">${getStatusLabel(status)}</span>
        `;
        button.setAttribute("title", `Table ${tableNumber}: ${getStatusLabel(status)}${reservationText}`);
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

function openBookingModal(tableNumber) {
    const table = getTableRecord(tableNumber);
    if (isUnavailableStatus(table.status)) {
        window.alert(`Table ${tableNumber} is currently ${getStatusLabel(table.status).toLowerCase()}.`);
        return;
    }

    state.selectedTable = tableNumber;

    const { bookingModal, tableNumberText } = getElements();
    if (tableNumberText) {
        tableNumberText.textContent = String(tableNumber);
    }

    showModal(bookingModal);
}

function submitBooking() {
    const { nameInput, timeInput, confirmText, confirmModal } = getElements();
    const name = String(nameInput?.value || "").trim();
    const time = String(timeInput?.value || "").trim();

    if (!state.selectedTable) return;

    if (!name || !time) {
        window.alert("Please fill in all fields.");
        return;
    }

    if (confirmText) {
        confirmText.textContent = `Confirm reservation for Table ${state.selectedTable}\nName: ${name}\nTime: ${time}`;
    }

    closeBookingModal();
    showModal(confirmModal);
}

function clearBookingForm() {
    const { nameInput, timeInput } = getElements();
    if (nameInput) nameInput.value = "";
    if (timeInput) timeInput.value = "";
}

async function confirmBooking() {
    if (!state.selectedTable || state.isSubmitting) return;

    const { nameInput, timeInput, confirmYesButton, confirmNoButton } = getElements();
    const reservationName = String(nameInput?.value || "").trim();
    const reservationTime = String(timeInput?.value || "").trim();

    if (!reservationName || !reservationTime) {
        window.alert("Please fill in all fields.");
        closeConfirmModal();
        openBookingModal(state.selectedTable);
        return;
    }

    state.isSubmitting = true;
    setButtonBusy(confirmYesButton, true);
    setButtonBusy(confirmNoButton, true);

    try {
        const response = await fetch(`${API_ENDPOINTS.tables}/${encodeURIComponent(state.selectedTable)}/reserve`, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: reservationName,
                time: reservationTime
            })
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) {
            throw new Error(result.message || "Unable to reserve table");
        }

        const updatedTable = result.table || {};
        const tableNumber = String(updatedTable.tableNumber || updatedTable.table_number || state.selectedTable);
        state.tablesByNumber[tableNumber] = updatedTable;
        renderTableStatuses();

        window.alert(result.message || "Reservation confirmed!");
        closeConfirmModal();
        clearBookingForm();
        state.selectedTable = null;
    } catch (error) {
        window.alert(error.message || "Unable to reserve table");
        await loadTables();
    } finally {
        state.isSubmitting = false;
        setButtonBusy(confirmYesButton, false);
        setButtonBusy(confirmNoButton, false);
    }
}

function bindTableButtons() {
    const { tableButtons } = getElements();

    tableButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const tableNumber = Number(button.dataset.table);
            if (!Number.isInteger(tableNumber) || tableNumber < 1) return;
            openBookingModal(tableNumber);
        });
    });
}

function bindActionButtons() {
    const {
        bookingConfirmButton,
        bookingCancelButton,
        confirmYesButton,
        confirmNoButton
    } = getElements();

    bookingConfirmButton?.addEventListener("click", submitBooking);
    bookingCancelButton?.addEventListener("click", closeBookingModal);
    confirmYesButton?.addEventListener("click", confirmBooking);
    confirmNoButton?.addEventListener("click", closeConfirmModal);
}

function bindFormEnterSubmit() {
    const { nameInput, timeInput } = getElements();

    [nameInput, timeInput].forEach((input) => {
        if (!input) return;

        input.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            submitBooking();
        });
    });
}

function bindOutsideClickClose() {
    const { bookingModal, confirmModal } = getElements();

    window.addEventListener("click", (event) => {
        if (event.target === bookingModal) {
            closeBookingModal();
        }

        if (event.target === confirmModal) {
            closeConfirmModal();
        }
    });
}

function initTablePage() {
    bindTableButtons();
    bindActionButtons();
    bindFormEnterSubmit();
    bindOutsideClickClose();
    loadTables();
    window.setInterval(loadTables, REFRESH_INTERVAL_MS);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTablePage);
} else {
    initTablePage();
}
