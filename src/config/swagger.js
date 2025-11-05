// src/config/swagger.js
import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
    openapi: "3.0.0",
    info: {
        title: "Baileys Server Pro API",
        version: "1.0.0",
        description:
            "A REST API to interact with WhatsApp through Baileys, managing multiple sessions.",
    },
    servers: [
        {
            url: "http://localhost:3000",
            description: "Development Server",
        },
    ],
    components: {
        securitySchemes: {
            ApiKeyAuth: {
                type: "apiKey",
                in: "header",
                name: "x-api-key",
            },
        },
    },
    security: [
        {
            ApiKeyAuth: [],
        },
    ],
};

const options = {
    swaggerDefinition,
    // Paths to files containing API annotations
    apis: ["./src/api/routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
