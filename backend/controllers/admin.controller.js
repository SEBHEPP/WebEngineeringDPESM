const db = require("../config/db");

// Liefert Gesamtzahlen fuer die Admin-Dashboard-Kacheln
async function getStats(req, res, next) {
  try {
    const [products, users, orders, wishlists] = await Promise.all([
      db.query("SELECT COUNT(*) FROM products"),
      db.query("SELECT COUNT(*) FROM users"),
      db.query("SELECT COUNT(*) FROM orders"),
      db.query("SELECT COUNT(*) FROM wishlists")
    ]);

    res.status(200).json({
      products: Number(products.rows[0].count),
      users: Number(users.rows[0].count),
      orders: Number(orders.rows[0].count),
      wishlists: Number(wishlists.rows[0].count)
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStats
};
