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

To deploy this server to your Portainer instance at `portainer.test/`:

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

# Or build locally
docker build -t baileys-server-pro:latest .
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

## 🔒 Security & Deployment Guides

### **Permission Issues? (EACCES Error)**
See **[PERMISSION_FIX.md](PERMISSION_FIX.md)** for:
- Fixing "EACCES: permission denied" errors
- Docker volume permission issues
- Step-by-step troubleshooting
- Run `./fix-permissions.sh` on your VPS

### **For VPS Deployment (Localhost-Only Security)**
See **[VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md)** for:
- Secure localhost-only configuration
- Docker network setup
- Troubleshooting guide
- SSH tunnel access

### **Security Quick Reference**
See **[SECURITY_SETUP.md](SECURITY_SETUP.md)** for:
- Localhost-only access explanation
- Port binding configuration
- Security checklist
- Common issues and solutions

**Default Security Configuration:**
- ✅ Server binds to `127.0.0.1` (localhost only)
- ✅ Docker port mapping: `127.0.0.1:3000:3000`
- ✅ Not accessible from internet (protected from attacks)
- ✅ Only accessible from same VPS/Docker network

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
