import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './src/config/swagger.js';

import logger from "./src/utils/logger.js";
import sessionRoutes from "./src/api/routes/session.routes.js";
import { initializeDirectories } from "./src/utils/init.js";
import SessionManager from "./src/services/SessionManager.js";
import KeyRegistry from "./src/services/KeyRegistry.js";
import { requireGlobalKey } from "./src/api/middleware/scope.js";
import { bannerBaileysServerPro } from "./src/utils/banner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const banner = bannerBaileysServerPro;

// ── Environment ──────────────────────────────────────────────────────────────
const API_KEY      = process.env.API_KEY      || "";
const CORS_ORIGINS = process.env.CORS_ORIGINS || "";

try {
    initializeDirectories();
    console.log("✅ Directories initialized");

    KeyRegistry.load();
    console.log(`✅ KeyRegistry loaded — ${KeyRegistry.size} session key(s) registered`);

    SessionManager.restoreSessions();
    console.log("✅ Sessions restored");
} catch (error) {
    console.error("❌ Error during initialization:", error);
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS ─────────────────────────────────────────────────────────────────────
if (CORS_ORIGINS) {
    const allowedOrigins = CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
    app.use(
        cors({
            origin(origin, callback) {
                // Allow requests with no Origin header (server-to-server, e.g. Laravel/Guzzle)
                if (!origin) return callback(null, true);
                if (allowedOrigins.includes(origin)) return callback(null, true);
                callback(new Error(`CORS: origin '${origin}' not allowed`));
            },
            credentials: true,
        })
    );
} else {
    console.warn("⚠️  CORS_ORIGINS not set — CORS is wide open (permissive).");
    app.use(cors());
}

app.use(express.json());

// ── API-Key authentication ────────────────────────────────────────────────────
// Resolution order:
//   1. Key matches a registry entry  → req.apiKeyScope = <sessionId> (scoped)
//   2. Key matches env API_KEY       → req.apiKeyScope = null (global / unrestricted)
//   3. Neither                       → 401
// When BOTH the registry is empty AND API_KEY is unset, auth is fully
// disabled (backward-compatible) and req.apiKeyScope = null for all requests.
const hasGlobalKey   = Boolean(API_KEY);
const hasRegistryKey = KeyRegistry.size > 0;

if (!hasGlobalKey && !hasRegistryKey) {
    console.warn("⚠️  API_KEY not set and no keys in registry — the API is unauthenticated.");
} else {
    if (hasGlobalKey)   console.log("🔑 Global API_KEY is active.");
    if (hasRegistryKey) console.log(`🔑 KeyRegistry: ${KeyRegistry.size} session key(s) active.`);
}

app.use((req, res, next) => {
    // Exempt paths — set scope to null so downstream never sees undefined.
    //
    // /api/config is exempt alongside /health because it is the Docker
    // healthcheck target in docker-compose.yml (the Portainer stack uses
    // /health). It only returns the public base URL, so it exposes nothing.
    if (req.method === "OPTIONS" || req.path === "/health" || req.path === "/api/config") {
        req.apiKeyScope = null;
        return next();
    }

    // This server also serves its own dashboard (public/index.html) and the
    // Swagger UI. A browser cannot send a header for the top-level navigation
    // that loads those pages, so gating them would make them permanently
    // unreachable with a 401. Only the JSON API itself is authenticated.
    if (!req.path.startsWith("/api/")) {
        req.apiKeyScope = null;
        return next();
    }

    // No auth configured → open access
    if (!hasGlobalKey && !hasRegistryKey) {
        req.apiKeyScope = null;
        return next();
    }

    const provided = (req.headers["x-api-key"] || "").trim();

    // 1. Check registry first
    const scopedSession = KeyRegistry.findSessionByKey(provided);
    if (scopedSession !== null) {
        req.apiKeyScope = scopedSession;
        return next();
    }

    // 2. Check global env key
    if (hasGlobalKey && provided === API_KEY) {
        req.apiKeyScope = null;
        return next();
    }

    // 3. Unauthorised
    return res.status(401).json({ success: false, message: "Unauthorized." });
});

// ── Key-management routes (/api/keys) ─────────────────────────────────────────
// Global-only: a scoped (device) key cannot reach these endpoints.
const keysRouter = express.Router();
keysRouter.use(requireGlobalKey);

/**
 * GET /api/keys
 * List all registered session keys (masked — first 6 + "…" + last 4).
 * Never returns the full key.
 */
keysRouter.get("/", (req, res) => {
    const keys = [];
    for (const [sessionId, entry] of KeyRegistry.all().entries()) {
        const k = entry.key;
        const masked = k.length > 10
            ? k.slice(0, 6) + "…" + k.slice(-4)
            : k.slice(0, 3) + "…";
        keys.push({
            sessionId,
            maskedKey:  masked,
            createdAt:  entry.createdAt,
            updatedAt:  entry.updatedAt,
        });
    }
    res.status(200).json({ success: true, keys });
});

/**
 * POST /api/keys
 * Body: { sessionId, key }
 * Create or overwrite the key for a session. Returns 400 when fields missing.
 */
keysRouter.post("/", (req, res) => {
    const { sessionId, key } = req.body || {};
    if (!sessionId || !key) {
        return res.status(400).json({
            success: false,
            message: "Both sessionId and key fields are required.",
        });
    }
    KeyRegistry.set(String(sessionId), String(key));
    res.status(200).json({ success: true });
});

/**
 * DELETE /api/keys/:sessionId
 * Remove the key for a session. 404 when not found.
 */
keysRouter.delete("/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    if (!KeyRegistry.has(sessionId)) {
        return res.status(404).json({
            success: false,
            message: `No key registered for session '${sessionId}'.`,
        });
    }
    KeyRegistry.remove(sessionId);
    res.status(200).json({ success: true });
});

// API routes must come BEFORE static middleware
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/keys", keysRouter);
app.use("/api/sessions", sessionRoutes);

// API endpoint to get server configuration
app.get('/api/config', (req, res) => {
    res.json({
        apiBaseUrl: process.env.API_BASE_URL || req.protocol + '://' + req.get('host')
    });
});

// Add a simple health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Static files served AFTER API routes
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html at root path (after static middleware)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Listen on 0.0.0.0 inside container (required for Docker port mapping)
// Security is controlled by docker-compose.yml port binding:
// - "127.0.0.1:3000:3000" = localhost only (secure)
// - "3000:3000" = accessible from anywhere (insecure)
app.listen(PORT, '0.0.0.0', () => {
    logger.info(banner);
    logger.info(`✅ Server listening on http://0.0.0.0:${PORT}`);
    logger.info(`📕 Documentation available at http://0.0.0.0:${PORT}/api-docs`);
});
