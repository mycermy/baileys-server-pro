# Baileys Server Pro 🚀

A production-ready multi-session WhatsApp server using `@whiskeysockets/baileys`. It provides a secure REST API for sending and receiving messages, allowing easy integration with other platforms.

## ✨ Features

-   **Multi-Session:** Manages multiple WhatsApp numbers simultaneously.
-   **Persistence:** Sessions are automatically restored if the server restarts.
-   **Webhooks:** Receive incoming messages in real time.
-   **Multimedia Sending:** Support for sending images and text.
-   **Security:** Endpoints protected by API Key.
-   **Dockerized:** Easy to deploy and scale.

## ⚙️ Environment Configuration

Configure your deployment using the `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env

# Edit with your settings
nano .env
```

### Environment Variables:
- **`PORT`** - Server port (default: 3000)
- **`NODE_ENV`** - Environment mode (default: production)
- **`API_KEY`** *(optional)* — When set, every API request must include the header `X-API-Key: <value>`. The `GET /health` endpoint is always exempt (for Docker/healthcheck). When empty the server is unauthenticated (backward-compatible default).
- **`CORS_ORIGINS`** *(optional)* — Comma-separated list of allowed `Origin` header values, e.g. `https://app.example.com,https://admin.example.com`. Server-to-server requests (no `Origin` header, e.g. from Laravel/Guzzle) are always allowed. When empty, CORS is fully permissive.

### Docker Environment Loading:

**Local Development** (`docker-compose.yml`):
```yaml
env_file:
  - .env  # Automatically loads all variables from .env file
```

**Portainer Deployment** (`portainer-stack.yml`):
```yaml
environment:
  - NODE_ENV=${NODE_ENV:-production}  # With fallback defaults
  - PORT=${PORT:-3000}
```

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

**📘 Quick Start**: See **[PORTAINER_QUICK_START.md](PORTAINER_QUICK_START.md)** for complete 3-step guide!

### ⚠️ VERY IMPORTANT: Which compose file to use

This repository has **two** Docker Compose files. They are not interchangeable:

| File | Use for | Mount strategy | Why |
|------|---------|----------------|-----|
| **`docker-compose.yml`** | Local development on your MacBook | **Bind mount** (`./sessions:/usr/src/app/sessions`) | Keeps session files (`creds.json`) in the project folder so they survive container recreation. |
| **`portainer-stack.yml`** | Production deployment via Portainer (VPS or local) | **Named volumes** (`wasap_sessions:/usr/src/app/sessions`) | Works reliably in Portainer with automatic volume management. |

**Do NOT redeploy your local MacBook stack through Portainer** unless you also migrate the session data into the named volume. If you do, Portainer will create a fresh empty volume, the existing `creds.json` will be missing, and your session will stay stuck at `connecting` with errors like:

```text
[TheSession] Message for 10123456789 queued. Reason: Connection not available.
```

### Quick Summary:

1. **Deploy Stack** in Portainer using Repository method
2. **Fix Permissions** on VPS: `./fix-portainer-volumes.sh`
3. **Restart Container** and you're done! ✅

### Detailed Instructions:

To deploy this server to your Portainer instance:

### Option 1: Using Repository (Recommended)
1. **In Portainer** (`portainer.test/`):
   - Go to **Stacks** → **Add Stack**
   - **Name:** `baileys-server-pro`
   - **Repository URL:** `https://github.com/mycermy/baileys-server-pro`
   - **Compose path:** `portainer-stack.yml`
   - **Environment variables:** (Set these in Portainer UI)
     - `NODE_ENV=production`
     - `PORT=3000`

2. **Deploy the stack** and access your server at the configured port.

### Option 2: Build and Deploy Manually
```bash
# Build and deploy
./deploy.sh your-registry.com v1.0.0

# Or build locally (uses docker-compose.yml with bind mounts)
docker build -t baileys-server-pro:latest .
docker-compose up -d
```

### Option 3: Local development (recommended for MacBook)
```bash
# Always use docker-compose.yml for local development, never portainer-stack.yml
cd /Users/zrm/Documents/GitHub/baileys-server-pro
docker-compose down
docker-compose up -d
```

## 🚀 Deployment Scripts

### `deploy.sh` - Full Redeployment
**Usage:** `./deploy.sh [registry] [tag] [branch]`

**Parameters:**
- `registry`: Docker registry URL (default: `localhost:5000`)
- `tag`: Image tag (default: `latest`)
- `branch`: Git branch to deploy from (default: `local-dev`)

**Examples:**
```bash
./deploy.sh                          # localhost:5000, latest, local-dev
./deploy.sh myregistry.com v1.0.0 main
./deploy.sh "" "" production         # production branch
```

### `update.sh` - Quick UI Updates
**Usage:** `./update.sh`

Updates HTML/CSS/JS files without rebuilding the Docker image.

## 🔄 Updating & Redeploying

### For Code Changes (rebuild required):
```bash
# Deploy from local-dev branch (default)
./deploy.sh

# Deploy from specific branch
./deploy.sh localhost:5000 latest main

# Deploy from production branch
./deploy.sh myregistry.com v1.0.0 production
```

### For HTML/CSS/JS Changes (quick update):
```bash
# Quick update without rebuilding
./update.sh
```

### For Portainer:
1. **Push changes** to your GitHub repository
2. **In Portainer** → Stacks → select your stack
3. **Click "Pull and redeploy"** to get latest changes

## 📁 File Structure & Volumes

- **`./sessions`** → `/usr/src/app/sessions` (persistent WhatsApp sessions)
- **`./uploads`** → `/usr/src/app/uploads` (uploaded files)
- **`./public`** → `/usr/src/app/public` (web interface - bind mounted for live updates)

## � Deploy to Portainer

**📘 Quick Start**: See **[PORTAINER_QUICK_START.md](PORTAINER_QUICK_START.md)** for complete guide!

### Quick Summary:

1. **Deploy Stack** in Portainer using Repository method
2. **Fix Permissions** on VPS: Run `./fix-portainer-volumes.sh`
3. **Restart Container** and you're done! ✅

### Detailed Instructions:

## �📚 API Documentation

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

### Session stuck at `connecting` after redeploy?

1. Check that the correct compose file was used (see [Which compose file to use](#which-compose-file-to-use) above).
2. Verify `creds.json` exists inside the container:
   ```bash
   docker exec baileys-server-pro ls -la /usr/src/app/sessions/ZRInvois/
   ```
3. If `creds.json` is missing, the container is using an empty volume. Restore it from a backup or re-scan the QR code.

---

## 🔒 Reverse-Proxy + Tailscale-Only Access (OpenLiteSpeed)

The recommended production setup routes all external traffic through **OpenLiteSpeed** as a reverse proxy, with the container bound to `127.0.0.1:3000:3000` so it is never reachable directly from the internet. Access to OpenLiteSpeed itself is then restricted to your **Tailscale** network (e.g. by firewall rules or an OLS `Allow List` that whitelists only `100.64.0.0/10`).

### Layer overview

```
Client (Tailscale IP)  →  OpenLiteSpeed (port 443/80, TLS)
                        →  127.0.0.1:3000  (baileys-server-pro container)
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `API_KEY` | Recommended | Shared secret. Set the same value in OLS's request header and in the container env. Every API request must include `X-API-Key: <value>`. |
| `CORS_ORIGINS` | Optional | Comma-separated list of browser origins allowed to call the API (e.g. your Laravel app origin). Server-to-server callers (no `Origin` header) are always allowed. |

> **`GET /health` is always exempt** from API-Key auth — the Docker/Portainer healthcheck relies on it.

### Minimal `.env` for a Tailscale-restricted VPS

```bash
API_KEY=replace_with_a_long_random_secret
CORS_ORIGINS=https://your-laravel-app.example.com
```

### OpenLiteSpeed vhost snippet

In your OLS virtual host → **Context** or **Rewrite rules**, forward to the container and inject the key so your internal services don't need it:

```
# Example using OLS Context → Proxy
# URI: /
# Address: 127.0.0.1:3000
# Request Header: X-API-Key replace_with_a_long_random_secret
```
