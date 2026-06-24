const invService = require("../services/inv.service");
const mailService = require("../services/mail.service");

function resolveUserId(req) {
  return req.user?.id || req.body.userId || req.query.userId;
}

function requirePositiveInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    const error = new Error(`${fieldName} must be a positive integer`);
    error.statusCode = 400;
    throw error;
  }
  return number;
}

async function getProducts(req, res, next) {
  try {
    const query = req.query.q || req.query.search || req.query.name;
    const available = req.query.available === "true" ? true : req.query.available === "false" ? false : undefined;
    const category = req.query.category;
    const result = await invService.searchProducts({ query, available, category });
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
}

async function getProduct(req, res, next) {
  try {
    const productId = requirePositiveInteger(req.params.id, "Product ID");
    const product = await invService.getProductById(productId);

    if (!product) {
      return res.status(404).json({ error: "Produkt nicht gefunden" });
    }

    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const { name, description, price, available_quantity, category } = req.body;

    if (!name || price === undefined) {
      const error = new Error("name and price are required");
      error.statusCode = 400;
      throw error;
    }

    const created = await invService.createProduct({
      name,
      description,
      price: Number(price),
      available_quantity: Number(available_quantity) || 0,
      category
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const productId = requirePositiveInteger(req.params.id, "Product ID");
    const fields = {};
    const allowed = ["name", "description", "price", "available_quantity", "category"];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields[key] = key === "price" || key === "available_quantity" ? Number(req.body[key]) : req.body[key];
      }
    }

    if (!Object.keys(fields).length) {
      const error = new Error("No valid product fields provided");
      error.statusCode = 400;
      throw error;
    }

    const updated = await invService.updateProduct(productId, fields);

    if (!updated) {
      return res.status(404).json({ error: "Produkt nicht gefunden" });
    }

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const productId = requirePositiveInteger(req.params.id, "Product ID");
    const deleted = await invService.deleteProduct(productId);

    if (!deleted) {
      return res.status(404).json({ error: "Produkt nicht gefunden" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function getCart(req, res, next) {
  try {
    const userId = requirePositiveInteger(resolveUserId(req), "userId");
    const items = await invService.getCartItems(userId);
    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
}

async function addToCart(req, res, next) {
  try {
    const userId = requirePositiveInteger(resolveUserId(req), "userId");
    const productId = requirePositiveInteger(req.body.productId, "productId");
    const quantity = req.body.quantity ? requirePositiveInteger(req.body.quantity, "quantity") : 1;

    const product = await invService.getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: "Produkt nicht gefunden" });
    }

    const existingCartItem = await invService.findCartItem(userId, productId);
    const totalNewQuantity = (existingCartItem ? existingCartItem.quantity : 0) + quantity;

    if (product.available_quantity < totalNewQuantity) {
      return res.status(400).json({ error: "Produkt ist nicht in ausreichender Menge verfügbar" });
    }

    const cartItem = await invService.addToCart(userId, productId, quantity);
    res.status(201).json(cartItem);
  } catch (error) {
    next(error);
  }
}

async function removeCartItem(req, res, next) {
  try {
    const userId = requirePositiveInteger(resolveUserId(req), "userId");
    const cartItemId = requirePositiveInteger(req.params.id, "cart item ID");

    const removed = await invService.removeCartItem(cartItemId, userId);
    if (!removed) {
      return res.status(404).json({ error: "Warenkorbpos nicht gefunden" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function checkout(req, res, next) {
  try {
    const userId = requirePositiveInteger(resolveUserId(req), "userId");
    const cartItems = await invService.getCartItems(userId);

    if (!cartItems.length) {
      return res.status(400).json({ error: "Der Warenkorb ist leer" });
    }

    const unavailable = cartItems.filter((item) => item.available_quantity < item.quantity);
    if (unavailable.length) {
      return res.status(400).json({
        error: "Einige Produkte sind nicht mehr verfügbar",
        unavailable: unavailable.map((item) => ({ product_id: item.product_id, available_quantity: item.available_quantity }))
      });
    }

    const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderItems = cartItems.map((item) => ({
      product_id: item.product_id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      price_at_purchase: item.price
    }));

    const { orderId } = await invService.checkoutCart(userId, orderItems, totalPrice);
    const user = await invService.getUserById(userId);

    if (user?.email) {
      try {
        await mailService.sendOrderConfirmation({
          to: user.email,
          orderId,
          items: orderItems,
          totalPrice
        });
      } catch (mailError) {
        console.error("E-Mail-Versand fehlgeschlagen:", mailError.message);
      }
    }

    res.status(201).json({ orderId, totalPrice, items: cartItems });
  } catch (error) {
    next(error);
  }
}

async function getOrders(req, res, next) {
  try {
    const userId = requirePositiveInteger(resolveUserId(req), "userId");
    const orders = await invService.getUserOrders(userId);
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCart,
  addToCart,
  removeCartItem,
  checkout,
  getOrders
};
