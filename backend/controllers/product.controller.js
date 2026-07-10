// Felix
const db = require("../config/db");

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Prüft und säubert Produkt-IDs
function normalizeId(id, fieldName = "id") {
  const normalizedId = Number(id);

  if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
    throw createError(400, `valid ${fieldName} is required`);
  }

  return normalizedId;
}

// Prüft Textfelder und entfernt Leerzeichen
function normalizeText(value, fieldName) {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, `${fieldName} is required`);
  }

  return value.trim();
}

// Stellt sicher, dass der Preis eine gültige, positive Zahl ist
function normalizePrice(value) {
  const price = Number(value);

  if (!Number.isFinite(price) || price < 0) {
    throw createError(400, "valid price is required");
  }

  return price;
}

// Stellt sicher, dass der Lagerbestand eine gültige, positive Ganzzahl ist
function normalizeQuantity(value) {
  const quantity = Number(value);

  if (!Number.isInteger(quantity) || quantity < 0) {
    throw createError(400, "valid availableQuantity is required");
  }

  return quantity;
}

// Formatiert die Bild-URL oder gibt null zurück
function normalizeImageUrl(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const imageUrl = String(value).trim();

  return imageUrl.length > 0 ? imageUrl : null;
}

// Übersetzt snake_case in JavaScript-Variablen camelCase
function toProduct(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    availableQuantity: row.available_quantity,
    imageUrl: row.image_url,
    createdAt: row.created_at
  };
}

// Ruft eine Liste von Produkten ab 
// Erlaubt Suche per Text, Filterung nach Min/Max-Preis und Sortierung
async function listProducts(req, res, next) {
  try {
    const params = [];
    const whereParts = [];
    const search = req.query.q || req.query.search;
    const sort = req.query.sort;

    if (search) {
      params.push(`%${String(search).trim()}%`);
      whereParts.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    if (req.query.minPrice) {
      params.push(normalizePrice(req.query.minPrice));
      whereParts.push(`price >= $${params.length}`);
    }

    if (req.query.maxPrice) {
      params.push(normalizePrice(req.query.maxPrice));
      whereParts.push(`price <= $${params.length}`);
    }

    const limit = req.query.limit ? Math.min(normalizeQuantity(req.query.limit), 100) : 50;
    const orderBy = sort === "price_desc"
      ? "price DESC, id ASC"
      : sort === "price_asc"
        ? "price ASC, id ASC"
        : "id ASC";

    params.push(limit);

    const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
    const result = await db.query(
      `SELECT id, name, description, price, available_quantity, image_url, created_at
       FROM products
       ${whereSql}
       ORDER BY ${orderBy}
       LIMIT $${params.length}`,
      params
    );

    res.status(200).json({
      products: result.rows.map(toProduct)
    });
  } catch (error) {
    next(error);
  }
}

// Ruft ein einzelnes Produkt anhand seiner eindeutigen ID ab 
async function getProductById(req, res, next) {
  try {
    const productId = normalizeId(req.params.id, "productId");
    const result = await db.query(
      "SELECT id, name, description, price, available_quantity, image_url, created_at FROM products WHERE id = $1",
      [productId]
    );
    const product = result.rows[0];

    if (!product) {
      throw createError(404, "product not found");
    }

    res.status(200).json({
      product: toProduct(product)
    });
  } catch (error) {
    next(error);
  }
}

// Erstellt ein neues Produkt in der Datenbank nach vorheriger Validierung der Daten
async function createProduct(req, res, next) {
  try {
    const name = normalizeText(req.body.name, "name");
    const description = req.body.description ? String(req.body.description).trim() : null;
    const price = normalizePrice(req.body.price);
    const availableQuantity = normalizeQuantity(req.body.availableQuantity ?? req.body.available_quantity ?? 0);
    const imageUrl = normalizeImageUrl(req.body.imageUrl ?? req.body.image_url);

    const result = await db.query(
      `INSERT INTO products (name, description, price, available_quantity, image_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, price, available_quantity, image_url, created_at`,
      [name, description, price, availableQuantity, imageUrl]
    );

    res.status(201).json({
      message: "product created",
      product: toProduct(result.rows[0])
    });
  } catch (error) {
    next(error);
  }
}

// Aktualisiert ein Produkt, indem es fehlende Eingabewerte automatisch durch die bestehenden Daten aus der Datenbank ersetzt
async function updateProduct(req, res, next) {
  try {
    const productId = normalizeId(req.params.id, "productId");
    const oldProductResult = await db.query(
      "SELECT id, name, description, price, available_quantity, image_url, created_at FROM products WHERE id = $1",
      [productId]
    );
    const oldProduct = oldProductResult.rows[0];

    if (!oldProduct) {
      throw createError(404, "product not found");
    }

    const name = req.body.name !== undefined ? normalizeText(req.body.name, "name") : oldProduct.name;
    const description = req.body.description !== undefined ? String(req.body.description).trim() : oldProduct.description;
    const price = req.body.price !== undefined ? normalizePrice(req.body.price) : oldProduct.price;
    const availableQuantityValue = req.body.availableQuantity ?? req.body.available_quantity;
    const availableQuantity = availableQuantityValue !== undefined
      ? normalizeQuantity(availableQuantityValue)
      : oldProduct.available_quantity;
    const imageUrlValue = req.body.imageUrl ?? req.body.image_url;
    const imageUrl = imageUrlValue !== undefined
      ? normalizeImageUrl(imageUrlValue)
      : oldProduct.image_url;

    const result = await db.query(
      `UPDATE products
       SET name = $1, description = $2, price = $3, available_quantity = $4, image_url = $5
       WHERE id = $6
       RETURNING id, name, description, price, available_quantity, image_url, created_at`,
      [name, description, price, availableQuantity, imageUrl, productId]
    );

    res.status(200).json({
      message: "product updated",
      product: toProduct(result.rows[0])
    });
  } catch (error) {
    next(error);
  }
}

// Löscht ein Produkt anhand seiner ID aus der Datenbank 
// Gibt die Daten des gelöschten Artikels zurück
async function deleteProduct(req, res, next) {
  try {
    const productId = normalizeId(req.params.id, "productId");
    const result = await db.query(
      `DELETE FROM products
       WHERE id = $1
       RETURNING id, name, description, price, available_quantity, image_url, created_at`,
      [productId]
    );
    const product = result.rows[0];

    if (!product) {
      throw createError(404, "product not found");
    }

    res.status(200).json({
      message: "product deleted",
      product: toProduct(product)
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  updateProduct
};
