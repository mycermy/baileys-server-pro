import multer from "multer";
import { Router } from "express";
import SessionController from "../controllers/session.controller.js";

const upload = multer({ dest: "uploads/" });
const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Sessions
 *     description: Session lifecycle management
 */

/**
 * @swagger
 * /api/sessions/start:
 *   post:
 *     summary: Start a new WhatsApp session
 *     tags: [Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Unique identifier for the session.
 *                 example: "store-1"
 *               webhook:
 *                 type: string
 *                 description: Optional URL to receive message notifications.
 *                 example: "https://webhook.site/..."
 *     responses:
 *       '200':
 *         description: Session started successfully.
 */
router.post("/start", SessionController.start);

/**
 * @swagger
 * /api/sessions/{sessionId}/status:
 *   get:
 *     summary: Get the status of a specific session
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID.
 *     responses:
 *       '200':
 *         description: Session status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                   example: "open"
 *                 qr:
 *                   type: string
 *                   description: QR code string if the session needs to be scanned.
 *       '404':
 *         description: Sesión no encontrada.
 */
router.get("/:sessionId/status", SessionController.getStatus);

/**
 * @swagger
 * /api/sessions/{sessionId}/send-message:
 *   post:
 *     summary: Send a text message
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: El ID de la sesión.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *               - message
 *             properties:
 *               number:
 *                 type: string
 *                 description: "Recipient's phone number (e.g: 573001234567)."
 *               message:
 *                 type: string
 *                 description: The text message to send.
 *     responses:
 *       '200':
 *         description: Message sent successfully.
 *       '404':
 *         description: Sesión no encontrada.
 *       '503':
 *         description: The session is not open or ready to send messages.
 */
router.post("/:sessionId/send-message", SessionController.sendMessage);

/**
 * @swagger
 * /api/sessions/{sessionId}/send-message:
 *   post:
 *     summary: Send a text message
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *               - image
 *             properties:
 *               number:
 *                 type: string
 *                 description: "Recipient's phone number."
 *               caption:
 *                 type: string
 *                 description: "Optional text accompanying the image."
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "The image file to send."
 *     responses:
 *       '200':
 *         description: Image sent successfully.
 *       '400':
 *         description: Missing required parameters.
 *       '404':
 *         description: Session not found.
 */
router.post(
    "/:sessionId/send-image",
    upload.single("image"),
    SessionController.sendImage
);

/**
 * @swagger
 * /api/sessions/{sessionId}/send-document:
 *   post:
 *     summary: Send a message with a document (PDF, etc.)
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *               - document
 *             properties:
 *               number:
 *                 type: string
 *                 description: "Recipient's phone number."
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: "The document file to send."
 *     responses:
 *       '200':
 *         description: Image sent successfully.
 *       '400':
 *         description: Missing required parameters.
 *       '404':
 *         description: Session not found.
 */
router.post(
    "/:sessionId/send-document",
    upload.single("document"),
    SessionController.sendDocument
);

/**
 * @swagger
 * /api/sessions/{sessionId}/end:
 *   delete:
 *     summary: Close a session and delete its data
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID to close.
 *     responses:
 *       '200':
 *         description: Session closed successfully.
 *       '404':
 *         description: Session not found.
 */
router.delete("/:sessionId/end", SessionController.end);

/**
 * @swagger
 * /api/sessions/{sessionId}/qr:
 *   get:
 *     summary: Get the QR code for a WhatsApp session
 *     description: Returns the QR code for the specified session if available. If the session is already connected or the QR is not available, returns a message.
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier for the session.
 *     responses:
 *       '200':
 *         description: QR code retrieved successfully or informative message.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 qr:
 *                   type: string
 *                   nullable: true
 *                   description: QR code string or null if not available.
 *                 message:
 *                   type: string
 *                   description: Informative message about the QR code status.
 *       '404':
 *         description: Session not found.
 */
router.get("/:sessionId/qr", SessionController.getQrCode);

export default router;
