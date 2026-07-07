// Felix
const nodemailer = require("nodemailer");

const db = require("../config/db");
const authorizationService = require("../services/authorization.service");

let mailTransporter;

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeId(id, fieldName = "id") {
  const normalizedId = Number(id);

  if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
    throw createError(400, `valid ${fieldName} is required`);
  }

  return normalizedId;
}

function normalizeQuantity(quantity) {
  const normalizedQuantity = Number(quantity);

  if (!Number.isInteger(normalizedQuantity) || normalizedQuantity <= 0) {
    throw createError(400, "quantity must be a positive number");
  }

  return normalizedQuantity;
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw createError(400, "items are required");
  }

  const mergedItems = new Map();

  for (const item of items) {
    const productId = normalizeId(item.productId ?? item.product_id, "productId");
    const quantity = normalizeQuantity(item.quantity);
    const currentQuantity = mergedItems.get(productId) || 0;

    mergedItems.set(productId, currentQuantity + quantity);
  }

  return Array.from(mergedItems.entries()).map(([productId, quantity]) => ({
    productId,
    quantity
  }));
}

function getMailTransporter() {
  if (!mailTransporter) {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "maildev",
      port: Number(process.env.SMTP_PORT || 1025),
      secure: false
    });
  }

  return mailTransporter;
}

function getMailFrom() {
  return process.env.SMTP_FROM || "no-reply@webshop.local";
}

function toOrder(row, items = []) {
  return {
    id: row.id,
    userId: row.user_id,
    totalPrice: Number(row.total_price),
    purchasedAt: row.purchased_at,
    items
  };
}

function toOrderItem(row) {
  return {
    productId: row.product_id,
    name: row.name,
    quantity: row.quantity,
    priceAtPurchase: Number(row.price_at_purchase),
    lineTotal: Number(row.price_at_purchase) * row.quantity
  };
}

async function sendOrderConfirmation(user, order) {
  const lines = order.items
    .map((item) => `${item.quantity}x ${item.name} - ${item.lineTotal.toFixed(2)} EUR`)
    .join("\n");

  await getMailTransporter().sendMail({
    from: getMailFrom(),
    to: user.email,
    subject: `Gentleman Shop - Bestellung #${order.id}`,
    text: `Danke fuer deine Bestellung.\n\n${lines}\n\nSumme: ${order.totalPrice.toFixed(2)} EUR`,
    html: `
      <h2>Gentleman Shop</h2>
      <p>Danke fuer deine Bestellung.</p>
      <ul>
        ${order.items.map((item) => `<li>${item.quantity}x ${item.name} - ${item.lineTotal.toFixed(2)} EUR</li>`).join("")}
      </ul>
      <p><strong>Summe: ${order.totalPrice.toFixed(2)} EUR</strong></p>
    `
  });
}

async function checkProductPermission(userId, productId) {
  const decision = await authorizationService.checkPermission({
    userId,
    resourceType: "product",
    resourceId: productId,
    action: "buy"
  });

  if (!decision.allowed) {
    throw createError(403, `product ${productId}: ${decision.reason}`);
  }
}

async function createOrder(req, res, next) {
  const client = await db.pool.connect();
  let transactionStarted = false;

  try {
    const user = req.user;
    const items = normalizeItems(req.body.items);

    for (const item of items) {
      await checkProductPermission(user.id, item.productId);
    }

    await client.query("BEGIN");
    transactionStarted = true;

    const productIds = items.map((item) => item.productId);
    const productResult = await client.query(
      `SELECT id, name, price, available_quantity
       FROM products
       WHERE id = ANY($1::int[])
       FOR UPDATE`,
      [productIds]
    );

    if (productResult.rows.length !== productIds.length) {
      throw createError(404, "one or more products were not found");
    }

    const productsById = new Map(productResult.rows.map((product) => [product.id, product]));
    let totalPrice = 0;
    const orderItems = [];

    for (const item of items) {
      const product = productsById.get(item.productId);

      if (product.available_quantity < item.quantity) {
        throw createError(409, `${product.name} is not available in this quantity`);
      }

      const priceAtPurchase = Number(product.price);
      totalPrice += priceAtPurchase * item.quantity;
      orderItems.push({
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        priceAtPurchase,
        lineTotal: priceAtPurchase * item.quantity
      });
    }

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total_price)
       VALUES ($1, $2)
       RETURNING id, user_id, total_price, purchased_at`,
      [user.id, totalPrice]
    );
    const order = orderResult.rows[0];

    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.productId, item.quantity, item.priceAtPurchase]
      );

      await client.query(
        `UPDATE products
         SET available_quantity = available_quantity - $1
         WHERE id = $2`,
        [item.quantity, item.productId]
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    const orderResponse = toOrder(order, orderItems);
    let emailStatus = "sent";

    try {
      await sendOrderConfirmation(user, orderResponse);
    } catch (mailError) {
      emailStatus = "failed";
    }

    res.status(201).json({
      message: "order created",
      confirmationEmail: emailStatus,
      order: orderResponse
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    next(error);
  } finally {
    client.release();
  }
}

async function listOrders(req, res, next) {
  try {
    const orderResult = await db.query(
      `SELECT id, user_id, total_price, purchased_at
       FROM orders
       WHERE user_id = $1
       ORDER BY purchased_at DESC`,
      [req.user.id]
    );
    const orderIds = orderResult.rows.map((order) => order.id);
    const itemsByOrderId = new Map();

    if (orderIds.length > 0) {
      const itemResult = await db.query(
        `SELECT oi.order_id, oi.product_id, p.name, oi.quantity, oi.price_at_purchase
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ANY($1::int[])
         ORDER BY oi.product_id ASC`,
        [orderIds]
      );

      for (const row of itemResult.rows) {
        const items = itemsByOrderId.get(row.order_id) || [];
        items.push(toOrderItem(row));
        itemsByOrderId.set(row.order_id, items);
      }
    }

    res.status(200).json({
      orders: orderResult.rows.map((order) => toOrder(order, itemsByOrderId.get(order.id) || []))
    });
  } catch (error) {
    next(error);
  }
}

async function getOrderById(req, res, next) {
  try {
    const orderId = normalizeId(req.params.id, "orderId");
    const orderResult = await db.query(
      `SELECT id, user_id, total_price, purchased_at
       FROM orders
       WHERE id = $1`,
      [orderId]
    );
    const order = orderResult.rows[0];

    if (!order) {
      throw createError(404, "order not found");
    }

    const itemResult = await db.query(
      `SELECT oi.product_id, p.name, oi.quantity, oi.price_at_purchase
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.product_id ASC`,
      [orderId]
    );

    res.status(200).json({
      order: toOrder(order, itemResult.rows.map(toOrderItem))
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrder,
  getOrderById,
  listOrders
};
