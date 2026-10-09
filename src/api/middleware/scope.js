// src/api/middleware/scope.js
// Small middleware helpers for API-key scoping.

/**
 * requireScope — enforce that a scoped key may only reach its own session.
 *
 * - If req.apiKeyScope is null/undefined (global key or auth-disabled) → pass through.
 * - If req.params.sessionId === req.apiKeyScope → pass through.
 * - Otherwise → 403.
 *
 * Apply to every /:sessionId/… route EXCEPT GET / and POST /start.
 *
 * @type {import('express').RequestHandler}
 */
export function requireScope(req, res, next) {
    const scope = req.apiKeyScope;
    if (!scope) return next(); // global key or auth disabled
    if (req.params.sessionId === scope) return next();
    return res.status(403).json({
        success: false,
        message: "Forbidden: this API key is not scoped to that session.",
    });
}

/**
 * requireGlobalKey — allow only the global (env) key or auth-disabled mode.
 *
 * A scoped (device) key MUST NOT reach key-management routes.
 *
 * @type {import('express').RequestHandler}
 */
export function requireGlobalKey(req, res, next) {
    // apiKeyScope is a non-empty string only for scoped/device keys
    if (req.apiKeyScope) {
        return res.status(403).json({
            success: false,
            message: "Forbidden: key-management routes require the global API key.",
        });
    }
    return next();
}
