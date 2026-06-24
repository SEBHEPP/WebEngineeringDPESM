const USER_ID = 2; // Admin-Benutzer ID aus dem DB Seed

async function apiRequest(method, path, body) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": String(USER_ID)
    }
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`/api/inv${path}`, options);
  const data = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    throw new Error(data?.error || `API-Fehler ${response.status}`);
  }

  return data;
}

function formatPrice(value) {
  return typeof value === "number" ? `${value.toFixed(2).replace(".", ",")} €` : "0,00 €";
}

let isEditMode = false;

// DOM-Elemente
const tableBody = document.getElementById("adminProductsTableBody");
const searchIdInput = document.getElementById("searchProductId");
const searchQueryInput = document.getElementById("searchProductQuery");

const formTitle = document.getElementById("formTitle");
const formIdField = document.getElementById("formProductIdField");
const formIdInput = document.getElementById("formProductId");
const formNameInput = document.getElementById("formProductName");
const formDescInput = document.getElementById("formProductDescription");
const formPriceInput = document.getElementById("formProductPrice");
const formQtyInput = document.getElementById("formProductQuantity");
const formCategorySelect = document.getElementById("formProductCategory");

const saveBtn = document.getElementById("saveProductBtn");
const cancelBtn = document.getElementById("cancelEditBtn");

// Produkte laden und rendern
async function loadProducts() {
  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="8">Produkte werden geladen...</td></tr>`;

  try {
    const searchId = searchIdInput.value.trim();
    const query = searchQueryInput.value.trim();

    let products = [];
    if (searchId) {
      // Gezielte Produktsuche per ID (INV-1)
      try {
        const product = await apiRequest("GET", `/products/${searchId}`);
        products = [product];
      } catch (err) {
        if (err.message.includes("404") || err.message.includes("nicht gefunden")) {
          products = [];
        } else {
          throw err;
        }
      }
    } else {
      // Produktsuche mit Query (INV-2)
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      const urlPath = `/products${params.toString() ? `?${params.toString()}` : ""}`;
      products = await apiRequest("GET", urlPath);
    }

    if (!products.length) {
      tableBody.innerHTML = `<tr><td colspan="8">Keine Produkte gefunden.</td></tr>`;
      return;
    }

    tableBody.innerHTML = products
      .map((p) => {
        const statusClass = p.available_quantity > 0 ? "green" : "red";
        const statusText = p.available_quantity > 0 ? "Aktiv" : "Leer";
        return `
          <tr id="admin-product-row-${p.id}">
            <td>${p.id}</td>
            <td><strong>${p.name}</strong></td>
            <td>${p.description || "-"}</td>
            <td>${formatPrice(Number(p.price))}</td>
            <td>${p.available_quantity}</td>
            <td>${p.category || "-"}</td>
            <td><span class="status ${statusClass}">${statusText}</span></td>
            <td>
              <div class="button-row">
                <button class="btn small secondary edit-button" data-id="${p.id}">Bearbeiten</button>
                <button class="btn small danger delete-button" data-id="${p.id}">Löschen</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    // Event-Listener an die Buttons binden
    tableBody.querySelectorAll(".edit-button").forEach((btn) => {
      btn.addEventListener("click", () => startEdit(Number(btn.dataset.id)));
    });

    tableBody.querySelectorAll(".delete-button").forEach((btn) => {
      btn.addEventListener("click", () => deleteProduct(Number(btn.dataset.id)));
    });
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="8" style="color:var(--danger)">Fehler beim Laden: ${error.message}</td></tr>`;
  }
}

// Bearbeitungsmodus starten (INV-5)
async function startEdit(productId) {
  try {
    const product = await apiRequest("GET", `/products/${productId}`);
    if (!product) return;

    isEditMode = true;
    formTitle.textContent = "Produkt bearbeiten";
    formIdField.style.display = "block";
    formIdInput.value = product.id;
    formNameInput.value = product.name;
    formDescInput.value = product.description || "";
    formPriceInput.value = product.price;
    formQtyInput.value = product.available_quantity;
    formCategorySelect.value = product.category || "anzuege";
    cancelBtn.style.display = "block";
    
    // Scroll to form on mobile
    formTitle.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    alert(`Fehler beim Laden des Produkts: ${error.message}`);
  }
}

// Bearbeitungsmodus zurücksetzen
function resetForm() {
  isEditMode = false;
  formTitle.textContent = "Produkt anlegen";
  formIdField.style.display = "none";
  formIdInput.value = "";
  formNameInput.value = "";
  formDescInput.value = "";
  formPriceInput.value = "";
  formQtyInput.value = "";
  formCategorySelect.value = "anzuege";
  cancelBtn.style.display = "none";
}

// Produkt löschen (INV-4)
async function deleteProduct(productId) {
  if (!confirm(`Möchten Sie das Produkt mit der ID ${productId} wirklich löschen?`)) {
    return;
  }

  try {
    await apiRequest("DELETE", `/products/${productId}`);
    alert("Produkt wurde gelöscht.");
    if (isEditMode && Number(formIdInput.value) === productId) {
      resetForm();
    }
    loadProducts();
  } catch (error) {
    alert(`Fehler beim Löschen des Produkts: ${error.message}`);
  }
}

// Speichern (Erstellen/Bearbeiten) (INV-3 / INV-5)
async function handleSave() {
  const name = formNameInput.value.trim();
  const description = formDescInput.value.trim();
  const price = parseFloat(formPriceInput.value);
  const qty = parseInt(formQtyInput.value, 10);
  const category = formCategorySelect.value;

  if (!name) {
    alert("Bitte geben Sie einen Produktnamen ein.");
    return;
  }

  if (isNaN(price) || price < 0) {
    alert("Bitte geben Sie einen gültigen Preis ein.");
    return;
  }

  if (isNaN(qty) || qty < 0) {
    alert("Bitte geben Sie eine gültige Menge ein.");
    return;
  }

  const payload = {
    name,
    description,
    price,
    available_quantity: qty,
    category
  };

  try {
    if (isEditMode) {
      const productId = Number(formIdInput.value);
      await apiRequest("PUT", `/products/${productId}`, payload);
      alert("Produkt wurde erfolgreich aktualisiert.");
    } else {
      await apiRequest("POST", `/products`, payload);
      alert("Produkt wurde erfolgreich angelegt.");
    }
    resetForm();
    loadProducts();
  } catch (error) {
    alert(`Fehler beim Speichern: ${error.message}`);
  }
}

// Event-Listener initialisieren
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();

  // Such-Events
  if (searchIdInput) {
    searchIdInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        loadProducts();
      }
    });
  }

  if (searchQueryInput) {
    searchQueryInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        loadProducts();
      }
    });
  }

  // Formular-Events
  if (saveBtn) {
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleSave();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      resetForm();
    });
  }
});
