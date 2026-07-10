// Sebi
const authorizationService = require("../services/authorization.service");

function resolveUserId(req) {
  return req.user?.id || req.body.userId;
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
