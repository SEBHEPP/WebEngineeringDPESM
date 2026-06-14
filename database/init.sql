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