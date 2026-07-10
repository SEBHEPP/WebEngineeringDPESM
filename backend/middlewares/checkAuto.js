// Sebi
const authorizationService = require("../services/authorization.service");

function resolveOption(option, req) {
  return typeof option === "function" ? option(req) : option;
}

function checkAuto({ resourceType, action, resourceId }) {
  return async function checkAutoMiddleware(req, res, next) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          error: "Authentication required"
        });
      }

      const decision = await authorizationService.checkPermission({
        userId: req.user.id,
        resourceType: resolveOption(resourceType, req),
        resourceId: resourceId ? resolveOption(resourceId, req) : req.params.id,
        action: resolveOption(action, req)
      });

      if (!decision.allowed) {
        return res.status(403).json({
          error: "Forbidden",
          reason: decision.reason
        });
      }

      req.authorizationDecision = decision;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = checkAuto;
