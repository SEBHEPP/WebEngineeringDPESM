// Elias
document.addEventListener("DOMContentLoaded", () => {
  setupMyWishlist();
  setupWishlistDetail();
});

function wishlistItemRow(item) {
  const image = item.imageUrl
    ? `<img src="${item.imageUrl}" alt="${item.name || ""}" loading="lazy" onerror="this.remove()">`
    : "";

  return `
    <div class="cart-item">
      <div class="image-placeholder">${image}</div>
      <div><h3>${item.name || "Gelöschtes Produkt"}</h3><p>Produkt-ID ${item.productId}</p></div>
      <div class="button-row"><strong>${formatPrice(item.price)}</strong><button class="btn small danger" data-remove-product="${item.productId}" type="button">Entfernen</button></div>
    </div>
  `;
}

function wishlistPermissionRow(permission) {
  return `
    <div>
      <span>${permission.email} · ${permission.role}</span>
      ${permission.role !== "owner" ? `<button class="btn small danger" data-remove-permission="${permission.userId}" type="button">Entfernen</button>` : "<span></span>"}
    </div>
  `;
}

function setupMyWishlist() {
  const page = document.getElementById("wishlistPage");
  const itemBox = document.getElementById("wishlistItems");
  if (!page || !itemBox) return;

  const permissionBox = document.getElementById("wishlistPermissions");
  const permissionForm = document.getElementById("wishlistPermissionForm");
  const message = document.getElementById("wishlistMessage");
  const copyButton = document.getElementById("copyWishlistLink");
  let wishlistId = null;

  async function render() {
    try {
      const data = await apiRequest("/wishlists/me");
      const wishlist = data.wishlist;
      wishlistId = wishlist.id;

      itemBox.innerHTML = wishlist.items.length
        ? wishlist.items.map(wishlistItemRow).join("")
        : "<div class=\"empty-state\">Deine Wunschliste ist leer.</div>";

      if (permissionBox) {
        permissionBox.innerHTML = wishlist.permissions.map(wishlistPermissionRow).join("");
      }

      itemBox.querySelectorAll("[data-remove-product]").forEach((button) => {
        button.addEventListener("click", async () => {
          await apiRequest(`/wishlists/${wishlistId}/products/${button.dataset.removeProduct}`, { method: "DELETE" });
          render();
        });
      });

      permissionBox?.querySelectorAll("[data-remove-permission]").forEach((button) => {
        button.addEventListener("click", async () => {
          try {
            await apiRequest(`/wishlists/${wishlistId}/permissions/${button.dataset.removePermission}`, { method: "DELETE" });
            render();
          } catch (error) {
            setMessage(message, error.message, "error");
          }
        });
      });
    } catch (error) {
      itemBox.innerHTML = `<p class="session-hint error">${error.message}</p>`;
    }
  }

  permissionForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!wishlistId) return;

    try {
      await apiRequest(`/wishlists/${wishlistId}/permissions`, {
        method: "POST",
        body: JSON.stringify({ userId: permissionForm.userId.value, role: permissionForm.role.value })
      });
      permissionForm.reset();
      setMessage(message, "Berechtigung gespeichert.", "success");
      render();
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  });

  copyButton?.addEventListener("click", async () => {
    if (!wishlistId) {
      setMessage(message, "Wunschliste noch nicht geladen.", "error");
      return;
    }

    const url = `${window.location.origin}/pages/wishlist/wishlist-detail.html?id=${wishlistId}`;

    try {
      await navigator.clipboard.writeText(url);
      setMessage(message, "Link kopiert.", "success");
    } catch (error) {
      window.prompt("Link kopieren:", url);
    }
  });

  render();
}

function setupWishlistDetail() {
  const page = document.getElementById("wishlistDetailPage");
  if (!page) return;

  const wishlistId = getParam("id");
  const addForm = document.getElementById("wishlistAddProductForm");
  const permissionForm = document.getElementById("wishlistPermissionForm");
  let message = document.getElementById("wishlistDetailMessage");
  let itemBox = document.getElementById("wishlistItems");
  const permissionBox = document.getElementById("wishlistPermissions");

  if (!message) {
    message = document.createElement("p");
    message.className = "session-hint";
    message.id = "wishlistDetailMessage";
    page.querySelector(".admin-tools")?.appendChild(message);
  }

  if (!itemBox) {
    itemBox = document.createElement("div");
    itemBox.id = "wishlistItems";
    const tableCard = page.querySelector(".table-card");
    tableCard.querySelectorAll(".cart-item").forEach((item) => item.remove());
    tableCard.appendChild(itemBox);
  }

  if (permissionBox) {
    permissionBox.innerHTML = "";
  }

  async function render() {
    try {
      const data = await apiRequest(`/wishlists/${wishlistId}`);
      const wishlist = data.wishlist;

      const title = document.getElementById("wishlistTitle") || document.querySelector(".page-hero h1");
      const eyebrow = document.getElementById("wishlistEyebrow") || document.querySelector(".page-hero .eyebrow");

      if (title) title.textContent = wishlist.name;
      if (eyebrow) eyebrow.textContent = `Wunschliste · ${wishlist.id}`;

      let itemBox = document.getElementById("wishlistItems");

      if (!itemBox) {
        itemBox = document.createElement("div");
        itemBox.id = "wishlistItems";
        const tableCard = page.querySelector(".table-card");
        tableCard.querySelectorAll(".cart-item").forEach((item) => item.remove());
        tableCard.appendChild(itemBox);
      }

      itemBox.innerHTML = wishlist.items.length
        ? wishlist.items.map((item) => `
          <div class="cart-item">
            <div class="image-placeholder"></div>
            <div><h3>${item.name || "Gelöschtes Produkt"}</h3><p>Produkt-ID ${item.productId}</p></div>
            <div class="button-row"><strong>${formatPrice(item.price)}</strong><button class="btn small danger" data-remove-product="${item.productId}" type="button">Entfernen</button></div>
          </div>
        `).join("")
        : "<div class=\"empty-state\">Keine Produkte in dieser Liste.</div>";

      document.getElementById("wishlistPermissions").innerHTML = wishlist.permissions.map((permission) => `
        <div>
          <span>${permission.email} · ${permission.role}</span>
          ${permission.role !== "owner" ? `<button class="btn small danger" data-remove-permission="${permission.userId}" type="button">Entfernen</button>` : "<span></span>"}
        </div>
      `).join("");

      document.querySelectorAll("[data-remove-product]").forEach((button) => {
        button.addEventListener("click", async () => {
          await apiRequest(`/wishlists/${wishlistId}/products/${button.dataset.removeProduct}`, { method: "DELETE" });
          render();
        });
      });

      document.querySelectorAll("[data-remove-permission]").forEach((button) => {
        button.addEventListener("click", async () => {
          await apiRequest(`/wishlists/${wishlistId}/permissions/${button.dataset.removePermission}`, { method: "DELETE" });
          render();
        });
      });
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  }

  addForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const productInput = addForm.productId || addForm.addProductId;

    try {
      await apiRequest(`/wishlists/${wishlistId}/products`, {
        method: "POST",
        body: JSON.stringify({ productId: productInput.value })
      });
      addForm.reset();
      render();
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  });

  permissionForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await apiRequest(`/wishlists/${wishlistId}/permissions`, {
        method: "POST",
        body: JSON.stringify({
          userId: permissionForm.userId.value,
          role: permissionForm.role.value
        })
      });
      permissionForm.reset();
      render();
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  });

  if (!wishlistId) {
    const title = document.getElementById("wishlistTitle") || document.querySelector(".page-hero h1");
    const eyebrow = document.getElementById("wishlistEyebrow") || document.querySelector(".page-hero .eyebrow");

    if (title) title.textContent = "Wunschliste";
    if (eyebrow) eyebrow.textContent = "Wunschliste";

    setMessage(message, "Keine Wunschliste ausgewählt.", "error");
    return;
  }

  render();
}
