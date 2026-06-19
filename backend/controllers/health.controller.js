const db = require("../config/db");

async function getHealth(req, res) {
  try {
    const result = await db.query("SELECT NOW() AS now");

    res.status(200).json({
      status: "ok",
      service: "backend",
      database: "connected",
      time: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      service: "backend",
      database: "not_connected",
      message: error.message
    });
  }
}

module.exports = {
  getHealth
};
