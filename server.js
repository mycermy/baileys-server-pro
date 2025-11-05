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
import { bannerBaileysServerPro } from "./src/utils/banner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const banner = bannerBaileysServerPro;

initializeDirectories();
SessionManager.restoreSessions();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/sessions", sessionRoutes);

// Serve index.html at root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API endpoint to get server configuration
app.get('/api/config', (req, res) => {
    res.json({
        apiBaseUrl: process.env.API_BASE_URL || req.protocol + '://' + req.get('host')
    });
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
