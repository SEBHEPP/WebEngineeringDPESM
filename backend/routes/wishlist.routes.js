// Dennis
const express = require("express");

const wishlistController = require("../controllers/wishlist.controller");
const { authenticate } = require("../controllers/auth.controller");
const checkAuto = require("../middlewares/checkAuto");

// authenticate: prüft ob der Nutzer eingeloggt ist (Session-Cookie)
// checkAuto: prüft zusätzlich ob der Nutzer die nötige Berechtigung für diese Liste hat
const router = express.Router();

// Alle eigenen Wunschlisten auflisten (als Owner oder mit geteiltem Zugriff)
router.get("/", authenticate, wishlistController.listWishlists);

// Persönliche Wunschliste abrufen, wird automatisch angelegt falls noch keine existiert
router.get("/me", authenticate, wishlistController.getMyWishlist);

// Neue Wunschliste erstellen
router.post(
  "/",
  checkAuto({
    resourceType: "wishlist",
    action: "create"
  }),
  wishlistController.createWishlist
);

// Eine bestimmte Wunschliste per ID abrufen (nur wenn Leseberechtigung vorhanden)
router.get(
  "/:id",
  checkAuto({
    resourceType: "wishlist",
    action: "read"
  }),
  wishlistController.getWishlistById
);

// Produkt zu einer Wunschliste hinzufügen (benötigt write- oder owner-Berechtigung)
router.post(
  "/:id/items",
  checkAuto({
    resourceType: "wishlist",
    action: "add_item"
  }),
  wishlistController.addProduct
);

// Alias für /:id/items (alternative URL)
router.post(
  "/:id/products",
  checkAuto({
    resourceType: "wishlist",
    action: "add_item"
  }),
  wishlistController.addProduct
);

// Produkt aus einer Wunschliste entfernen
router.delete(
  "/:id/items/:productId",
  checkAuto({
    resourceType: "wishlist",
    action: "remove_item"
  }),
  wishlistController.removeProduct
);

// Alias für /:id/items/:productId 
router.delete(
  "/:id/products/:productId",
  checkAuto({
    resourceType: "wishlist",
    action: "remove_item"
  }),
  wishlistController.removeProduct
);

// Berechtigung für einen anderen Nutzer setzen oder aktualisieren (nur Owner)
router.post(
  "/:id/permissions",
  checkAuto({
    resourceType: "wishlist",
    action: "manage_permissions"
  }),
  wishlistController.setPermission
);

// Berechtigung per PUT aktualisieren (z.B. read -> write)
router.put(
  "/:id/permissions/:userId",
  checkAuto({
    resourceType: "wishlist",
    action: "manage_permissions"
  }),
  wishlistController.setPermission
);

// Berechtigung eines Nutzers entfernen
router.delete(
  "/:id/permissions/:userId",
  checkAuto({
    resourceType: "wishlist",
    action: "manage_permissions"
  }),
  wishlistController.removePermission
);

// Gesamte Wunschliste löschen (nur Owner)
router.delete(
  "/:id",
  checkAuto({
    resourceType: "wishlist",
    action: "delete"
  }),
  wishlistController.deleteWishlist
);

module.exports = router;
