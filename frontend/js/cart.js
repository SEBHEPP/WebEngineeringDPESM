// Elias
document.addEventListener("DOMContentLoaded", () => {
  renderCartPage();
  setupCheckoutPage();
  renderOrdersPage();
});

function cartTotal(cart) {
  return cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
}

function updateCartSummary(cart) {
  const total = document.getElementById("cartTotal");
  const subtotal = document.getElementById("cartSubtotal");
  const count = document.getElementById("cartCount");
  const checkoutLink = document.getElementById("checkoutLink");
  const totalText = formatPrice(cartTotal(cart));
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (total) total.textContent = totalText;
  if (subtotal) subtotal.textContent = totalText;
  if (count) count.textContent = `${itemCount} Artikel`;
  if (checkoutLink) {
    checkoutLink.classList.toggle("disabled", cart.length === 0);
    checkoutLink.setAttribute("aria-disabled", cart.length === 0 ? "true" : "false");
  }
}

function renderCartPage() {
  const list = document.getElementById("cartItems");
  const total = document.getElementById("cartTotal");
  const subtotal = document.getElementById("cartSubtotal");
  const count = document.getElementById("cartCount");
  if (!list) return;

  const cart = getCart();

  list.innerHTML = cart.length
    ? cart.map((item) => `
      <div class="cart-item">
        <div class="image-placeholder"></div>
        <div>
          <h3>${item.name}</h3>
          <p>Produkt-ID ${item.productId} · Menge ${item.quantity}</p>
          <button class="btn small danger" data-remove-cart="${item.productId}" type="button">Entfernen</button>
        </div>
        <strong>${formatPrice(Number(item.price) * item.quantity)}</strong>
      </div>
    `).join("")
    : "<div class=\"empty-state\">Dein Warenkorb ist leer.</div>";

  list.querySelectorAll("[data-remove-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      saveCart(getCart().filter((item) => item.productId !== Number(button.dataset.removeCart)));
      renderCartPage();
    });
  });

  updateCartSummary(cart);
}

function setupCheckoutPage() {
  const form = document.getElementById("checkoutForm");
  const list = document.getElementById("checkoutItems");
  const total = document.getElementById("checkoutTotal");
  const message = document.getElementById("checkoutMessage");
  if (!form || !list) return;

  const cart = getCart();

  list.innerHTML = cart.length
    ? cart.map((item) => `
      <div class="cart-item">
        <div class="image-placeholder"></div>
        <div><strong>${item.name}</strong><p>Menge ${item.quantity}</p></div>
        <strong>${formatPrice(Number(item.price) * item.quantity)}</strong>
      </div>
    `).join("")
    : "<div class=\"empty-state\">Keine Artikel im Warenkorb.</div>";

  if (total) total.textContent = formatPrice(cartTotal(cart));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const currentCart = getCart();

    if (currentCart.length === 0) {
      setMessage(message, "Dein Warenkorb ist leer.", "error");
      return;
    }

    if (!form.terms.checked) {
      setMessage(message, "Bitte akzeptiere die AGB.", "error");
      return;
    }

    try {
      const data = await apiRequest("/orders/checkout", {
        method: "POST",
        body: JSON.stringify({
          items: currentCart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity
          }))
        })
      });

      saveCart([]);
      setMessage(message, `Bestellung #${data.order.id} wurde erstellt. E-Mail: ${data.confirmationEmail}`, "success");
      window.setTimeout(() => {
        window.location.href = "orders.html";
      }, 900);
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  });
}

async function renderOrdersPage() {
  const body = document.getElementById("ordersBody");
  if (!body) return;

  try {
    const data = await apiRequest("/orders");
    const orders = data.orders || [];

    body.innerHTML = orders.length
      ? orders.map((order) => `
        <tr>
          <td>#${order.id}</td>
          <td>${new Date(order.purchasedAt).toLocaleDateString("de-DE")}</td>
          <td>${order.items?.length || "-"} Artikel</td>
          <td><span class="status green">Bestätigt</span></td>
          <td><span class="status green">Gesendet</span></td>
          <td>${formatPrice(order.totalPrice)}</td>
        </tr>
      `).join("")
      : "<tr><td colspan=\"6\">Noch keine Bestellungen vorhanden.</td></tr>";
  } catch (error) {
    body.innerHTML = `<tr><td colspan="6">${error.message}</td></tr>`;
  }
}
