// src/services/KeyRegistry.js
// Persistent per-session API-key registry.
// Keys are stored in <sessions dir>/keys.json so they survive container
// recreation inside the named Docker volume without any compose change.
// listSessions() and restoreSessions() both skip non-directory entries so
// this file is invisible to the rest of the application.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SESSIONS_DIR = path.join(__dirname, "..", "..", "sessions");
const KEYS_FILE    = path.join(SESSIONS_DIR, "keys.json");
const TMP_FILE     = KEYS_FILE + ".tmp";

const FILE_VERSION = 1;

class KeyRegistry {
    constructor() {
        /** @type {Map<string, {key: string, createdAt: string, updatedAt: string}>} */
        this._map = new Map();
    }

    // ── Persistence ──────────────────────────────────────────────────────────

    /**
     * Load the registry from disk.
     * Tolerates a missing or malformed file — starts empty and logs a warning.
     * Never throws.
     */
    load() {
        try {
            if (!fs.existsSync(KEYS_FILE)) return; // first run — no file yet

            const raw  = fs.readFileSync(KEYS_FILE, "utf8");
            const data = JSON.parse(raw);

            if (!data || typeof data !== "object" || !data.keys) {
                console.warn("⚠️  KeyRegistry: keys.json is malformed — starting with empty registry.");
                return;
            }

            for (const [sessionId, entry] of Object.entries(data.keys)) {
                if (entry && typeof entry.key === "string") {
                    this._map.set(sessionId, {
                        key:       entry.key,
                        createdAt: entry.createdAt || new Date().toISOString(),
                        updatedAt: entry.updatedAt || new Date().toISOString(),
                    });
                }
            }
        } catch (err) {
            console.warn(`⚠️  KeyRegistry: could not load keys.json — ${err.message}. Starting empty.`);
        }
    }

    /** Write the current map to disk atomically (tmp → rename). */
    _persist() {
        const keys = {};
        for (const [sessionId, entry] of this._map.entries()) {
            keys[sessionId] = entry;
        }
        const payload = JSON.stringify({ version: FILE_VERSION, keys }, null, 2);

        // Ensure sessions dir exists (init.js normally creates it but be safe)
        if (!fs.existsSync(SESSIONS_DIR)) {
            fs.mkdirSync(SESSIONS_DIR, { recursive: true });
        }

        fs.writeFileSync(TMP_FILE, payload, "utf8");
        fs.renameSync(TMP_FILE, KEYS_FILE);
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Return the key string for a session, or null if not registered.
     * @param {string} sessionId
     * @returns {string|null}
     */
    resolve(sessionId) {
        return this._map.get(sessionId)?.key ?? null;
    }

    /**
     * Find the sessionId that owns the given key using a constant-time
     * comparison to resist timing attacks.
     * @param {string} key
     * @returns {string|null}
     */
    findSessionByKey(key) {
        if (!key) return null;
        const needle = Buffer.from(key, "utf8");

        for (const [sessionId, entry] of this._map.entries()) {
            const stored = Buffer.from(entry.key, "utf8");
            // Lengths must match first — timingSafeEqual requires equal lengths
            if (stored.length === needle.length &&
                crypto.timingSafeEqual(stored, needle)) {
                return sessionId;
            }
        }
        return null;
    }

    /**
     * Create or overwrite the entry for a session and persist immediately.
     * @param {string} sessionId
     * @param {string} key
     */
    set(sessionId, key) {
        const now       = new Date().toISOString();
        const existing  = this._map.get(sessionId);
        this._map.set(sessionId, {
            key,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        });
        this._persist();
    }

    /**
     * Remove the entry for a session and persist.
     * @param {string} sessionId
     */
    remove(sessionId) {
        this._map.delete(sessionId);
        this._persist();
    }

    /**
     * Return all entries as a plain object (not a copy of the Map).
     * Used for the /api/keys listing; callers must NOT mutate the values.
     * @returns {Map<string, {key: string, createdAt: string, updatedAt: string}>}
     */
    all() {
        return this._map;
    }

    /**
     * @param {string} sessionId
     * @returns {boolean}
     */
    has(sessionId) {
        return this._map.has(sessionId);
    }

    /** How many entries are currently loaded. */
    get size() {
        return this._map.size;
    }
}

// Export a singleton — imported everywhere by reference
const registry = new KeyRegistry();
export default registry;
