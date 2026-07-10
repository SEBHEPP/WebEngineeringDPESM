// Sebi
const authorizationService = require("../services/authorization.service");

// Die im Request-Body angegebene userId hat Vorrang, damit die AUTO-1-Prueffläche
// im Admin-Dashboard fuer beliebige Nutzer entscheiden kann (nicht nur den eingeloggten Admin).
function resolveUserId(req) {
  return req.body.userId || req.user?.id;
}

async function checkAuthorization(req, res, next) {
  try {
    const decision = await authorizationService.checkPermission({
      userId: resolveUserId(req),
      resourceType: req.body.resourceType,
      resourceId: req.body.resourceId,
      action: req.body.action
    });

    res.status(200).json(decision);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkAuthorization
};
