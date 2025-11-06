import fs from "fs/promises";
import SessionManager from "../../services/SessionManager.js";
import logger from "../../utils/logger.js";

/**
 * SessionController
 * Handles WhatsApp session lifecycle: start, status, QR code retrieval, sending messages, and ending sessions.
 */
class SessionController {
    /**
     * Start a new WhatsApp session.
     * @async
     * @param {import('express').Request} req - Express request object. Requires sessionId and optional webhook in body.
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     */
    async start(req, res) {
        const { sessionId, webhook } = req.body;
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "The sessionId field is required.",
            });
        }

        try {
            await SessionManager.startSession(sessionId, webhook);
            res.status(200).json({
                success: true,
                message:
                    "The session is starting. Check the status to get the QR code.",
                sessionId: sessionId,
            });
        } catch (error) {
            logger.error({ error }, `Error al iniciar la sesión ${sessionId}`);
            res.status(500).json({
                success: false,
                message: "Error starting the session.",
                error: error.message,
            });
        }
    }

    /**
     * Get the status of a WhatsApp session.
     * @async
     * @param {import('express').Request} req - Express request object. Requires sessionId in params.
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     */
    async getStatus(req, res) {
        const { sessionId } = req.params;
        const session = SessionManager.getSession(sessionId);

        if (!session) {
            return res
                .status(404)
                .json({ success: false, message: "Session not found." });
        }

        res.status(200).json({
            success: true,
            sessionId: session.sessionId,
            status: session.status,
            qr: session.qr,
        });
    }

    /**
     * Get the QR code for a WhatsApp session.
     * If session failed, it will restart and generate a new QR.
     * @async
     * @param {import('express').Request} req - Express request object. Requires sessionId in params.
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     */
    async getQrCode(req, res) {
        const { sessionId } = req.params;
        const session = SessionManager.getSession(sessionId);

        if (!session) {
            return res
                .status(404)
                .json({ success: false, message: "Session not found." });
        }

        // If session failed, restart it here.
        if (session.status === "max_retries_reached") {
            logger.info(
                `[${sessionId}] Solicitud de QR para sesión fallida. Reiniciando desde 'qr'`
            );

            session.retryCount = 0;
            session.status = "starting";
            await session.init();

            setTimeout(() => {
                res.status(200).json({
                    success: true,
                    qr: session.qr,
                    message:
                        "Process of connection restarted. New QR generated.",
                });
            }, 2000);
            return;
        }

        if (session.status === "open") {
            return res.status(200).json({
                success: true,
                qr: null,
                message: "The session is already connected.",
            });
        }

        if (!session.qr) {
            return res.status(200).json({
                success: true,
                qr: null,
                message:
                    "The QR code is not available or is being generated.",
            });
        }

        res.status(200).json({
            success: true,
            qr: session.qr,
        });
    }

    /**
     * Send a text message using a WhatsApp session.
     * @async
     * @param {import('express').Request} req - Express request object. Requires sessionId in params and number/message in body.
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     */
    async sendMessage(req, res) {
        const { sessionId } = req.params;
        const { number, message } = req.body;

        if (!number || !message) {
            return res.status(400).json({
                success: false,
                message: "The number and message fields are required.",
            });
        }

        const session = SessionManager.getSession(sessionId);

        if (!session) {
            return res
                .status(404)
                .json({ success: false, message: "Session not found." });
        }

        try {
            const result = await session.sendMessage(number, message);
            res.status(200).json({
                success: true,
                message: "Mensaje enviado exitosamente.",
                details: result,
            });
        } catch (error) {
            logger.error(
                { error },
                `Error al enviar mensaje desde ${sessionId}`
            );

            // Check if it's a rate limit error
            if (error.message.includes('rate limit')) {
                return res.status(429).json({
                    success: false,
                    message: "Rate limit exceeded.",
                    error: error.message,
                });
            }

            res.status(500).json({
                success: false,
                message: "Error sending the message.",
                error: error.message,
            });
        }
    }

    /**
     * Sends an image message using a WhatsApp session.
     * Requires the session to be open. Handles file upload via Multer.
     * @async
     * @param {import('express').Request} req - Express request object. Requires sessionId in params, number and optional caption in body, and an image file from Multer.
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     * @throws {Error} If the session is not found, required parameters are missing, or an error occurs during image sending.
     */
    async sendImage(req, res) {
        const { sessionId } = req.params;
        const { number, caption } = req.body;
        const file = req.file; // multer nos da el archivo aquí

        if (!number || !file) {
            if (file) await fs.unlink(file.path); // Limpia el archivo si algo más faltó
            return res.status(400).json({
                success: false,
                message: "The number and image file are required.",
            });
        }

        const session = SessionManager.getSession(sessionId);
        if (!session) {
            await fs.unlink(file.path); // Clean the file if the session does not exist
            return res
                .status(404)
                .json({ success: false, message: "Session not found." });
        }

        let rateLimitError = false;

        try {
            const result = await session.sendImage(number, file.path, caption);
            res.status(200).json({
                success: true,
                message: "Image sent successfully.",
                details: result,
            });
        } catch (error) {
            logger.error(
                { error },
                `Error al enviar imagen desde ${sessionId}`
            );

            // Check if it's a rate limit error
            if (error.message.includes('rate limit')) {
                rateLimitError = true;
                return res.status(429).json({
                    success: false,
                    message: "Rate limit exceeded.",
                    error: error.message,
                });
            }

            res.status(500).json({
                success: false,
                message: "Error sending the image.",
                error: error.message,
            });
        } finally {
            if (!rateLimitError) {
                await fs.unlink(file.path);
            }
        }
    }

    /**
     * Sends a document message using a WhatsApp session.
     * Requires the session to be open. Handles file upload via Multer.
     * @async
     * @param {import('express').Request} req - Express request object. Requires sessionId in params, number and optional caption in body, and a document file from Multer.
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     * @throws {Error} If the session is not found, required parameters are missing, or an error occurs during document sending.
     */
    async sendDocument(req, res) {
        const { sessionId } = req.params;
        const { number, caption } = req.body;
        const file = req.file;

        if (!number || !file) {
            if (file) await fs.unlink(file.path);
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "The number and document file are required.",
                });
        }

        const session = SessionManager.getSession(sessionId);
        if (!session) {
            await fs.unlink(file.path);
            return res
                .status(404)
                .json({ success: false, message: "Session not found." });
        }

        let rateLimitError = false;

        try {
            // -> Pasamos la ruta, nombre original, mimetype Y caption del archivo
            const result = await session.sendDocument(
                number,
                file.path,
                file.originalname,
                file.mimetype,
                caption
            );
            res.status(200).json({
                success: true,
                message: "Document sent successfully.",
                details: result,
            });
        } catch (error) {
            logger.error(
                { error },
                `Error al enviar documento desde ${sessionId}`
            );

            // Check if it's a rate limit error
            if (error.message.includes('rate limit')) {
                rateLimitError = true;
                return res.status(429).json({
                    success: false,
                    message: "Rate limit exceeded.",
                    error: error.message,
                });
            }

            res.status(500).json({
                success: false,
                message: "Error sending the document.",
                error: error.message,
            });
        } finally {
            if (!rateLimitError) {
                await fs.unlink(file.path);
            }
        }
    }

    /**
     * End a WhatsApp session and delete its data.
     * @async
     * @param {import('express').Request} req - Express request object. Requires sessionId in params.
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     */
    async end(req, res) {
        const { sessionId } = req.params;
        const result = await SessionManager.endSession(sessionId);

        if (result) {
            res.status(200).json({
                success: true,
                message: "Session closed successfully.",
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Session not found.",
            });
        }
    }

    /**
     * Get the rate limit status for a WhatsApp session.
     * @async
     * @param {import('express').Request} req - Express request object. Requires sessionId in params.
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     */
    async getRateLimitStatus(req, res) {
        const { sessionId } = req.params;
        const session = SessionManager.getSession(sessionId);

        if (!session) {
            return res
                .status(404)
                .json({ success: false, message: "Session not found." });
        }

        const rateLimitStatus = session.getRateLimitStatus();
        res.status(200).json({
            success: true,
            sessionId: sessionId,
            rateLimits: rateLimitStatus,
        });
    }
}

/**
 * Instance of SessionController to be used in routes.
 * @type {SessionController}
 */
const sessionController = new SessionController();
export default sessionController;
