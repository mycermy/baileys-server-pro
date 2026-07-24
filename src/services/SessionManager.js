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
     * List all sessions — both active in-memory and on-disk.
     * @returns {Array<{sessionId: string, status: string, createdAt: string|null, hasWebhook: boolean, inMemory: boolean}>}
     */
    listSessions() {
        const seen = new Set();
        const result = [];

        // 1. Active in-memory sessions
        for (const [sessionId, session] of this.sessions) {
            seen.add(sessionId);
            result.push({
                sessionId,
                status: session.status || "unknown",
                createdAt: null, // metadata not stored on instance
                hasWebhook: !!session.webhookUrl,
                inMemory: true,
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

                result.push({
                    sessionId: folder,
                    status: "stopped",
                    createdAt,
                    hasWebhook,
                    inMemory: false,
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
