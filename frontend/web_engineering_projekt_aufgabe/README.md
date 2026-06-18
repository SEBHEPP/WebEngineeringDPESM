# Gentleman Shop Frontend

> Die vollständige Planung der UI mit Seitenstruktur, Farbschema, Responsive-Konzept und Verlinkungsdiagrammen befindet sich in [`docs/UI-Planung.md`](docs/UI-Planung.md).

Statisches HTML/CSS-Frontend für das Web-Engineering-Projekt.

Enthalten:
- Startseite mit Slideshow, Produkten, Kollektionen
- Produktübersicht
- Kollektion
- Produktdetailseite
- Warenkorb
- Checkout
- Kaufhistorie
- Login, Registrierung, Verifizierung, Magic Login
- Wunschlistenübersicht und Detailseite
- Admin-Dashboard, Produktverwaltung, Userverwaltung
- Rechtliche Seiten im Footer

Start:
1. ZIP entpacken
2. Ordner in VS Code öffnen
3. index.html mit Live Server öffnen

- Eigene Kategorieseiten: Anzüge, Hemden, Schuhe, Zubehör, Pflege
- Header-Suche als eigene Suchseite

## Schnittstellen für Teammitglieder

Das Projekt bleibt bewusst nur HTML/CSS. Die Formulare, Tabellen und Buttons sind als UI-Schnittstellen vorbereitet:

- Inventarsystem: `pages/shop/products.html`, `pages/shop/product-detail.html`, `pages/shop/cart.html`, `pages/shop/checkout.html`, `pages/shop/orders.html`
- Admin-Produkte: `pages/admin/products.html` mit Suche per Produkt-ID, Erstellen, Bearbeiten und Löschen
- Wunschlisten: `pages/wishlist/wishlists.html` und `pages/wishlist/wishlist-detail.html` mit Erstellen, Bearbeiten, Löschen, Teilen und Berechtigungen
- Authentifizierung: `pages/auth/login.html`, `register.html`, `verify.html`, `magic-login.html`
- Autorisierung: Prüffläche im `pages/admin/dashboard.html`
- User-Verwaltung: `pages/admin/users.html` mit User-ID-Suche, Sperren, Entsperren, Löschen und Admin-Erstellung
