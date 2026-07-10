// Felix
const express = require("express"); // Für das Routing (HTTP-Anfragen weiterleiten)

const productController = require("../controllers/product.controller"); // Für die Datenbank-Logik der Produkte
const checkAuto = require("../middlewares/checkAuto"); // Für die Rechteprüfung

const router = express.Router(); //  leeres Routen-Objekt, um die Pfade zu definieren

router.get("/", productController.listProducts); // Alle Produkte anzeigen
router.get("/search", productController.listProducts); // Nach Produkten suchen
router.get("/:id", productController.getProductById); // Produkt nach ID anzeigen

// Neues Produkt anlegen (Nur für Admins)
router.post(
  "/",
  checkAuto({
    resourceType: "product",
    action: "create"
  }),
  productController.createProduct 
);

// Produkt teilweise aktualisieren (Nur für Admins erlaubt)
router.patch(
  "/:id",
  checkAuto({
    resourceType: "product",
    action: "update"
  }),
  productController.updateProduct 
);

// Produkt überschreiben (Nur für Admins)
router.put(
  "/:id",
  checkAuto({
    resourceType: "product",
    action: "update"
  }),
  productController.updateProduct 
);

// Produkt löschen (Nur für Admins)
router.delete(
  "/:id",
  checkAuto({
    resourceType: "product",
    action: "delete"
  }),
  productController.deleteProduct 
);

module.exports = router;
