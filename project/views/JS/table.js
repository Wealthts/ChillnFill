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
    bookingModal.style.display = "block";
  }
}

function closeBooking() {
  if (bookingModal) {
    bookingModal.style.display = "none";
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
    confirmModal.style.display = "block";
  }
}

function closeConfirm() {
  if (confirmModal) {
    confirmModal.style.display = "none";
  }
}

function finalConfirm() {
  bookedTables[selectedTable] = true;

  const tables = document.querySelectorAll(".table-seat");
  if (tables[selectedTable - 1]) {
    tables[selectedTable - 1].classList.add("booked");
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

window.addEventListener("click", (event) => {
  if (event.target === bookingModal) {
    closeBooking();
  }
  if (event.target === confirmModal) {
    closeConfirm();
  }
});
