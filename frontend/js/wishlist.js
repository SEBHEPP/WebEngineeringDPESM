// Dennis

document.addEventListener("DOMContentLoaded", () => {
  setupMyWishlist();
});

// Eine Produktzeile der Wunschliste (mit optionalem Entfernen-Button)
function wishlistItemRow(item, options = {}) {
  const image = item.imageUrl
    ? `<img src="${item.imageUrl}" alt="${item.name || ""}" loading="lazy" onerror="this.remove()">`
    : "";
  const removeButton = options.removeAttr
    ? `<button class="btn small danger" ${options.removeAttr} type="button">Entfernen</button>`
    : "";

  return `
    <div class="cart-item">
      <div class="image-placeholder">${image}</div>
      <div><h3>${item.name || "Gelöschtes Produkt"}</h3><p>Produkt-ID ${item.productId}</p></div>
      <div class="button-row"><strong>${formatPrice(item.price)}</strong>${removeButton}</div>
    </div>
  `;
}

// Eine Berechtigungszeile (Owner kann nicht entfernt werden)
function wishlistPermissionRow(permission) {
  return `
    <div>
      <span>${permission.email} · ${permission.role}</span>
      ${permission.role !== "owner" ? `<button class="btn small danger" data-remove-permission="${permission.userId}" type="button">Entfernen</button>` : "<span></span>"}
    </div>
  `;
}

// Ein Block für eine mit mir geteilte Wunschliste (inkl. Produkte, inline)
function sharedWishlistBlock(wishlist) {
  const canWrite = wishlist.role === "write" || wishlist.role === "owner";
  const items = wishlist.items.length
    ? wishlist.items.map((item) => wishlistItemRow(item, {
      removeAttr: canWrite ? `data-shared-remove data-wl="${wishlist.id}" data-pid="${item.productId}"` : ""
    })).join("")
    : '<p class="session-hint">Keine Produkte in dieser Liste.</p>';

  return `
    <div style="margin-top:18px">
      <h4 style="margin-bottom:8px">${wishlist.name} · ${wishlist.role}</h4>
      ${items}
    </div>
  `;
}

function setupMyWishlist() {
  const page = document.getElementById("wishlistPage");
  const itemBox = document.getElementById("wishlistItems");
  if (!page || !itemBox) return;

  const titleEl = document.getElementById("wishlistTitle");
  const descEl = document.getElementById("wishlistDescription");
  const identityEl = document.getElementById("profileIdentity");
  const editForm = document.getElementById("wishlistEditForm");
  const permissionBox = document.getElementById("wishlistPermissions");
  const permissionForm = document.getElementById("wishlistPermissionForm");
  const sharedBox = document.getElementById("sharedWishlists");
  const message = document.getElementById("wishlistMessage");
  let wishlistId = null;

  // Eigene User-ID + E-Mail im Profil anzeigen (damit andere einen einladen können)
  async function renderIdentity() {
    if (!identityEl) return;
    const session = await getSession();
    if (session.authenticated && session.user) {
      identityEl.textContent = `Deine User-ID: ${session.user.id} · ${session.user.email} — teile diese mit anderen, damit sie dich zu ihrer Wunschliste einladen können.`;
    } else {
      identityEl.textContent = "Bitte melde dich an, um deine Wunschliste zu sehen.";
    }
  }

  // Mit mir geteilte Wunschlisten inkl. Produkte inline laden
  async function renderShared() {
    if (!sharedBox) return;
    try {
      const sharedData = await apiRequest("/wishlists");
      const shared = (sharedData.wishlists || []).filter((entry) => entry.id !== wishlistId);

      if (!shared.length) {
        sharedBox.innerHTML = '<p class="session-hint">Aktuell wurde keine Wunschliste mit dir geteilt.</p>';
        return;
      }

      const details = await Promise.all(
        shared.map((entry) => apiRequest(`/wishlists/${entry.id}`)
          .then((data) => ({ ...data.wishlist, role: entry.role }))
          .catch(() => null))
      );

      sharedBox.innerHTML = details.filter(Boolean).map(sharedWishlistBlock).join("");

      sharedBox.querySelectorAll("[data-shared-remove]").forEach((button) => {
        button.addEventListener("click", async () => {
          try {
            await apiRequest(`/wishlists/${button.dataset.wl}/products/${button.dataset.pid}`, { method: "DELETE" });
            renderShared();
          } catch (error) {
            setMessage(message, error.message, "error");
          }
        });
      });
    } catch (error) {
      sharedBox.innerHTML = '<p class="session-hint error">Geteilte Wunschlisten konnten nicht geladen werden.</p>';
    }
  }

  // Eigene Wunschliste laden und rendern
  async function render() {
    try {
      const data = await apiRequest("/wishlists/me");
      const wishlist = data.wishlist;
      wishlistId = wishlist.id;

      // Name/Beschreibung anzeigen + Formular vorbefüllen
      if (titleEl) titleEl.textContent = wishlist.name;
      if (descEl && wishlist.description) descEl.textContent = wishlist.description;
      if (editForm) {
        editForm.name.value = wishlist.name || "";
        editForm.description.value = wishlist.description || "";
      }

      // Produkte
      itemBox.innerHTML = wishlist.items.length
        ? wishlist.items.map((item) => wishlistItemRow(item, { removeAttr: `data-remove-product="${item.productId}"` })).join("")
        : "<div class=\"empty-state\">Deine Wunschliste ist leer.</div>";

      // Berechtigungen
      if (permissionBox) {
        permissionBox.innerHTML = wishlist.permissions.map(wishlistPermissionRow).join("");
      }

      // Produkt-Entfernen-Buttons
      itemBox.querySelectorAll("[data-remove-product]").forEach((button) => {
        button.addEventListener("click", async () => {
          await apiRequest(`/wishlists/${wishlistId}/products/${button.dataset.removeProduct}`, { method: "DELETE" });
          render();
        });
      });

      // Berechtigung-Entfernen-Buttons
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

      renderShared();
    } catch (error) {
      itemBox.innerHTML = `<p class="session-hint error">${error.message}</p>`;
    }
  }

  // Name/Beschreibung speichern (WUN-1)
  editForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await apiRequest("/wishlists/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name.value,
          description: editForm.description.value
        })
      });
      setMessage(message, "Wunschliste gespeichert.", "success");
      render();
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  });

  // Teilen per E-Mail oder User-ID (WUN-4)
  permissionForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!wishlistId) return;

    const target = permissionForm.target.value.trim();
    // Reine Zahl -> User-ID, sonst E-Mail-Adresse
    const body = /^\d+$/.test(target)
      ? { userId: target, role: permissionForm.role.value }
      : { email: target, role: permissionForm.role.value };

    try {
      await apiRequest(`/wishlists/${wishlistId}/permissions`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      permissionForm.reset();
      setMessage(message, "Wunschliste geteilt.", "success");
      render();
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  });

  renderIdentity();
  render();
}
