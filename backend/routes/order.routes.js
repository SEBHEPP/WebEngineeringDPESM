// Felix
const express = require("express"); // Für das Routing (HTTP-Anfragen weiterleiten)

const orderController = require("../controllers/order.controller"); // Enthält die Logik für Bestellvorgänge
const { authenticate } = require("../controllers/auth.controller"); // Prüft Tokens/Session, schützt Routen vor unbefugtem Zugriff
const checkAuto = require("../middlewares/checkAuto"); // Für die Rechtsprüfung

const router = express.Router();  // Leeres Router-Objekt, um die Endpunkte zu definieren

// Neue Bestellung anlegen (nur für eingeloggte Nutzer)
router.post("/", authenticate, orderController.createOrder);

// Bestellung beim Checkout anlegen (nur für eingeloggte Nutzer)
router.post("/checkout", authenticate, orderController.createOrder);

// Alle Bestellungen des Nutzers abrufen (nur für eingeloggte Nutzer)
router.get("/", authenticate, orderController.listOrders);

// Einzelne Bestellung abrufen (Rechteprüfung über checkAuto)
router.get(
  "/:id",
  checkAuto({
    resourceType: "order",
    action: "read"
  }),
  orderController.getOrderById
);

module.exports = router;
