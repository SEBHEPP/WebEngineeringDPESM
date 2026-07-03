const db = require("../config/db");

const ACTION_ALIASES = {
  add: "create",
  add_to_cart: "add_to_cart",
  anpassen: "update",
  bearbeiten: "update",
  berechtigung_setzen: "manage_permissions",
  block: "block",
  blockieren: "block",
  create: "create",
  create_admin: "create_admin",
  delete: "delete",
  edit: "update",
  entfernen: "remove_item",
  entsperren: "unblock",
  erstellen: "create",
  hinzufuegen: "add_item",
  "hinzufügen": "add_item",
  kaufen: "buy",
  lesen: "read",
  list: "read",
  listen: "read",
  loeschen: "delete",
  "löschen": "delete",
  manage_permissions: "manage_permissions",
  manage_users: "manage_users",
  nutzer_verwalten: "manage_users",
  purchase: "buy",
  read: "read",
  remove: "delete",
  remove_item: "remove_item",
  search: "read",
  suchen: "read",
  share: "share",
  sperren: "block",
  teilen: "share",
  unblock: "unblock",
  update: "update",
  view: "read"
};

const RESOURCE_ALIASES = {
  artikel: "product",
  benutzer: "user",
  bestellung: "order",
  order: "order",
  orders: "order",
  product: "product",
  products: "product",
  produkt: "product",
  produkte: "product",
  user: "user",
  users: "user",
  wishlist: "wishlist",
  wishlists: "wishlist",
  wunschliste: "wishlist",
  wunschlisten: "wishlist"
};

function createBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function normalizeAction(action) {
  if (!action) {
    throw createBadRequest("action is required");
  }

  const normalizedAction = String(action).trim().toLowerCase();
  const mappedAction = ACTION_ALIASES[normalizedAction];

  if (!mappedAction) {
    throw createBadRequest(`unsupported action: ${action}`);
  }

  return mappedAction;
}

function normalizeResourceType(resourceType) {
  if (!resourceType) {
    throw createBadRequest("resourceType is required");
  }

  const normalizedResourceType = String(resourceType).trim().toLowerCase();
  const mappedResourceType = RESOURCE_ALIASES[normalizedResourceType];

  if (!mappedResourceType) {
    throw createBadRequest(`unsupported resourceType: ${resourceType}`);
  }

  return mappedResourceType;
}

function normalizeResourceId(resourceId) {
  if (resourceId === undefined || resourceId === null || resourceId === "") {
    return null;
  }

  if (Number.isInteger(resourceId)) {
    return resourceId;
  }

  const digits = String(resourceId).match(/\d+/);

  if (!digits) {
    throw createBadRequest(`invalid resourceId: ${resourceId}`);
  }

  return Number(digits[0]);
}

function normalizeRequiredId(id, fieldName) {
  const normalizedId = normalizeResourceId(id);

  if (!normalizedId) {
    throw createBadRequest(`${fieldName} is required`);
  }

  return normalizedId;
}

function deny(reason, details = {}) {
  return {
    allowed: false,
    reason,
    ...details
  };
}

function allow(reason, details = {}) {
  return {
    allowed: true,
    reason,
    ...details
  };
}

async function getUser(userId) {
  const result = await db.query(
    "SELECT id, email, is_verified, is_admin, is_blocked FROM users WHERE id = $1",
    [userId]
  );

  return result.rows[0] || null;
}

async function getProduct(productId) {
  const result = await db.query(
    "SELECT id, available_quantity FROM products WHERE id = $1",
    [productId]
  );

  return result.rows[0] || null;
}

async function getWishlistRole(wishlistId, userId) {
  const result = await db.query(
    "SELECT role FROM wishlist_permissions WHERE wishlist_id = $1 AND user_id = $2",
    [wishlistId, userId]
  );

  return result.rows[0]?.role || null;
}

async function getOrder(orderId) {
  const result = await db.query(
    "SELECT id, user_id FROM orders WHERE id = $1",
    [orderId]
  );

  return result.rows[0] || null;
}

function createDecisionContext({ user, resourceType, resourceId, action }) {
  return {
    user: {
      id: user.id,
      isAdmin: user.is_admin,
      isVerified: user.is_verified,
      isBlocked: user.is_blocked
    },
    resource: {
      type: resourceType,
      id: resourceId
    },
    action
  };
}

async function decideProductAccess({ user, resourceId, action }) {
  if (["read", "create"].includes(action)) {
    if (action === "create") {
      return deny("admin_required");
    }

    if (!resourceId) {
      return allow("product_list_allowed");
    }

    const product = await getProduct(resourceId);
    return product ? allow("product_read_allowed") : deny("resource_not_found");
  }

  if (["buy", "add_to_cart"].includes(action)) {
    if (!resourceId) {
      return deny("resource_id_required");
    }

    const product = await getProduct(resourceId);

    if (!product) {
      return deny("resource_not_found");
    }

    if (product.available_quantity <= 0) {
      return deny("product_not_available");
    }

    return allow("product_purchase_allowed");
  }

  return deny("admin_required");
}

async function decideWishlistAccess({ user, resourceId, action }) {
  if (action === "create") {
    return allow("wishlist_create_allowed");
  }

  if (!resourceId) {
    return deny("resource_id_required");
  }

  const role = await getWishlistRole(resourceId, user.id);

  if (!role) {
    return deny("wishlist_permission_missing");
  }

  if (action === "read") {
    return allow("wishlist_read_allowed", { role });
  }

  if (["update", "add_item", "remove_item"].includes(action)) {
    return ["owner", "write"].includes(role)
      ? allow("wishlist_write_allowed", { role })
      : deny("wishlist_write_required", { role });
  }

  if (["delete", "share", "manage_permissions"].includes(action)) {
    return role === "owner"
      ? allow("wishlist_owner_allowed", { role })
      : deny("wishlist_owner_required", { role });
  }

  return deny("unsupported_wishlist_action");
}

async function decideUserAccess({ user, resourceId, action }) {
  if (action === "read" && resourceId === user.id) {
    return allow("own_user_read_allowed");
  }

  return deny("admin_required");
}

async function decideOrderAccess({ user, resourceId, action }) {
  if (action !== "read") {
    return deny("unsupported_order_action");
  }

  if (!resourceId) {
    return deny("resource_id_required");
  }

  const order = await getOrder(resourceId);

  if (!order) {
    return deny("resource_not_found");
  }

  return order.user_id === user.id
    ? allow("own_order_read_allowed")
    : deny("own_order_required");
}

async function checkPermission({ userId, resourceType, resourceId, action }) {
  const normalizedUserId = normalizeRequiredId(userId, "userId");
  const normalizedResourceType = normalizeResourceType(resourceType);
  const normalizedAction = normalizeAction(action);
  const normalizedResourceId = normalizeResourceId(resourceId);
  const user = await getUser(normalizedUserId);

  if (!user) {
    return deny("user_not_found", {
      resource: { type: normalizedResourceType, id: normalizedResourceId },
      action: normalizedAction
    });
  }

  const context = createDecisionContext({
    user,
    resourceType: normalizedResourceType,
    resourceId: normalizedResourceId,
    action: normalizedAction
  });

  if (user.is_blocked) {
    return deny("user_blocked", context);
  }

  if (!user.is_verified) {
    return deny("user_not_verified", context);
  }

  if (user.is_admin) {
    return allow("admin_allowed", context);
  }

  let decision;

  if (normalizedResourceType === "product") {
    decision = await decideProductAccess({
      user,
      resourceId: normalizedResourceId,
      action: normalizedAction
    });
  }

  if (normalizedResourceType === "wishlist") {
    decision = await decideWishlistAccess({
      user,
      resourceId: normalizedResourceId,
      action: normalizedAction
    });
  }

  if (normalizedResourceType === "user") {
    decision = await decideUserAccess({
      user,
      resourceId: normalizedResourceId,
      action: normalizedAction
    });
  }

  if (normalizedResourceType === "order") {
    decision = await decideOrderAccess({
      user,
      resourceId: normalizedResourceId,
      action: normalizedAction
    });
  }

  return {
    ...decision,
    ...context
  };
}

module.exports = {
  checkPermission
};
