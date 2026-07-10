-- Datenbank Setup
-- Dennis

-- USER & AUTHENTIFIZIERUNG
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed-Admin fuer die erste Anmeldung (loest das Henne-Ei-Problem beim Anlegen von Admins)
-- Login:  admin@webshop.dev  /  admin1234
INSERT INTO users (email, password_hash, is_verified, is_admin, is_blocked) VALUES
('admin@webshop.dev', '34423fb89c66a38d67e212530895e1fa:c4c46ada6eb46df9431a97bc5ae00f3aa0ffcd2ca743085aaa353b1ce1eb89d2868b84f16e178bfe17b4e1f3970d97cf06ce876d6ba25ba14ee696add9d50caf', TRUE, TRUE, FALSE);

-- INVENTARSYSTEM (PRODUKTE)
-- Ein Produkt enthält mindestens folgende Angaben (ID, Name, Beschreibung, Preis, verfügbare Menge)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    available_quantity INT NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Beispielprodukte inkl. Produktbilder. Zwei Produkte bewusst mit Bestand 0 (Status "nicht verfuegbar").
INSERT INTO products (name, description, price, available_quantity, image_url) VALUES
('Anzug Milano', 'Moderner Slim-Fit Anzug in Anthrazit, Schurwolle.', 249.90, 14, 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?auto=format&fit=crop&w=800&q=70'),
('Anzug Torino', 'Warmes Braun mit cleanem Business-Look.', 279.90, 8, 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=70'),
('Sakko Roma', 'Einzelnes Sakko fuer flexible Kombinationen.', 149.90, 10, 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=70'),
('Anzug Berlin', 'Minimalistisch, alltagstauglich, dunkelblau.', 229.90, 5, 'https://images.unsplash.com/photo-1621072156002-e2fccdc0b176?auto=format&fit=crop&w=800&q=70'),
('Hemd Oxford Weiss', 'Klassisches Oxfordhemd fuer Business und Freizeit.', 59.90, 40, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=70'),
('Hemd Business Hellblau', 'Buegelleichtes Hemd mit Kentkragen.', 54.90, 25, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=70'),
('Lederschuh Noir', 'Schlichter schwarzer Oxford aus Rindsleder.', 129.90, 12, 'https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?auto=format&fit=crop&w=800&q=70'),
('Lederschuh Cognac Derby', 'Braunes Derby fuer smart-casual Looks.', 139.90, 0, 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?auto=format&fit=crop&w=800&q=70'),
('Guertel Cognac', 'Vollleder-Guertel mit dezenter Schnalle.', 39.90, 30, 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=800&q=70'),
('Seidenkrawatte Bordeaux', 'Handgefertigte Krawatte aus reiner Seide.', 34.90, 22, 'https://images.unsplash.com/photo-1589756823695-278bc923f962?auto=format&fit=crop&w=800&q=70'),
('Einstecktuch Set', 'Drei Einstecktuecher in gedeckten Toenen.', 19.90, 18, 'https://images.unsplash.com/photo-1607344645866-009c320b63e0?auto=format&fit=crop&w=800&q=70'),
('Pflegeset Barber', 'Kamm, Bartoel und Pflege fuer den Alltag.', 34.90, 16, 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=800&q=70'),
('Schuhpflege Set', 'Buerste, Creme und Tuch fuer Lederschuhe.', 24.90, 20, 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=70'),
('Strickpullover Sand', 'Warmer Merino-Pullover fuer Casual-Outfits.', 79.90, 0, 'https://images.unsplash.com/photo-1610652492500-ded49ceeb378?auto=format&fit=crop&w=800&q=70'),
('Mantel Wool Camel', 'Eleganter Wollmantel in Camel fuer die kalte Jahreszeit.', 319.90, 6, 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=800&q=70');

-- WUNSCHLISTEN-SERVICE
-- Eine Wunschliste hat mindestens folgende Informationen (Name, Beschreibung, enthaltene Produkte, Besitzer, Berechtigte).
CREATE TABLE wishlists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verknüpfungstabelle: Welche Produkte sind in welcher Wunschliste?
CREATE TABLE wishlist_items (
    wishlist_id INT REFERENCES wishlists(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (wishlist_id, product_id)
);

-- Verknüpfungstabelle: Berechtigungen für die Wunschlisten
-- Es gibt drei Arten von Berechtigung: 1- Leseberechtigung 2- Schreibeberechtigung 3- Besitzer
CREATE TABLE wishlist_permissions (
    wishlist_id INT REFERENCES wishlists(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'read', 'write')),
    PRIMARY KEY (wishlist_id, user_id)
);

-- EINKAUFSHISTORIE (INV-7)
-- Eine Historie der persönlichen Einkäufe soll dargestellt werden können
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    total_price DECIMAL(10,2) NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    quantity INT NOT NULL,
    price_at_purchase DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (order_id, product_id)
);
