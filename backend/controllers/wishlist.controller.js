// Dennis
const db = require("../config/db");

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

function normalizeText(value, fieldName) {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    throw createError(400, `${fieldName} is required`);
  }

  return value.trim();
}

function normalizeRole(role) {
  const normalizedRole = String(role || "").trim().toLowerCase();

  if (!["read", "write"].includes(normalizedRole)) {
    throw createError(400, "role must be read or write");
  }

  return normalizedRole;
}

function toWishlist(row, items = [], permissions = []) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    items,
    permissions
  };
}

function toItem(row) {
  return {
    productId: row.product_id,
    name: row.name,
    description: row.description,
    price: row.price === null ? null : Number(row.price),
    availableQuantity: row.available_quantity,
    addedAt: row.added_at
  };
}

function toPermission(row) {
  return {
    userId: row.user_id,
    email: row.email,
    role: row.role
  };
}

async function productExists(productId) {
  const result = await db.query("SELECT id FROM products WHERE id = $1", [productId]);

  return Boolean(result.rows[0]);
}

async function userExists(userId) {
  const result = await db.query("SELECT id FROM users WHERE id = $1", [userId]);

  return Boolean(result.rows[0]);
}

async function getWishlistItems(wishlistId) {
  const result = await db.query(
    `SELECT wi.product_id, wi.added_at, p.name, p.description, p.price, p.available_quantity
     FROM wishlist_items wi
     LEFT JOIN products p ON p.id = wi.product_id
     WHERE wi.wishlist_id = $1
     ORDER BY wi.added_at DESC`,
    [wishlistId]
  );

  return result.rows.map(toItem);
}

async function getWishlistPermissions(wishlistId) {
  const result = await db.query(
    `SELECT wp.user_id, u.email, wp.role
     FROM wishlist_permissions wp
     JOIN users u ON u.id = wp.user_id
     WHERE wp.wishlist_id = $1
     ORDER BY wp.role DESC, u.email ASC`,
    [wishlistId]
  );

  return result.rows.map(toPermission);
}

async function createWishlist(req, res, next) {
  const client = await db.pool.connect();
  let transactionStarted = false;

  try {
    const name = normalizeText(req.body.name, "name");
    const description = req.body.description ? String(req.body.description).trim() : null;

    await client.query("BEGIN");
    transactionStarted = true;

    const wishlistResult = await client.query(
      `INSERT INTO wishlists (name, description)
       VALUES ($1, $2)
       RETURNING id, name, description, created_at`,
      [name, description]
    );
    const wishlist = wishlistResult.rows[0];

    await client.query(
      `INSERT INTO wishlist_permissions (wishlist_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [wishlist.id, req.user.id]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    res.status(201).json({
      message: "wishlist created",
      wishlist: toWishlist(wishlist, [], [
        {
          userId: req.user.id,
          email: req.user.email,
          role: "owner"
        }
      ])
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

async function listWishlists(req, res, next) {
  try {
    const result = await db.query(
      `SELECT w.id, w.name, w.description, w.created_at, wp.role
       FROM wishlists w
       JOIN wishlist_permissions wp ON wp.wishlist_id = w.id
       WHERE wp.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );

    res.status(200).json({
      wishlists: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        createdAt: row.created_at,
        role: row.role
      }))
    });
  } catch (error) {
    next(error);
  }
}

async function getWishlistById(req, res, next) {
  try {
    const wishlistId = normalizeId(req.params.id, "wishlistId");
    const result = await db.query(
      "SELECT id, name, description, created_at FROM wishlists WHERE id = $1",
      [wishlistId]
    );
    const wishlist = result.rows[0];

    if (!wishlist) {
      throw createError(404, "wishlist not found");
    }

    const items = await getWishlistItems(wishlistId);
    const permissions = await getWishlistPermissions(wishlistId);

    res.status(200).json({
      wishlist: toWishlist(wishlist, items, permissions)
    });
  } catch (error) {
    next(error);
  }
}

async function addProduct(req, res, next) {
  try {
    const wishlistId = normalizeId(req.params.id, "wishlistId");
    const productId = normalizeId(req.body.productId ?? req.params.productId, "productId");

    if (!(await productExists(productId))) {
      throw createError(404, "product not found");
    }

    await db.query(
      `INSERT INTO wishlist_items (wishlist_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (wishlist_id, product_id) DO NOTHING`,
      [wishlistId, productId]
    );

    res.status(200).json({
      message: "product added to wishlist",
      wishlistId,
      productId
    });
  } catch (error) {
    next(error);
  }
}

async function removeProduct(req, res, next) {
  try {
    const wishlistId = normalizeId(req.params.id, "wishlistId");
    const productId = normalizeId(req.params.productId ?? req.body.productId, "productId");
    const result = await db.query(
      `DELETE FROM wishlist_items
       WHERE wishlist_id = $1 AND product_id = $2
       RETURNING wishlist_id, product_id`,
      [wishlistId, productId]
    );

    if (!result.rows[0]) {
      throw createError(404, "wishlist item not found");
    }

    res.status(200).json({
      message: "product removed from wishlist",
      wishlistId,
      productId
    });
  } catch (error) {
    next(error);
  }
}

async function deleteWishlist(req, res, next) {
  try {
    const wishlistId = normalizeId(req.params.id, "wishlistId");
    const result = await db.query(
      `DELETE FROM wishlists
       WHERE id = $1
       RETURNING id, name, description, created_at`,
      [wishlistId]
    );
    const wishlist = result.rows[0];

    if (!wishlist) {
      throw createError(404, "wishlist not found");
    }

    res.status(200).json({
      message: "wishlist deleted",
      wishlist: toWishlist(wishlist)
    });
  } catch (error) {
    next(error);
  }
}

async function setPermission(req, res, next) {
  try {
    const wishlistId = normalizeId(req.params.id, "wishlistId");
    const userId = normalizeId(req.body.userId ?? req.params.userId, "userId");
    const role = normalizeRole(req.body.role);

    if (req.user.id === userId) {
      throw createError(400, "owner permission cannot be changed here");
    }

    if (!(await userExists(userId))) {
      throw createError(404, "user not found");
    }

    const result = await db.query(
      `INSERT INTO wishlist_permissions (wishlist_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (wishlist_id, user_id)
       DO UPDATE SET role = EXCLUDED.role
       RETURNING wishlist_id, user_id, role`,
      [wishlistId, userId, role]
    );

    res.status(200).json({
      message: "wishlist permission saved",
      permission: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
}

async function removePermission(req, res, next) {
  try {
    const wishlistId = normalizeId(req.params.id, "wishlistId");
    const userId = normalizeId(req.params.userId ?? req.body.userId, "userId");

    const result = await db.query(
      `DELETE FROM wishlist_permissions
       WHERE wishlist_id = $1 AND user_id = $2 AND role <> 'owner'
       RETURNING wishlist_id, user_id, role`,
      [wishlistId, userId]
    );

    if (!result.rows[0]) {
      throw createError(404, "permission not found");
    }

    res.status(200).json({
      message: "wishlist permission removed",
      permission: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addProduct,
  createWishlist,
  deleteWishlist,
  getWishlistById,
  listWishlists,
  removePermission,
  removeProduct,
  setPermission
};
