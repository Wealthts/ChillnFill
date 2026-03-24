const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const closeModalBackdrop = document.getElementById("closeModalBackdrop");
const menuModal = document.getElementById("menuModal");
const menuCards = document.querySelectorAll(".menu-card");
const orderList = document.getElementById("orderList");
const totalPriceEl = document.getElementById("totalPrice");

let cart = [];

// เปิด modal
if (openModalBtn && menuModal) {
  openModalBtn.addEventListener("click", () => {
    menuModal.classList.add("show");
  });
}

// ปิด modal
if (closeModalBtn && menuModal) {
  closeModalBtn.addEventListener("click", () => {
    menuModal.classList.remove("show");
  });
}

if (closeModalBackdrop && menuModal) {
  closeModalBackdrop.addEventListener("click", () => {
    menuModal.classList.remove("show");
  });
}

// ปิดด้วยปุ่ม ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && menuModal) {
    menuModal.classList.remove("show");
  }
});

// เพิ่มสินค้า
menuCards.forEach((card) => {
  card.addEventListener("click", () => {
    const name = card.dataset.name;
    const price = Number(card.dataset.price);
    const image = card.querySelector("img").getAttribute("src");

    const found = cart.find((item) => item.name === name);

    if (found) {
      found.qty += 1;
    } else {
      cart.push({ name, price, qty: 1, image });
    }

    renderCart();
    if (menuModal) {
      menuModal.classList.remove("show");
    }
  });
});

function renderCart() {
  if (cart.length === 0) {
    orderList.classList.add("empty");
    orderList.innerHTML = `
      <div class="empty-state">
        <p>No Orders yet</p>
        <span>Click the Buton to Order</span>
      </div>
    `;
    updateTotal();
    return;
  }

  orderList.classList.remove("empty");
  orderList.innerHTML = cart
    .map(
      (item, index) => `
    <div class="order-card">
      <div class="order-card-left">
        <img class="order-thumb" src="${item.image}" alt="${item.name}">
        <div>
          <div class="order-name">${item.name}</div>
          <div class="order-price">${item.price} Bath / ชิ้น</div>
        </div>
      </div>

      <div class="order-card-right">
        <button class="qty-btn" data-action="qty" data-delta="-1" data-index="${index}">−</button>
        <div class="qty-box">${item.qty}</div>
        <button class="qty-btn" data-action="qty" data-delta="1" data-index="${index}">+</button>
        <button class="remove-btn" data-action="remove" data-index="${index}">🗑</button>
      </div>
    </div>
  `,
    )
    .join("");

  updateTotal();
}

function changeQty(index, delta) {
  cart[index].qty += delta;

  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }

  renderCart();
}

function removeItem(index) {
  cart.splice(index, 1);
  renderCart();
}

function updateTotal() {
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  if (totalPriceEl) {
    totalPriceEl.textContent = `${total} Bath`;
  }
}

if (orderList) {
  orderList.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;

    const index = Number(target.dataset.index);
    if (Number.isNaN(index)) return;

    if (target.dataset.action === "qty") {
      const delta = Number(target.dataset.delta);
      changeQty(index, delta);
      return;
    }

    if (target.dataset.action === "remove") {
      removeItem(index);
    }
  });
}

renderCart();
