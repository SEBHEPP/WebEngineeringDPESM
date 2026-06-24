const db = require("../config/db");

async function checkAuth(req, res, next) {
  try {
    const userId = req.headers["x-user-id"] || req.body.userId || req.query.userId;
    if (!userId) {
      return res.status(401).json({
        error: "Authentifizierung erforderlich (userId fehlt)"
      });
    }

    const result = await db.query(
      "SELECT id, email, is_verified, is_admin, is_blocked FROM users WHERE id = $1",
      [Number(userId)]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        error: "Benutzer nicht gefunden"
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = checkAuth;
