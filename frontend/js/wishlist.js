// Dennis

// Wird ausgeführt sobald die HTML Seite geladen ist
// Beide Funktionen prüfen intern selbst ob die nötigen DOM Elemente vorhanden sind

document.addEventListener("DOMContentLoaded", () => {
  setupMyWishlist();    // Logik für wishlists.html (persönliche Liste)
  setupWishlistDetail(); // Logik für wishlist-detail.html (geteilte Liste per ID)
});

// HTML Generierung

// Gibt eine HTML Zeile für ein Produkt in der Wunschliste zurück
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

// Gibt eine HTML Zeile für einen Nutzer mit Berechtigung zurück
// Owner bekommt keinen Entfernen Button (kann sich nicht selbst entfernen)
function wishlistPermissionRow(permission) {
  return `
    <div>
      <span>${permission.email} · ${permission.role}</span>
      ${permission.role !== "owner" ? `<button class="btn small danger" data-remove-permission="${permission.userId}" type="button">Entfernen</button>` : "<span></span>"}
    </div>
  `;
}

// Gibt eine HTML Zeile für eine mit dem Nutzer geteilte Wunschliste zurück
function sharedWishlistRow(wishlist) {
  return `
    <div>
      <span>${wishlist.name} - ${wishlist.role}</span>
      <a class="btn small secondary" href="wishlist-detail.html?id=${wishlist.id}">Oeffnen</a>
    </div>
  `;
}

// wishlists.html (persönliche Wunschliste)

// Richtet die persönliche Wunschlisten Seite ein
// Bricht ab wenn die nötigen DOM Elemente nicht vorhanden sind
function setupMyWishlist() {
  const page = document.getElementById("wishlistPage");
  const itemBox = document.getElementById("wishlistItems");
  if (!page || !itemBox) return;

  const permissionBox = document.getElementById("wishlistPermissions");
  const sharedBox = document.getElementById("sharedWishlists");
  const permissionForm = document.getElementById("wishlistPermissionForm");
  const message = document.getElementById("wishlistMessage");
  const copyButton = document.getElementById("copyWishlistLink");
  let wishlistId = null; // wird nach dem ersten render() gesetzt

  // Lädt die persönliche Wunschliste vom Backend und rendert Produkte + Berechtigungen
  async function render() {
    try {
      const data = await apiRequest("/wishlists/me");
      const wishlist = data.wishlist;
      wishlistId = wishlist.id; // ID für spätere API Aufrufe merken

      // Produkte rendern

      itemBox.innerHTML = wishlist.items.length
        ? wishlist.items.map(wishlistItemRow).join("")
        : "<div class=\"empty-state\">Deine Wunschliste ist leer.</div>";

      // Berechtigungen rendern (falls DOM Element vorhanden)
      if (permissionBox) {
        permissionBox.innerHTML = wishlist.permissions.map(wishlistPermissionRow).join("");
      }

      // Mit dem Nutzer geteilte Wunschlisten laden und rendern (eigene Liste herausfiltern)
      if (sharedBox) {
        const sharedData = await apiRequest("/wishlists");
        const sharedWishlists = (sharedData.wishlists || []).filter((entry) => entry.id !== wishlist.id);
        sharedBox.innerHTML = sharedWishlists.length
          ? sharedWishlists.map(sharedWishlistRow).join("")
          : '<p class="session-hint">Aktuell wurde keine Wunschliste mit dir geteilt.</p>';
      }

      // Entfernen Buttons für Produkte werden nach jedem render() neu registriert
      itemBox.querySelectorAll("[data-remove-product]").forEach((button) => {
        button.addEventListener("click", async () => {
          await apiRequest(`/wishlists/${wishlistId}/products/${button.dataset.removeProduct}`, { method: "DELETE" });
          render();
        });
      });

      // Entfernen Buttons für Berechtigungen
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
      if (sharedBox) {
        sharedBox.innerHTML = '<p class="session-hint error">Geteilte Wunschlisten konnten nicht geladen werden.</p>';
      }
    }
  }

  // Formular: Anderen Nutzer zur Liste einladen (per userId + Rolle)
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

  // Button: Teilbaren Link zur Wunschlisten Detailseite kopieren
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

  render(); // Initial laden
}

// wishlist-detail.html (geteilte Wunschliste per ID)

// Richtet die Wunschlisten Detailseite ein
// Die Wunschlisten ID kommt aus dem URL Parameter: ?id=123
function setupWishlistDetail() {
  const page = document.getElementById("wishlistDetailPage");
  if (!page) return;

  const wishlistId = getParam("id"); // aus api.js: liest URL Parameter
  const addForm = document.getElementById("wishlistAddProductForm");
  const permissionForm = document.getElementById("wishlistPermissionForm");
  let message = document.getElementById("wishlistDetailMessage");
  let itemBox = document.getElementById("wishlistItems");
  const permissionBox = document.getElementById("wishlistPermissions");

  // Falls kein message Element im HTML vorhanden ist wird es dynamisch erzeugt
  if (!message) {
    message = document.createElement("p");
    message.className = "session-hint";
    message.id = "wishlistDetailMessage";
    page.querySelector(".admin-tools")?.appendChild(message);
  }

  // Falls kein itemBox Element vorhanden ist wird es im .table-card Container erzeugt
  if (!itemBox) {
    itemBox = document.createElement("div");
    itemBox.id = "wishlistItems";
    const tableCard = page.querySelector(".table-card");
    tableCard.querySelectorAll(".cart-item").forEach((item) => item.remove()); // Platzhalter entfernen
    tableCard.appendChild(itemBox);
  }

  if (permissionBox) {
    permissionBox.innerHTML = "";
  }

  // Wunschliste per ID vom Backend laden und rendern
  async function render() {
    try {
      const data = await apiRequest(`/wishlists/${wishlistId}`);
      const wishlist = data.wishlist;

      // Titel und Eyebrow in der Seite aktualisieren
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

      // Produkte rendern
      itemBox.innerHTML = wishlist.items.length
        ? wishlist.items.map((item) => `
          <div class="cart-item">
            <div class="image-placeholder"></div>
            <div><h3>${item.name || "Gelöschtes Produkt"}</h3><p>Produkt-ID ${item.productId}</p></div>
            <div class="button-row"><strong>${formatPrice(item.price)}</strong><button class="btn small danger" data-remove-product="${item.productId}" type="button">Entfernen</button></div>
          </div>
        `).join("")
        : "<div class=\"empty-state\">Keine Produkte in dieser Liste.</div>";

      // Berechtigungen rendern
      document.getElementById("wishlistPermissions").innerHTML = wishlist.permissions.map((permission) => `
        <div>
          <span>${permission.email} · ${permission.role}</span>
          ${permission.role !== "owner" ? `<button class="btn small danger" data-remove-permission="${permission.userId}" type="button">Entfernen</button>` : "<span></span>"}
        </div>
      `).join("");

      // Entfernen Buttons nach jedem render() neu registrieren
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

  // Formular: Produkt zur Wunschliste hinzufügen (per Produkt ID)
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

  // Formular: Anderen Nutzer zur Liste einladen
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

  // Fehler falls kein ?id= Parameter in der URL vorhanden ist
  if (!wishlistId) {
    const title = document.getElementById("wishlistTitle") || document.querySelector(".page-hero h1");
    const eyebrow = document.getElementById("wishlistEyebrow") || document.querySelector(".page-hero .eyebrow");

    if (title) title.textContent = "Wunschliste";
    if (eyebrow) eyebrow.textContent = "Wunschliste";

    setMessage(message, "Keine Wunschliste ausgewählt.", "error");
    return;
  }

  render(); // Initial laden
}
