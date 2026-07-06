// Elias
document.addEventListener("DOMContentLoaded", () => {
  setupHomeProducts();
  setupProductsPage();
  setupProductDetailPage();
  setupAdminProductsPage();
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function productImage(product) {
  if (!product.imageUrl) return "";

  return `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.remove()">`;
}

async function loadProducts(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });

  const query = searchParams.toString();
  const data = await apiRequest(`/products${query ? `?${query}` : ""}`);

  return data.products || [];
}

function productCard(product, linkPrefix = "") {
  if (typeof linkPrefix !== "string") linkPrefix = "";

  return `
    <article class="product-card">
      <div class="image-placeholder">${productImage(product)}</div>
      <div class="card-body">
        <a href="${linkPrefix}product-detail.html?id=${product.id}"><h3>${product.name}</h3></a>
        <p>Produkt-ID ${product.id} · ${product.description || "Keine Beschreibung"}</p>
        <span class="status ${product.availableQuantity > 0 ? "green" : "red"}">${product.availableQuantity > 0 ? "Auf Lager" : "Nicht verfügbar"}</span>
        <div class="price">${formatPrice(product.price)}</div>
        <div class="button-row" style="margin-top:14px">
          <button class="btn small" data-cart-id="${product.id}" type="button">Warenkorb</button>
        </div>
      </div>
    </article>
  `;
}

function setupProductButtons(container, products) {
  container.querySelectorAll("[data-cart-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const product = products.find((item) => item.id === Number(button.dataset.cartId));
      if (!product || product.availableQuantity <= 0) return;

      addToCart(product);
      button.textContent = "Hinzugefügt";
    });
  });
}

async function setupHomeProducts() {
  const grid = document.getElementById("homeProductsGrid");
  if (!grid) return;

  try {
    const products = await loadProducts({ limit: 8 });
    grid.innerHTML = products.length
      ? products.map((product) => productCard(product, "pages/shop/")).join("")
      : "<div class=\"empty-state\">Aktuell sind keine Produkte verfügbar.</div>";
    setupProductButtons(grid, products);
  } catch (error) {
    grid.innerHTML = `<p class="session-hint error">${error.message}</p>`;
  }
}

function setupProductsPage() {
  const grid = document.getElementById("productsGrid");
  const form = document.getElementById("productSearchForm");
  if (!grid) return;

  const initialQuery = getParam("q");
  const initialQueryInput = form?.querySelector("[name='q']");
  if (initialQuery && initialQueryInput) initialQueryInput.value = initialQuery;

  async function render() {
    try {
      grid.innerHTML = "<p class=\"session-hint\">Produkte werden geladen...</p>";
      const sortInput = document.querySelector("input[name='sort-products']:checked");
      const productId = form?.querySelector("[name='productId']")?.value;
      let products;

      if (productId) {
        const data = await apiRequest(`/products/${productId}`);
        products = [data.product];
      } else {
        products = await loadProducts({
          q: form?.querySelector("[name='q']")?.value,
          sort: sortInput?.value
        });
      }

      grid.innerHTML = products.length ? products.map((product) => productCard(product)).join("") : "<div class=\"empty-state\">Keine Produkte gefunden.</div>";
      setupProductButtons(grid, products);
    } catch (error) {
      grid.innerHTML = `<p class="session-hint error">${error.message}</p>`;
    }
  }

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    render();
  });

  form?.querySelector("[name='q']")?.addEventListener("input", () => {
    render();
  });

  form?.querySelector("[name='productId']")?.addEventListener("change", () => {
    render();
  });

  document.querySelectorAll("input[name='sort-products']").forEach((input) => {
    input.addEventListener("change", render);
  });

  render();
}

async function setupProductDetailPage() {
  const box = document.getElementById("productDetail");
  if (!box) return;

  try {
    const data = await apiRequest(`/products/${getParam("id") || 1}`);
    const product = data.product;

    const setText = (selector, value) => {
      const element = box.querySelector(selector);
      if (element) element.textContent = value;
    };

    setText("[data-product-name]", product.name);
    setText("[data-product-description]", product.description || "Keine Beschreibung vorhanden.");
    setText("[data-product-price]", formatPrice(product.price));
    setText("[data-product-stock]", product.availableQuantity);
    setText("[data-product-status]", product.availableQuantity > 0 ? "Auf Lager" : "Nicht verfügbar");
    setText("[data-product-id]", product.id);

    const galleryMain = document.querySelector(".gallery-main");
    if (galleryMain) galleryMain.innerHTML = productImage(product);

    const cartButton = box.querySelector("[data-add-cart]");
    cartButton.disabled = product.availableQuantity <= 0;
    cartButton.addEventListener("click", () => {
      addToCart(product);
      cartButton.textContent = "Im Warenkorb";
    });
  } catch (error) {
    box.innerHTML = `<p class="session-hint error">${error.message}</p>`;
  }
}

function setupAdminProductsPage() {
  const tableBody = document.getElementById("adminProductsBody");
  const form = document.getElementById("adminProductForm");
  const searchForm = document.getElementById("adminProductSearchForm");
  const message = document.getElementById("adminProductMessage");
  if (!tableBody) return;

  async function render(params = {}) {
    try {
      const products = await loadProducts(params);
      tableBody.innerHTML = products.map((product) => `
        <tr>
          <td>${product.id}</td>
          <td>${product.name}</td>
          <td>${product.description || ""}</td>
          <td>${formatPrice(product.price)}</td>
          <td>${product.availableQuantity}</td>
          <td><span class="status ${product.availableQuantity > 0 ? "green" : "red"}">${product.availableQuantity > 0 ? "Aktiv" : "Leer"}</span></td>
          <td><div class="button-row"><button class="btn small secondary" data-edit-product="${product.id}" type="button">Bearbeiten</button><button class="btn small danger" data-delete-product="${product.id}" type="button">Löschen</button></div></td>
        </tr>
      `).join("");

      tableBody.querySelectorAll("[data-edit-product]").forEach((button) => {
        button.addEventListener("click", () => {
          const product = products.find((item) => item.id === Number(button.dataset.editProduct));
          form.productId.value = product.id;
          form.name.value = product.name;
          form.description.value = product.description || "";
          form.price.value = product.price;
          form.availableQuantity.value = product.availableQuantity;
          if (form.imageUrl) form.imageUrl.value = product.imageUrl || "";
        });
      });

      tableBody.querySelectorAll("[data-delete-product]").forEach((button) => {
        button.addEventListener("click", async () => {
          await apiRequest(`/products/${button.dataset.deleteProduct}`, { method: "DELETE" });
          setMessage(message, "Produkt gelöscht.", "success");
          render();
        });
      });
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const productId = form.productId.value;
    const payload = {
      name: form.name.value,
      description: form.description.value,
      price: form.price.value,
      availableQuantity: form.availableQuantity.value,
      imageUrl: form.imageUrl ? form.imageUrl.value : ""
    };

    try {
      await apiRequest(productId ? `/products/${productId}` : "/products", {
        method: productId ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      });

      form.reset();
      setMessage(message, "Produkt gespeichert.", "success");
      render();
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  });

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    render({ q: searchForm.productQuery.value });
  });

  render();
}
