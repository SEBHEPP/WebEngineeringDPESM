# Mockup

## Ziel der Oberfläche (UI)

Der Gentleman-Shop soll sauber, ruhig und hochwertig wirken. Die Seite soll nicht wie eine Demo aussehen, sondern wie ein kleiner echter Onlineshop für Herrenmode.

Wichtige Designziele:

- klare Navigation
- große Produktflächen
- warme Farben
- viel Weißraum
- gut erkennbare Buttons
- einfache Bedienung auf Desktop und Handy

## Grundaufbau der Webseiten

Die meisten Seiten folgen demselben Grundaufbau.

- Topbar
- Header
- Hauptbereich
- Footer

### Startseite

Die Startseite soll direkt zeigen, worum es geht: hochwertiger Gentleman-Shop.

- Hero / Slideshow als erster Blickfang
- klare Call-to-Action Buttons
- Kategorien für schnelle Orientierung
- Produkt-Highlights
- Trust-Elemente wie Versand und Qualität
- Newsletter-Bereich

![Skizze Startseite](mockups/startseite.svg)

### Shop- und Kategorie-Seiten

Diese Seiten sind für das Stöbern und Suchen gedacht.

- Überschrift mit kurzer Beschreibung
- Suchfeld
- Preis-Sortierung
- Produktkarten mit Bild, Name, Preis und Button
- Desktop: mehrere Spalten
- Mobile: eine Spalte

![Skizze Produktübersicht](mockups/produktuebersicht.svg)

### Produktdetailseite

Die Detailseite soll genug Informationen geben, damit man kaufen kann.

- großes Produktbild
- Produktname
- Beschreibung
- Preis
- Lagerbestand
- Warenkorb-Button
- Wunschlisten-Button
- Versandhinweise

![Skizze Produktdetailseite](mockups/produktdetail.svg)

### Warenkorb und Checkout

Der Kaufprozess soll möglichst klar sein.

- Warenkorb links mit Produkten
- Zusammenfassung rechts
- Checkout mit Bestellübersicht
- klare Fehlermeldungen, falls etwas fehlt
- nach Bestellung Weiterleitung zur Historie

![Skizze Warenkorb und Checkout](mockups/warenkorb-checkout.svg)

### Account und Wunschlisten

Dieser Bereich ist für eingeloggte User.

- eigene Wunschliste
- Produkte entfernen
- Wunschliste teilen
- geteilte Wunschlisten anzeigen
- Bestellhistorie erreichen

![Skizze Account und Wunschliste](mockups/account-wunschliste.svg)

### Admin-Bereich

Der Admin-Bereich ist sachlicher als der normale Shop.

- Dashboard als Einstieg
- Produktverwaltung
- Userverwaltung
- Tabellen für schnelle Übersicht
- Formulare für neue oder bearbeitete Daten

![Skizze Admin-Bereich](mockups/admin.svg)

## Verlinkung zwischen den Webseiten

```mermaid
flowchart TD
    A["Startseite<br/>index.html"]

    A --> B["Alle Produkte<br/>pages/shop/products.html"]
    A --> C["Kollektionen<br/>pages/shop/collection.html"]
    A --> D["Anzüge<br/>pages/shop/anzuege.html"]
    A --> E["Hemden<br/>pages/shop/hemden.html"]
    A --> F["Schuhe<br/>pages/shop/schuhe.html"]
    A --> G["Zubehör<br/>pages/shop/zubehoer.html"]
    A --> H["Pflege<br/>pages/shop/pflege.html"]
    A --> I["Login<br/>pages/auth/login.html"]
    A --> J["Warenkorb<br/>pages/shop/cart.html"]

    B --> K["Produktdetail<br/>pages/shop/product-detail.html"]
    C --> D
    C --> E
    C --> F
    C --> G
    C --> H
    D --> K
    E --> K
    F --> K
    G --> K
    H --> K

    K --> J
    K --> L["Wunschliste<br/>pages/wishlist/wishlists.html"]

    J --> M["Checkout<br/>pages/shop/checkout.html"]
    M --> N["Bestellungen<br/>pages/shop/orders.html"]

    I --> O["Registrieren<br/>pages/auth/register.html"]
    I --> P["Magic Login<br/>pages/auth/magic-login.html"]
    O --> Q["E-Mail verifizieren<br/>pages/auth/verify.html"]
    P --> A
    Q --> I

    L --> R["Wunschlisten-Detail<br/>pages/wishlist/wishlist-detail.html"]
    L --> N

    A --> S["Kontakt<br/>pages/legal/kontakt.html"]
    A --> T["Versand<br/>pages/legal/versand.html"]
    A --> U["Impressum / Datenschutz / AGB / Widerruf"]

    V["Admin-Dashboard<br/>pages/admin/dashboard.html"] --> W["Produktverwaltung<br/>pages/admin/products.html"]
    V --> X["Userverwaltung<br/>pages/admin/users.html"]
```

## Farbschema

Das Farbschema orientiert sich an Gentleman-Mode: warm, ruhig und hochwertig. Braun wirkt bodenständig und vertraut, Gold-/Camel-Töne wirken etwas edler. Cremeweiß und Weiß sorgen für genug Ruhe und Lesbarkeit. Anthrazit wird für Text und Kontrast verwendet.

| Farbe | Beispiel | Verwendung |
| --- | --- | --- |
| `#22201e` | <span style="display:inline-block;width:18px;height:18px;background:#22201e;border:1px solid #ccc"></span> | Haupttext / Anthrazit |
| `#35271f` | <span style="display:inline-block;width:18px;height:18px;background:#35271f;border:1px solid #ccc"></span> | Dunkelbraun / starke Akzente |
| `#785b43` | <span style="display:inline-block;width:18px;height:18px;background:#785b43;border:1px solid #ccc"></span> | Braun / Buttons |
| `#bd9b77` | <span style="display:inline-block;width:18px;height:18px;background:#bd9b77;border:1px solid #ccc"></span> | Camel / goldener Akzent |
| `#f3ede4` | <span style="display:inline-block;width:18px;height:18px;background:#f3ede4;border:1px solid #ccc"></span> | Creme / Hintergrund |
| `#fbf9f5` | <span style="display:inline-block;width:18px;height:18px;background:#fbf9f5;border:1px solid #ccc"></span> | Papierweiß / Flächen |

## Responsive Planung

Desktop:

- breite Navigation
- Produktkarten in mehreren Spalten
- Warenkorb links und Zusammenfassung rechts
- Admin-Tabellen übersichtlich nebeneinander

Mobile:

- Inhalte werden einspaltig
- Karten laufen untereinander
- Tabellen können horizontal scrollen
- Header bleibt schmal und bricht nicht aus
- Footer wird untereinander gestapelt
