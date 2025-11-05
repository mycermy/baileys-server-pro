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

1.  **Create a `docker-compose.yml` file** with the following content:

    ```yml
    version: "3.8"
    services:
        baileys-server:
            image: your-dockerhub-user/baileys-server:latest # Replace with your image
            container_name: baileys-pro
            restart: always
            ports:
                - "3000:3000"
            environment:
                - API_KEY=${API_KEY}
            volumes:
                - ./sessions:/usr/src/app/sessions
    ```

2.  **Create a `.env` file** for your environment variables:

    ```
    # Application port
    PORT=3000

    # Secret key to protect the API
    API_KEY=your_super_secret_very_long_key
    ```

3.  **Create the sessions folder** and give it the correct permissions:

    ```bash
    mkdir -p sessions
    sudo chown -R 1000:1000 sessions
    ```

4.  **Start the server:**
    ```bash
    docker-compose up -d
    ```

Your server will be running on `http://localhost:3000`.

## 📚 API Documentation

The API has interactive **Swagger / OpenAPI** documentation.

Once the server is running, you can access the documentation at:
**[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

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
