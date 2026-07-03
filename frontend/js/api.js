// Elias
const API_BASE = "/api";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.error || data.message || `API Fehler ${response.status}`);
  }

  return data;
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR"
  });
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function setMessage(element, message, type = "") {
  if (!element) return;

  element.textContent = message;
  element.className = `session-hint${type ? ` ${type}` : ""}`;
}

function getCart() {
  return JSON.parse(localStorage.getItem("gentlemanCart") || "[]");
}

function saveCart(cart) {
  localStorage.setItem("gentlemanCart", JSON.stringify(cart));
}

function addToCart(product, quantity = 1) {
  const cart = getCart();
  const existingItem = cart.find((item) => item.productId === product.id);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity
    });
  }

  saveCart(cart);
}

async function getSession() {
  try {
    return await apiRequest("/auth/session");
  } catch (error) {
    return {
      authenticated: false,
      user: null
    };
  }
}
