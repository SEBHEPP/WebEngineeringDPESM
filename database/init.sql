-- Datenbank Setup
-- Erstellt von: Dennis

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

-- INVENTARSYSTEM (PRODUKTE)
-- Ein Produkt enthält mindestens folgende Angaben (ID, Name, Beschreibung, Preis, verfügbare Menge)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    available_quantity INT NOT NULL DEFAULT 0,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- WARENKORB
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, product_id)
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
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    quantity INT NOT NULL,
    price_at_purchase DECIMAL(10,2) NOT NULL
);

-- SEED DATA
-- Seed Users (Normal user = ID 1, Admin user = ID 2)
INSERT INTO users (id, email, password_hash, is_verified, is_admin, is_blocked) VALUES
(1, 'user@webshop.dev', '$2b$10$xyzFakeHashForDevelopmentPurposeOnly', TRUE, FALSE, FALSE),
(2, 'admin@webshop.dev', '$2b$10$xyzFakeHashForDevelopmentPurposeOnly', TRUE, TRUE, FALSE);

-- Reset product sequence after manual insertion if any, but since we use auto-incrementing serial for seeds, we can let it insert automatically.
-- We seed products with explicit IDs to make it easier for testing and consistency.
INSERT INTO products (id, name, description, price, available_quantity, category) VALUES
(1, 'Anzug Milano', 'Moderner Schnitt in Anthrazit.', 249.90, 14, 'anzuege'),
(2, 'Anzug Torino', 'Warmes Braun mit cleanem Look.', 279.90, 8, 'anzuege'),
(3, 'Sakko Roma', 'Einzelnes Sakko für flexible Kombinationen.', 149.90, 12, 'anzuege'),
(4, 'Anzug Berlin', 'Minimalistisch und sehr alltagstauglich.', 229.90, 10, 'anzuege'),
(5, 'Weste Classic', 'Elegantes Layering für formelle Outfits.', 69.90, 15, 'anzuege'),
(6, 'Anzug Slim Noir', 'Dunkler Look für Abend und Events.', 299.90, 5, 'anzuege'),
(7, 'Hemd Oxford', 'Klassisches Hemd für Business und Freizeit.', 59.90, 25, 'hemden'),
(8, 'Hemd Modern Fit', 'Leicht taillierter Schnitt in hellblau.', 49.90, 30, 'hemden'),
(9, 'Hemd Premium Silk', 'Edles Hemd mit Seidenanteil.', 89.90, 15, 'hemden'),
(10, 'Lederschuh Noir', 'Schlichter Schuh für elegante Looks.', 129.90, 18, 'schuhe'),
(11, 'Oxford Brogue', 'Klassisch gemusterter Lederschuh.', 149.90, 10, 'schuhe'),
(12, 'Chelsea Boot Smoke', 'Eleganter Stiefel in dunklem Wildleder.', 169.90, 0, 'schuhe'),
(13, 'Gürtel Cognac', 'Warmes Leder als dezenter Akzent.', 39.90, 40, 'zubehoer'),
(14, 'Krawatte Silk Blue', 'Feine Seidenkrawatte in Marineblau.', 29.90, 50, 'zubehoer'),
(15, 'Manschettenknöpfe Gold', 'Elegante Manschettenknöpfe mit Gold-Finish.', 49.90, 20, 'zubehoer'),
(16, 'Pflegeset Barber', 'Kamm, Bartöl und Pflege für den Alltag.', 34.90, 30, 'pflege'),
(17, 'Schuhcreme Premium', 'Hochwertige Pflege für Glattleder.', 14.90, 45, 'pflege'),
(18, 'Bartöl Cedarwood', 'Duftendes Pflegeöl für den Bart.', 19.90, 22, 'pflege');

-- Synchronize sequence values so that future inserts don't collide
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));