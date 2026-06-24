const db = require("../config/db");

async function searchProducts({ query, available, category }) {
  const where = [];
  const params = [];

  if (query) {
    params.push(`%${query}%`);
    where.push("(name ILIKE $" + params.length + " OR description ILIKE $" + params.length + ")");
  }

  if (available === true) {
    params.push(0);
    where.push("available_quantity > $" + params.length);
  }

  if (category) {
    params.push(category);
    where.push("category = $" + params.length);
  }

  const sql = `SELECT id, name, description, price, available_quantity, category, created_at FROM products ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id ASC`;
  return db.query(sql, params);
}

async function getProductById(productId) {
  const result = await db.query(
    "SELECT id, name, description, price, available_quantity, category, created_at FROM products WHERE id = $1",
    [productId]
  );
  return result.rows[0] || null;
}

async function createProduct({ name, description, price, available_quantity, category }) {
  const result = await db.query(
    "INSERT INTO products (name, description, price, available_quantity, category) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, description, price, available_quantity, category, created_at",
    [name, description || null, price, available_quantity || 0, category || null]
  );
  return result.rows[0];
}

async function updateProduct(productId, fields) {
  const keys = Object.keys(fields);
  const values = Object.values(fields);

  if (!keys.length) {
    return getProductById(productId);
  }

  const setClauses = keys.map((key, index) => `${key} = $${index + 1}`);
  values.push(productId);

  const result = await db.query(
    `UPDATE products SET ${setClauses.join(", ")} WHERE id = $${values.length} RETURNING id, name, description, price, available_quantity, category, created_at`,
    values
  );

  return result.rows[0] || null;
}

async function deleteProduct(productId) {
  const result = await db.query("DELETE FROM products WHERE id = $1 RETURNING id", [productId]);
  return result.rowCount > 0;
}

async function getCartItems(userId) {
  const result = await db.query(
    `SELECT cart_items.id AS cart_item_id,
            cart_items.product_id,
            cart_items.quantity,
            products.name,
            products.description,
            products.price,
            products.available_quantity
       FROM cart_items
       JOIN products ON products.id = cart_items.product_id
      WHERE cart_items.user_id = $1
      ORDER BY cart_items.added_at DESC`,
    [userId]
  );
  return result.rows;
}

async function findCartItem(userId, productId) {
  const result = await db.query(
    "SELECT id, user_id, product_id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2",
    [userId, productId]
  );
  return result.rows[0] || null;
}

async function addToCart(userId, productId, quantity) {
  const result = await db.query(
    `INSERT INTO cart_items (user_id, product_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, product_id)
      DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
      RETURNING id, user_id, product_id, quantity`,
    [userId, productId, quantity]
  );
  return result.rows[0];
}

async function removeCartItem(cartItemId, userId) {
  const result = await db.query(
    "DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id",
    [cartItemId, userId]
  );
  return result.rowCount > 0;
}

async function clearCart(userId, client) {
  const executor = client || db;
  await executor.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
}

async function getUserById(userId) {
  const result = await db.query("SELECT id, email FROM users WHERE id = $1", [userId]);
  return result.rows[0] || null;
}

async function checkoutCart(userId, items, totalPrice) {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      "INSERT INTO orders (user_id, total_price) VALUES ($1, $2) RETURNING id, purchased_at",
      [userId, totalPrice]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      const updateResult = await client.query(
        "UPDATE products SET available_quantity = available_quantity - $1 WHERE id = $2 AND available_quantity >= $1",
        [item.quantity, item.product_id]
      );

      if (updateResult.rowCount === 0) {
        throw new Error(`Produkt ${item.product_id} ist nicht mehr in ausreichender Menge verfügbar.`);
      }

      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)",
        [orderId, item.product_id, item.quantity, item.price]
      );
    }

    await client.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
    await client.query("COMMIT");

    return { orderId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getUserOrders(userId) {
  const result = await db.query(
    `SELECT
       o.id AS order_id,
       o.total_price,
       o.purchased_at,
       oi.product_id,
       oi.quantity,
       oi.price_at_purchase,
       p.name AS product_name
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE o.user_id = $1
     ORDER BY o.purchased_at DESC, oi.product_id ASC`,
    [userId]
  );

  const orders = [];
  const orderMap = new Map();

  for (const row of result.rows) {
    if (!orderMap.has(row.order_id)) {
      orderMap.set(row.order_id, {
        id: row.order_id,
        total_price: Number(row.total_price),
        purchased_at: row.purchased_at,
        items: []
      });
      orders.push(orderMap.get(row.order_id));
    }

    if (row.product_id) {
      orderMap.get(row.order_id).items.push({
        product_id: row.product_id,
        name: row.product_name,
        quantity: row.quantity,
        price_at_purchase: Number(row.price_at_purchase)
      });
    }
  }

  return orders;
}

module.exports = {
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCartItems,
  findCartItem,
  addToCart,
  removeCartItem,
  clearCart,
  getUserById,
  checkoutCart,
  getUserOrders
};
