// src/services/SessionManager.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import WhatsappSession from "./WhatsappSession.js";
import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSIONS_DIR = path.join(__dirname, "..", "..", "sessions");

class SessionManager {
    constructor() {
        this.sessions = new Map();
    }

    async startSession(sessionId, webhookUrl) {
        if (this.sessions.has(sessionId)) {
            const existingSession = this.sessions.get(sessionId);
            logger.warn(
                `The session ${sessionId} already exists with status: ${existingSession.status}`
            );

            // Update the webhook URL on the existing session so a re-start
            // (e.g. after the tenant configured a webhook) takes effect even
            // when the session is already in memory.
            if (webhookUrl !== undefined && existingSession.webhookUrl !== webhookUrl) {
                existingSession.webhookUrl = webhookUrl;
                logger.info(
                    `[${sessionId}] Updated webhook URL to: ${webhookUrl || "none"}`
                );

                // Persist the new webhook URL to metadata.json so it survives a
                // server restart (restoreSessions reads it back).
                try {
                    const metadataPath = path.join(
                        SESSIONS_DIR,
                        sessionId,
                        "metadata.json"
                    );
                    const metadata = {
                        sessionId: sessionId,
                        webhookUrl: webhookUrl || null,
                        createdAt: new Date().toISOString(),
                    };
                    fs.writeFileSync(
                        metadataPath,
                        JSON.stringify(metadata, null, 2)
                    );
                } catch (error) {
                    logger.error(
                        { error },
                        `[${sessionId}] Could not persist webhook URL to metadata.json`
                    );
                }
            }

            // Si la sesión está en estado fallido, la reinicia.
            if (existingSession.status === "max_retries_reached") {
                logger.info(
                    `[${sessionId}] The session is in failed state. Restarting from 'start'`
                );
                existingSession.retryCount = 0;
                existingSession.status = "starting";
                
                await existingSession.init();
            }

            return existingSession;
        }

        logger.info(`Starting new session: ${sessionId}`);

        const sessionDir = path.join(SESSIONS_DIR, sessionId);
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        const metadataPath = path.join(sessionDir, "metadata.json");
        const metadata = {
            sessionId: sessionId,
            webhookUrl: webhookUrl || null,
            createdAt: new Date().toISOString(),
        };
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        const session = new WhatsappSession(sessionId, webhookUrl);
        await session.init();

        this.sessions.set(sessionId, session);
        return session;
    }

    restoreSessions() {
        logger.info("Restoring persistent sessions...");
        if (!fs.existsSync(SESSIONS_DIR)) {
            logger.warn("No sessions directory to restore.");
            return;
        }
        const sessionFolders = fs.readdirSync(SESSIONS_DIR);
        for (const sessionId of sessionFolders) {
            const metadataPath = path.join(
                SESSIONS_DIR,
                sessionId,
                "metadata.json"
            );
            if (fs.existsSync(metadataPath)) {
                try {
                    const metadata = JSON.parse(
                        fs.readFileSync(metadataPath, "utf-8")
                    );
                    logger.info(
                        `✅ Restoring session: ${
                            metadata.sessionId
                        } with webhook: ${metadata.webhookUrl || "none"}`
                    );
                    this.startSession(metadata.sessionId, metadata.webhookUrl);
                } catch (error) {
                    logger.error(
                        { error },
                        `Error restoring session from ${sessionId}`
                    );
                }
            }
        }
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    /**
     * Extract a phone number (digits only) from a Baileys JID string.
     * Returns null for group JIDs, missing/invalid input, or any error.
     * @param {string|null|undefined} jid  e.g. "60107750600:21@s.whatsapp.net"
     * @returns {string|null}
     */
    static _phoneFromJid(jid) {
        try {
            if (!jid || typeof jid !== "string") return null;
            if (jid.includes("@g.us")) return null; // group JID — never a phone
            // Take the segment before the first colon, at-sign, or dot
            const raw = jid.split(/[:@.]/)[0];
            const digits = raw.replace(/\D/g, "");
            return digits || null;
        } catch {
            return null;
        }
    }

    /**
     * List all sessions — both active in-memory and on-disk.
     *
     * @returns {Array<{
     *   sessionId:   string,
     *   status:      string,
     *   createdAt:   string|null,
     *   hasWebhook:  boolean,
     *   inMemory:    boolean,
     *   phoneNumber: string|null,
     *   pushName:    string|null,
     *   platform:    string|null
     * }>}
     */
    listSessions() {
        const seen = new Set();
        const result = [];

        // 1. Active in-memory sessions
        for (const [sessionId, session] of this.sessions) {
            seen.add(sessionId);

            const user = session.sock?.user ?? null;
            const phoneNumber = SessionManager._phoneFromJid(user?.id ?? null);
            const pushName    = user?.name    ?? null;
            const platform    = user?.platform ?? null;

            result.push({
                sessionId,
                status: session.status || "unknown",
                createdAt: null, // metadata not stored on instance
                hasWebhook: !!session.webhookUrl,
                inMemory: true,
                phoneNumber,
                pushName,
                platform,
            });
        }

        // 2. On-disk session folders (may include unloaded or orphaned sessions)
        if (fs.existsSync(SESSIONS_DIR)) {
            const folders = fs.readdirSync(SESSIONS_DIR);
            for (const folder of folders) {
                if (seen.has(folder)) continue;

                // Skip hidden/system files like .DS_Store
                if (folder.startsWith(".")) continue;

                const folderPath = path.join(SESSIONS_DIR, folder);
                if (!fs.statSync(folderPath).isDirectory()) continue;

                const metadataPath = path.join(folderPath, "metadata.json");
                let createdAt = null;
                let hasWebhook = false;

                if (fs.existsSync(metadataPath)) {
                    try {
                        const meta = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
                        createdAt = meta.createdAt || null;
                        hasWebhook = !!meta.webhookUrl;
                    } catch {
                        // ignore malformed metadata
                    }
                }

                // Attempt to read identity from creds.json (best-effort)
                let phoneNumber = null;
                let pushName    = null;
                let platform    = null;

                try {
                    const credsPath = path.join(folderPath, "creds.json");
                    if (fs.existsSync(credsPath)) {
                        const creds = JSON.parse(fs.readFileSync(credsPath, "utf-8"));
                        phoneNumber = SessionManager._phoneFromJid(creds?.me?.id ?? null);
                        pushName    = creds?.me?.name     ?? null;
                        platform    = creds?.platform     ?? null;
                    }
                } catch {
                    // ignore malformed or unreadable creds.json
                }

                result.push({
                    sessionId: folder,
                    status: "stopped",
                    createdAt,
                    hasWebhook,
                    inMemory: false,
                    phoneNumber,
                    pushName,
                    platform,
                });
            }
        }

        return result;
    }

    async endSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            logger.info(`Closing session: ${sessionId}`);
            await session.logout();
            return true;
        }
        return false;
    }
}

const sessionManager = new SessionManager();
export default sessionManager;
