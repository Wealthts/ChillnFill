let selectedTable = null;
const bookedTables = {};

const tableButtons = document.querySelectorAll(".table-seat");
const bookingModal = document.getElementById("bookingModal");
const confirmModal = document.getElementById("confirmModal");
const tableNum = document.getElementById("tableNum");
const confirmText = document.getElementById("confirmText");
const nameInput = document.getElementById("name");
const timeInput = document.getElementById("time");

const bookingConfirmBtn = document.getElementById("btn-booking-confirm");
const bookingCancelBtn = document.getElementById("btn-booking-cancel");
const confirmYesBtn = document.getElementById("btn-confirm-yes");
const confirmNoBtn = document.getElementById("btn-confirm-no");

function openPopup(tableNumber) {
  if (bookedTables[tableNumber]) {
    alert("This table is already booked.");
    return;
  }

  selectedTable = tableNumber;
  if (tableNum) {
    tableNum.textContent = tableNumber;
  }
  if (bookingModal) {
    bookingModal.classList.remove("hidden");
    bookingModal.classList.add("flex");
  }
}

function closeBooking() {
  if (bookingModal) {
    bookingModal.classList.add("hidden");
    bookingModal.classList.remove("flex");
  }
}

function submitBooking() {
  const name = nameInput ? nameInput.value.trim() : "";
  const time = timeInput ? timeInput.value : "";

  if (name === "" || time === "") {
    alert("Please fill in all fields.");
    return;
  }

  if (confirmText) {
    confirmText.textContent = `Confirm reservation for Table ${selectedTable}\nName: ${name}\nTime: ${time}`;
  }

  closeBooking();
  if (confirmModal) {
    confirmModal.classList.remove("hidden");
    confirmModal.classList.add("flex");
  }
}

function closeConfirm() {
  if (confirmModal) {
    confirmModal.classList.add("hidden");
    confirmModal.classList.remove("flex");
  }
}

function finalConfirm() {
  bookedTables[selectedTable] = true;

  const tables = document.querySelectorAll(".table-seat");
  if (tables[selectedTable - 1]) {
    tables[selectedTable - 1].classList.remove("bg-[#7a4e2f]");
    tables[selectedTable - 1].classList.add("bg-[#b5655a]", "cursor-not-allowed", "opacity-80");
  }

  alert("Reservation confirmed!");
  closeConfirm();

  if (nameInput) nameInput.value = "";
  if (timeInput) timeInput.value = "";
}

tableButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tableNumber = Number(button.dataset.table);
    openPopup(tableNumber);
  });
});

if (bookingConfirmBtn) bookingConfirmBtn.addEventListener("click", submitBooking);
if (bookingCancelBtn) bookingCancelBtn.addEventListener("click", closeBooking);
if (confirmYesBtn) confirmYesBtn.addEventListener("click", finalConfirm);
if (confirmNoBtn) confirmNoBtn.addEventListener("click", closeConfirm);

[nameInput, timeInput].forEach((el) => {
  if (!el) return;
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    submitBooking();
  });
});

window.addEventListener("click", (event) => {
  if (event.target === bookingModal) {
    closeBooking();
  }
  if (event.target === confirmModal) {
    closeConfirm();
  }
});
