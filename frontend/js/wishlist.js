// Elias
document.addEventListener("DOMContentLoaded", () => {
  setupWishlistOverview();
  setupWishlistDetail();
});

function wishlistCard(wishlist) {
  return `
    <article class="product-card">
      <div class="image-placeholder"></div>
      <div class="card-body">
        <a href="wishlist-detail.html?id=${wishlist.id}"><h3>${wishlist.name}</h3></a>
        <p>ID ${wishlist.id} · ${wishlist.description || "Keine Beschreibung"}</p>
        <span class="status ${wishlist.role === "owner" ? "green" : ""}">${wishlist.role}</span>
        <div class="button-row" style="margin-top:14px">
          <a class="btn small secondary" href="wishlist-detail.html?id=${wishlist.id}">Öffnen</a>
          ${wishlist.role === "owner" ? `<button class="btn small danger" data-delete-wishlist="${wishlist.id}" type="button">Löschen</button>` : ""}
        </div>
      </div>
    </article>
  `;
}

function setupWishlistOverview() {
  const grid = document.getElementById("wishlistGrid");
  const form = document.getElementById("wishlistForm");
  const message = document.getElementById("wishlistMessage");
  if (!grid) return;

  async function render() {
    try {
      const data = await apiRequest("/wishlists");
      const wishlists = data.wishlists || [];
      grid.innerHTML = wishlists.length ? wishlists.map(wishlistCard).join("") : "<div class=\"empty-state\">Noch keine Wunschliste vorhanden.</div>";

      grid.querySelectorAll("[data-delete-wishlist]").forEach((button) => {
        button.addEventListener("click", async () => {
          await apiRequest(`/wishlists/${button.dataset.deleteWishlist}`, { method: "DELETE" });
          render();
        });
      });
    } catch (error) {
      grid.innerHTML = `<p class="session-hint error">${error.message}</p>`;
    }
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const data = await apiRequest("/wishlists", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.value,
          description: form.description.value
        })
      });

      setMessage(message, "Wunschliste erstellt.", "success");
      window.location.href = `wishlist-detail.html?id=${data.wishlist.id}`;
    } catch (error) {
      setMessage(message, error.message, "error");
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
  const message = document.getElementById("wishlistDetailMessage");

  async function render() {
    try {
      const data = await apiRequest(`/wishlists/${wishlistId}`);
      const wishlist = data.wishlist;

      const title = document.getElementById("wishlistTitle");
      const eyebrow = document.getElementById("wishlistEyebrow");

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

    await apiRequest(`/wishlists/${wishlistId}/products`, {
      method: "POST",
      body: JSON.stringify({ productId: productInput.value })
    });
    addForm.reset();
    render();
  });

  permissionForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await apiRequest(`/wishlists/${wishlistId}/permissions`, {
      method: "POST",
      body: JSON.stringify({
        userId: permissionForm.userId.value,
        role: permissionForm.role.value
      })
    });
    permissionForm.reset();
    render();
  });

  if (!wishlistId) {
    setMessage(message, "Keine Wunschliste ausgewählt.", "error");
    return;
  }

  render();
}
