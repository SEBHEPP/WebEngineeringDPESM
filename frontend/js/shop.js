const USER_ID = 1;

async function apiRequest(method, path, body) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" }
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`/api${path}`, options);
  const data = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    throw new Error(data?.error || `API error ${response.status}`);
  }

  return data;
}

async function apiGet(path) {
  return apiRequest("GET", path);
}

async function apiPost(path, body) {
  return apiRequest("POST", path, body);
}

async function apiDelete(path) {
  return apiRequest("DELETE", path);
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function formatPrice(value) {
  return typeof value === "number" ? `${value.toFixed(2).replace(".", ",")} €` : "0,00 €";
}

function createProductCard(product) {
  return `
    <article class="product-card" id="product-${product.id}">
      <div class="image-placeholder"></div>
      <div class="card-body">
        <a href="product-detail.html?id=${product.id}"><h3>${product.name}</h3></a>
        <p>Produkt-ID ${product.id} · ${product.description || "Keine Beschreibung"}</p>
        <span class="status ${product.available_quantity > 0 ? "green" : "red"}">${product.available_quantity > 0 ? "Auf Lager" : "Nicht verfügbar"}</span>
        <div class="price">${formatPrice(Number(product.price))}</div>
        <button class="btn add-to-cart-button" data-product-id="${product.id}" ${product.available_quantity <= 0 ? "disabled" : ""}>
          In den Warenkorb
        </button>
      </div>
    </article>
  `;
}

async function addToCart(productId, quantity = 1) {
  try {
    await apiPost("/inv/cart", { userId: USER_ID, productId, quantity });
    alert("Produkt wurde zum Warenkorb hinzugefügt.");
  } catch (error) {
    alert(`Fehler beim Hinzufügen zum Warenkorb: ${error.message}`);
  }
}

async function renderProductsPage() {
  const productGrid = document.querySelector(".products-grid");
  if (!productGrid) return;

  const searchInput = document.querySelector("input[name='q']");
  const productIdInput = document.querySelector("input[name='productId']");
  const query = getQueryParam("q") || searchInput?.value?.trim();
  const productId = getQueryParam("productId") || productIdInput?.value?.trim();

  let products = [];
  try {
    if (productId) {
      const product = await apiGet(`/inv/products/${productId}`);
      products = [product];
    } else {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      const path = `/inv/products${params.toString() ? `?${params.toString()}` : ""}`;
      products = await apiGet(path);
    }
  } catch (error) {
    productGrid.innerHTML = `<div class="interface-note">${error.message}</div>`;
    return;
  }

  productGrid.innerHTML = products.length
    ? products.map(createProductCard).join("")
    : `<div class="interface-note">Keine Produkte gefunden.</div>`;

  productGrid.querySelectorAll(".add-to-cart-button").forEach((button) => {
    button.addEventListener("click", () => {
      addToCart(Number(button.dataset.productId));
    });
  });

  if (searchInput) {
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        renderProductsPage();
      }
    });
  }

  if (productIdInput) {
    productIdInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        renderProductsPage();
      }
    });
  }
}

async function renderProductDetailPage() {
  const detailSection = document.getElementById("productDetailPage");
  if (!detailSection) return;

  const productId = getQueryParam("id");
  if (!productId) {
    detailSection.textContent = "Produkt-ID fehlt";
    return;
  }

  try {
    const product = await apiGet(`/inv/products/${productId}`);
    document.getElementById("product-title").textContent = product.name;
    document.getElementById("product-description").textContent = product.description || "Keine Beschreibung vorhanden.";
    document.getElementById("product-price").textContent = formatPrice(Number(product.price));
    document.getElementById("product-stock").textContent = `${product.available_quantity} Stück verfügbar`;
    document.getElementById("product-stock").className = `status ${product.available_quantity > 0 ? "green" : "red"}`;
    document.getElementById("product-note").textContent = `Schnittstelle Inventarsystem: Produkt-ID ${product.id}, verfügbarer Bestand ${product.available_quantity}.`;
    document.getElementById("product-sku").textContent = product.id;
    const cartButton = document.getElementById("addToCartBtn");
    cartButton.disabled = product.available_quantity <= 0;
    cartButton.textContent = product.available_quantity > 0 ? "In den Warenkorb" : "Nicht verfügbar";
    cartButton.addEventListener("click", async () => {
      await addToCart(product.id);
    });
  } catch (error) {
    detailSection.textContent = error.message;
  }
}

async function renderCartPage() {
  const cartItemsContainer = document.getElementById("cartItems");
  if (!cartItemsContainer) return;

  try {
    const cartItems = await apiGet(`/inv/cart?userId=${USER_ID}`);
    const summarySubtotal = document.getElementById("cartSubtotal");
    const summaryTotal = document.getElementById("cartTotal");
    const message = document.getElementById("cartMessage");
    const checkoutButton = document.getElementById("checkoutBtn");

    if (!cartItems.length) {
      cartItemsContainer.innerHTML = `<div class="interface-note">Ihr Warenkorb ist leer.</div>`;
      if (summarySubtotal) summarySubtotal.textContent = "0,00 €";
      if (summaryTotal) summaryTotal.textContent = "0,00 €";
      if (checkoutButton) checkoutButton.disabled = true;
      return;
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartItemsContainer.innerHTML = cartItems
      .map(
        (item) => `
          <div class="cart-item" data-cart-item-id="${item.cart_item_id}">
            <div class="image-placeholder"></div>
            <div>
              <h3>${item.name}</h3>
              <p>Menge: ${item.quantity} · ${item.available_quantity > 0 ? "Verfügbar" : "Nicht verfügbar"}</p>
            </div>
            <div class="button-row" style="gap:8px;align-items:center;">
              <strong>${formatPrice(Number(item.price * item.quantity))}</strong>
              <button class="btn small danger remove-cart-item-button" data-id="${item.cart_item_id}">Entfernen</button>
            </div>
          </div>
        `
      )
      .join("");

    if (summarySubtotal) summarySubtotal.textContent = formatPrice(subtotal);
    if (summaryTotal) summaryTotal.textContent = formatPrice(subtotal);
    if (checkoutButton) {
      checkoutButton.disabled = false;
      checkoutButton.addEventListener("click", () => {
        window.location.href = "checkout.html";
      });
    }

    cartItemsContainer.querySelectorAll(".remove-cart-item-button").forEach((button) => {
      button.addEventListener("click", async () => {
        const itemId = button.dataset.id;
        await apiDelete(`/inv/cart/${itemId}`);
        renderCartPage();
      });
    });

    if (message) message.textContent = "";
  } catch (error) {
    cartItemsContainer.innerHTML = `<div class="interface-note">${error.message}</div>`;
  }
}

async function renderCheckoutPage() {
  const checkoutItems = document.getElementById("checkoutItems");
  if (!checkoutItems) return;

  try {
    const cartItems = await apiGet(`/inv/cart?userId=${USER_ID}`);
    const count = document.getElementById("checkoutCount");
    const total = document.getElementById("checkoutTotal");
    const purchaseButton = document.getElementById("purchaseBtn");
    const message = document.getElementById("checkoutMessage");

    if (!cartItems.length) {
      checkoutItems.innerHTML = `<div class="interface-note">Ihr Warenkorb ist leer. Bitte legen Sie Produkte in den Warenkorb.</div>`;
      if (count) count.textContent = "0 Artikel";
      if (total) total.textContent = "0,00 €";
      if (purchaseButton) purchaseButton.disabled = true;
      return;
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    checkoutItems.innerHTML = cartItems
      .map(
        (item) => `
          <div class="cart-item">
            <div class="image-placeholder"></div>
            <div>
              <strong>${item.name}</strong>
              <p>Menge: ${item.quantity}</p>
            </div>
            <strong>${formatPrice(Number(item.price * item.quantity))}</strong>
          </div>
        `
      )
      .join("");

    if (count) count.textContent = `${cartItems.length} Artikel`;
    if (total) total.textContent = formatPrice(subtotal);
    const subtotalElement = document.getElementById("checkoutSubtotal");
    if (subtotalElement) subtotalElement.textContent = formatPrice(subtotal);
    if (purchaseButton) purchaseButton.disabled = false;

    purchaseButton.addEventListener("click", async () => {
      try {
        await apiPost("/inv/checkout", { userId: USER_ID });
        window.location.href = "orders.html";
      } catch (error) {
        if (message) message.textContent = `Fehler beim Kauf: ${error.message}`;
      }
    });

    if (message) message.textContent = "";
  } catch (error) {
    checkoutItems.innerHTML = `<div class="interface-note">${error.message}</div>`;
  }
}

async function renderOrdersPage() {
  const ordersBody = document.getElementById("ordersBody");
  if (!ordersBody) return;

  try {
    const orders = await apiGet(`/inv/orders?userId=${USER_ID}`);

    if (!orders.length) {
      ordersBody.innerHTML = `<tr><td colspan="6">Keine Bestellungen gefunden.</td></tr>`;
      return;
    }

    ordersBody.innerHTML = orders
      .map(
        (order) => `
          <tr>
            <td>#${order.id}</td>
            <td>${new Date(order.purchased_at).toLocaleDateString("de-DE")}</td>
            <td>${order.items.map((item) => item.name).join(", ")}</td>
            <td><span class="status green">Bestätigt</span></td>
            <td><span class="status green">Gesendet</span></td>
            <td>${formatPrice(order.total_price)}</td>
          </tr>
        `
      )
      .join("");
  } catch (error) {
    ordersBody.innerHTML = `<tr><td colspan="6">${error.message}</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderProductsPage();
  renderProductDetailPage();
  renderCartPage();
  renderCheckoutPage();
  renderOrdersPage();
});
