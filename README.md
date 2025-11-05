# Baileys Server Pro 🚀

A production-ready multi-session WhatsApp server using `@whiskeysockets/baileys`. It provides a secure REST API for sending and receiving messages, allowing easy integration with other platforms.

## ✨ Features

-   **Multi-Session:** Manages multiple WhatsApp numbers simultaneously.
-   **Persistence:** Sessions are automatically restored if the server restarts.
-   **Webhooks:** Receive incoming messages in real time.
-   **Multimedia Sending:** Support for sending images and text.
-   **Security:** Endpoints protected by API Key.
-   **Dockerized:** Easy to deploy and scale.

## 🏁 Quick Start with Docker Compose

The easiest way to start the server is using `docker-compose`.

1.  **Copy the environment file:**
    ```bash
    cp .env.example .env
    ```

2.  **Create the sessions and uploads folders:**
    ```bash
    mkdir -p sessions uploads
    ```

3.  **Start the server:**
    ```bash
    docker-compose up -d
    ```

Your server will be running on `http://localhost:3000`.

## 🚢 Deploy to Portainer

To deploy this server to your Portainer instance at `portainer.test/`:

### Option 1: Using Repository (Recommended)
1. **In Portainer** (`portainer.test/`):
   - Go to **Stacks** → **Add Stack**
   - **Name:** `baileys-server-pro`
   - **Repository URL:** `https://github.com/dev-juanda01/baileys-server-pro`
   - **Compose path:** `portainer-stack.yml`
   - **Environment variables:**
     - `NODE_ENV=production`
     - `PORT=3000`

2. **Deploy the stack** and access your server at the configured port.

### Option 2: Build and Deploy Manually
```bash
# Build and deploy
./deploy.sh your-registry.com v1.0.0

# Or build locally
docker build -t baileys-server-pro:latest .
docker-compose up -d
```

## 🐳 Manual Docker Commands

If you prefer manual Docker commands:

```bash
# Build the image
docker build -t baileys-server-pro .

# Run the container
docker run -d \
  --name baileys-server-pro \
  -p 3000:3000 \
  -v $(pwd)/sessions:/usr/src/app/sessions \
  -v $(pwd)/uploads:/usr/src/app/uploads \
  -e NODE_ENV=production \
  baileys-server-pro
```

## 📚 API Documentation

The API has interactive **Swagger / OpenAPI** documentation.

Once the server is running, you can access the documentation at:
**[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

### 📖 Complete API Usage Examples

For comprehensive API usage examples with detailed request/response samples, see:
**[API_USAGE_EXAMPLES.md](API_USAGE_EXAMPLES.md)**

This file contains complete examples for all endpoints including cURL commands, request/response formats, error handling, and integration patterns.

### Examples with `curl`

Make sure to replace `{sessionId}`, `{number}` and your API Key.

**Start a Session:**

```bash
curl -X POST http://localhost:3000/api/sessions/start \
-H "Content-Type: application/json" \
-H "x-api-key: your_super_secret_key" \
-d '{
    "sessionId": "my-store",
    "webhook": "https://webhook.site/..."
}'
```

**Send a Text Message:**

```bash
curl -X POST http://localhost:3000/api/sessions/my-store/send-message \
-H "Content-Type: application/json" \
-H "x-api-key: your_super_secret_key" \
-d '{
    "number": "573001234567",
    "message": "Hello from the API! 🤖"
}'
```

## 💻 Webhooks

To receive messages, provide a URL in the `start` endpoint. You will receive a `POST` with the following format:

```json
{
    "sessionId": "my-store",
    "timestamp": "2025-09-09T22:30:00.000Z",
    "message": {
        "id": "ABCDEFG12345",
        "from": "573001234567@s.whatsapp.net",
        "text": "Hello! I'd like more information."
    }
}
```

## 💾 Data Persistence

The server saves credentials in the `/usr/src/app/sessions` folder inside the container. It is **crucial** to mount a volume at this path (`-v ./sessions:/usr/src/app/sessions`) to ensure your sessions are not lost.
