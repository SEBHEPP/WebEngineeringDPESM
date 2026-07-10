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
      imageUrl: product.imageUrl || "",
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

// Schuetzt Admin-Seiten: leitet nicht eingeloggte oder nicht-Admin-Nutzer zum Login um.
// Gibt bei Erfolg den eingeloggten Admin-User zurueck, sonst null.
async function requireAdmin() {
  const session = await getSession();

  if (!session.authenticated || !session.user?.isAdmin) {
    window.location.href = "../auth/login.html";
    return null;
  }

  return session.user;
}

function createFrontendLink(loginHref, target) {
  if (loginHref.includes("pages/auth/")) {
    return `pages/${target}`;
  }

  return `../${target}`;
}

function createNavLink(text, href) {
  const link = document.createElement("a");
  link.textContent = text;
  link.href = href;

  return link;
}

function createLogoutButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nav-logout";
  button.textContent = "Abmelden";

  button.addEventListener("click", async () => {
    try {
      await apiRequest("/auth/logout", {
        method: "POST"
      });
    } finally {
      window.location.href = window.location.pathname.includes("/pages/")
        ? "../../index.html"
        : "index.html";
    }
  });

  return button;
}

async function updateNavigation() {
  const navActions = document.querySelector(".nav-actions");
  if (!navActions) return;

  const loginLink = navActions.querySelector('a[href$="login.html"]');
  if (!loginLink) return;

  const session = await getSession();
  if (!session.authenticated || !session.user) return;

  const profileLink = createNavLink(
    "Profil",
    createFrontendLink(loginLink.getAttribute("href"), "wishlist/wishlists.html")
  );
  const logoutButton = createLogoutButton();

  loginLink.replaceWith(profileLink, logoutButton);

  if (session.user.isAdmin === true) {
    const adminLink = createNavLink(
      "Admin-Dashboard",
      createFrontendLink(loginLink.getAttribute("href"), "admin/dashboard.html")
    );

    profileLink.after(adminLink);
  }
}

document.addEventListener("DOMContentLoaded", updateNavigation);
