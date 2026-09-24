// src/services/LidResolver.js

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import SessionManager from "./SessionManager.js";
import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Mirrors SessionManager.js path resolution so Docker mounts resolve identically. */
export const SESSIONS_DIR = path.join(__dirname, "..", "..", "sessions");

/**
 * Normalise any value to a bare digit string, or null if empty after stripping.
 * @param {*} value
 * @returns {string|null}
 */
function digitsOnly(value) {
    const d = String(value).replace(/\D+/g, "");
    return d || null;
}

/**
 * Resolve a WhatsApp LID to its corresponding phone number.
 * Tries the in-memory Baileys signal repository first, then falls back to the
 * on-disk mapping file written by Baileys' auth-state persistence layer.
 *
 * NOTE: getPNForLID returns a device-specific JID (e.g. "60107750600:0@s.whatsapp.net");
 * we strip everything after and including the first non-digit/colon character.
 *
 * @param {string} sessionId
 * @param {string} lid - Bare digits or with @lid suffix.
 * @returns {Promise<{ phoneNumber: string|null, source: 'signalRepository'|'file'|null }>}
 */
export async function resolvePN(sessionId, lid) {
    const lidDigits = digitsOnly(lid);
    if (!lidDigits) {
        return { phoneNumber: null, source: null };
    }

    // 1. In-memory signal repository (requires active socket)
    try {
        const lidMapping = SessionManager.getSession(sessionId)?.sock?.signalRepository?.lidMapping;
        if (lidMapping) {
            const result = await lidMapping.getPNForLID(`${lidDigits}@lid`);
            if (result) {
                const pn = digitsOnly(result.split(":")[0]);
                if (pn) {
                    logger.debug({ sessionId, lid: lidDigits, phoneNumber: pn }, "LID resolved via signalRepository");
                    return { phoneNumber: pn, source: "signalRepository" };
                }
            }
        }
    } catch {
        // socket not ready or lidMapping unavailable — fall through to file
    }

    // 2. On-disk file written by Baileys: lid-mapping-<LID>_reverse.json
    const filePath = path.join(SESSIONS_DIR, sessionId, `lid-mapping-${lidDigits}_reverse.json`);
    try {
        const raw = await fs.readFile(filePath, "utf8");
        const pn = digitsOnly(JSON.parse(raw));
        if (pn) {
            logger.info({ sessionId, lid: lidDigits, phoneNumber: pn }, "LID resolved via file");
            return { phoneNumber: pn, source: "file" };
        }
    } catch (err) {
        if (err.code !== "ENOENT") {
            logger.warn({ sessionId, lid: lidDigits, errMsg: err.message }, "Unexpected error reading LID mapping file");
        }
    }

    return { phoneNumber: null, source: null };
}

/**
 * Resolve a phone number to its corresponding WhatsApp LID.
 * Tries the in-memory Baileys signal repository first, then falls back to the
 * on-disk mapping file.
 *
 * NOTE: getLIDForPN may trigger a USync network fetch when no local mapping exists,
 * which can cause a write side-effect inside Baileys. Prefer the file fallback for
 * purely read-only environments; signal-repo path is retained for cache-hot lookups.
 *
 * @param {string} sessionId
 * @param {string} pn - Bare digits or with @s.whatsapp.net suffix.
 * @returns {Promise<{ lid: string|null, source: 'signalRepository'|'file'|null }>}
 */
export async function resolveLID(sessionId, pn) {
    const pnDigits = digitsOnly(pn);
    if (!pnDigits) {
        return { lid: null, source: null };
    }

    // 1. In-memory signal repository (requires active socket)
    try {
        const lidMapping = SessionManager.getSession(sessionId)?.sock?.signalRepository?.lidMapping;
        if (lidMapping) {
            const result = await lidMapping.getLIDForPN(`${pnDigits}@s.whatsapp.net`);
            if (result) {
                const lid = digitsOnly(result.split(":")[0]);
                if (lid) {
                    logger.debug({ sessionId, pn: pnDigits, lid }, "PN resolved via signalRepository");
                    return { lid, source: "signalRepository" };
                }
            }
        }
    } catch {
        // socket not ready or lidMapping unavailable — fall through to file
    }

    // 2. On-disk file written by Baileys: lid-mapping-<PN>.json
    const filePath = path.join(SESSIONS_DIR, sessionId, `lid-mapping-${pnDigits}.json`);
    try {
        const raw = await fs.readFile(filePath, "utf8");
        const lid = digitsOnly(JSON.parse(raw));
        if (lid) {
            logger.info({ sessionId, pn: pnDigits, lid }, "PN resolved via file");
            return { lid, source: "file" };
        }
    } catch (err) {
        if (err.code !== "ENOENT") {
            logger.warn({ sessionId, pn: pnDigits, errMsg: err.message }, "Unexpected error reading PN mapping file");
        }
    }

    return { lid: null, source: null };
}
