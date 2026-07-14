# Benutzerhandbuch

Dieses Benutzerhandbuch beschreibt kurz, wie normale User und Admins den Gentleman-Shop benutzen. Es ist bewusst knapp gehalten, damit man die wichtigsten Funktionen schnell findet.

## 1. Normale User

### Startseite benutzen

Die Startseite ist der Einstieg in den Shop. Von dort kommt man direkt zu den wichtigsten Bereichen.

- Kategorien ansehen
- Produkt-Highlights ansehen
- über die Navigation in den Shop wechseln
- über die Suche nach Produkten suchen
- Login oder Warenkorb öffnen

### Produkte ansehen

Im Shop kann man die Produkte nach Kategorien durchsuchen.

- Kategorie auswählen: Anzüge, Hemden, Schuhe, Zubehör oder Pflege
- Produktübersicht öffnen
- Suchfeld benutzen
- nach Preis aufsteigend oder absteigend sortieren
- Produktkarte anklicken, um Details zu sehen

### Produktdetail öffnen

Durch Klick auf ein Produkt kommt man auf die Detailseite. Dort sieht man:

- Produktbild
- Name und Beschreibung
- Preis
- Lagerbestand
- Button für den Warenkorb
- Button für die Wunschliste

### Warenkorb benutzen

Der Warenkorb sammelt die Produkte, die später gekauft werden sollen.

- verfügbares Produkt in den Warenkorb legen
- Produktbild, Name, Menge und Preis prüfen
- Produkt bei Bedarf wieder entfernen
- Gesamtsumme ansehen
- mit "Zur Kasse" zum Checkout gehen

### Bestellung abschließen

Im Checkout wird die Bestellung nochmal zusammengefasst. Danach wird der Kauf gespeichert.

- Warenkorb prüfen
- Bestellübersicht kontrollieren
- Lieferdaten prüfen
- Bestellung absenden
- danach zur Bestellhistorie wechseln
- Kaufbestätigung in Maildev prüfen

### Registrierung und Login

Ein Account wird benötigt, damit man bestellen und Wunschlisten nutzen kann.

- mit E-Mail und Passwort registrieren
- Bestätigungslink in Maildev öffnen
- danach mit Passwort einloggen
- alternativ Magic Login nutzen
- Magic Login Code oder Link aus Maildev verwenden
- nach dem Login bleiben User über die Session angemeldet

### Wunschliste benutzen

In der Wunschliste können Produkte gespeichert und geteilt werden.

- Produkt auf der Detailseite zur Wunschliste hinzufügen
- eigene Wunschliste im Profil ansehen
- Produkte aus der Wunschliste entfernen
- Wunschliste per Link teilen
- anderen Usern Leserecht oder Schreibrecht geben
- geteilte Wunschlisten im Profilbereich öffnen

### Bestellhistorie ansehen

Nach einer Bestellung kann der User seine bisherigen Käufe ansehen.

- Seite "Bestellungen" öffnen
- Bestellnummer prüfen
- Datum ansehen
- Anzahl der Artikel ansehen
- Gesamtsumme kontrollieren

## 2. Admins

### Admin Login

Admins melden sich wie normale User an. Wenn der Account Admin-Rechte hat, erscheint ein Link zum Admin-Dashboard.

- mit Admin-Mail einloggen
- Admin-Dashboard öffnen
- Produktverwaltung oder Userverwaltung auswählen

### Dashboard

Das Dashboard ist die Startseite für Admin-Funktionen.

- Übersicht über den Verwaltungsbereich
- Link zur Produktverwaltung
- Link zur Userverwaltung
- einfacher Testbereich für Autorisierung

### Produkte verwalten

Admins können die Produktdaten des Shops bearbeiten.

- Produkte suchen
- neues Produkt erstellen
- bestehendes Produkt bearbeiten
- Preis anpassen
- Beschreibung anpassen
- verfügbare Menge ändern
- Bild-URL pflegen
- Produkt löschen

Normale User dürfen diese Funktionen nicht benutzen.

### User verwalten

Admins können User-Accounts verwalten.

- User per ID oder E-Mail suchen
- User sperren
- User entsperren
- User löschen
- neuen Admin-Account erstellen

Ein gesperrter User kann sich nicht mehr normal anmelden oder geschützte Aktionen ausführen.

## 3. Kurze Testanleitung

Das Projekt wird lokal mit Docker gestartet.

```text
Webshop: http://localhost:3000
Maildev: http://localhost:1080
Healthcheck: http://localhost:3000/api/health
```

Test-Admin:

```text
E-Mail: admin@webshop.dev
Passwort: admin1234
```

Sinnvoller Testablauf:

- Webshop starten
- normalen User registrieren
- Maildev öffnen und E-Mail bestätigen
- einloggen
- Produkt in Warenkorb legen
- Bestellung abschließen
- Wunschliste testen
- als Admin einloggen
- Produktverwaltung testen
- Userverwaltung testen
