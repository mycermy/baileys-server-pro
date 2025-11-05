# VPS Deployment Guide for Baileys Server Pro (Localhost-Only Security)

## Security-First Configuration

This server is configured to be **accessible only from localhost** for security. It will NOT be accessible from the internet, preventing malicious attacks.

### Architecture:
```
Internet → ❌ Cannot access Baileys Server
VPS Internal → ✅ ZRInv Project → Baileys Server (localhost:3000)
```

## Issues Fixed

### 1. **"Cannot GET /" Error**
- ✅ Added explicit root route handler
- ✅ Server now serves `index.html` at `/`

### 2. **Security Configuration**
- ✅ Server binds to `127.0.0.1` (localhost only)
- ✅ Docker port mapping to `127.0.0.1` only
- ✅ Not accessible from external networks

### 3. **Hardcoded localhost in Client**
- ✅ Updated `index.html` to use `window.location.origin`
- ✅ Client now dynamically detects the correct API URL

## Deployment Steps for VPS

### Step 1: Deploy with Portainer

Use the updated `portainer-stack.yml` configuration:

```yaml
version: "3.8"

services:
  baileys-server-pro:
    image: baileys-server-pro:latest
    container_name: baileys-server-pro
    restart: unless-stopped
    ports:
      # Bind to localhost only - not accessible from outside VPS
      - "127.0.0.1:3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - baileys_sessions:/usr/src/app/sessions
      - baileys_uploads:/usr/src/app/uploads
```

### Step 2: Build and Deploy

1. **Build the Docker image** on your VPS:
   ```bash
   docker build -t baileys-server-pro:latest .
   ```

2. **Deploy via Portainer**:
   - Create/Update stack with `portainer-stack.yml`
   - Click "Deploy the stack" or "Update the stack"

### Step 3: Verify Security Configuration

1. **Test from within VPS (should work)**:
   ```bash
   curl http://localhost:3000/api/config
   curl http://127.0.0.1:3000/api/config
   ```

2. **Test from outside VPS (should fail)**:
   ```bash
   # From another machine:
   curl http://zulfadli.com:3000/  # Should timeout or refuse connection
   ```

3. **Check port binding**:
   ```bash
   # Should show 127.0.0.1:3000, NOT 0.0.0.0:3000
   netstat -tlnp | grep 3000
   # Or
   ss -tlnp | grep 3000
   ```

### Step 4: Configure Your ZRInv Project

Since both applications run on the same VPS, your ZRInv project should use:

```javascript
// In your ZRInv project configuration
const BAILEYS_API_URL = 'http://localhost:3000';
// OR
const BAILEYS_API_URL = 'http://127.0.0.1:3000';
```

## Docker Network Communication (Alternative)

For better isolation, you can use Docker networking:

### Option 1: Docker Compose with Shared Network

Create a `docker-compose.yml` that includes both services:

```yaml
version: "3.8"

services:
  baileys-server-pro:
    image: baileys-server-pro:latest
    container_name: baileys-server-pro
    restart: unless-stopped
    # NO external port mapping
    expose:
      - "3000"
    networks:
      - app-network

  zrinv-app:
    image: your-zrinv-image:latest
    container_name: zrinv-app
    restart: unless-stopped
    ports:
      - "80:80"  # Only ZRInv is publicly accessible
    environment:
      - BAILEYS_API_URL=http://baileys-server-pro:3000
    networks:
      - app-network
    depends_on:
      - baileys-server-pro

networks:
  app-network:
    driver: bridge
```

With this setup:
- ✅ Baileys server is only accessible via Docker network name
- ✅ ZRInv connects using `http://baileys-server-pro:3000`
- ✅ No external access to Baileys server at all
- ✅ Only ZRInv is publicly accessible

### Option 2: Existing Docker Network

If ZRInv is already running, connect both to the same network:

1. **Create a shared network**:
   ```bash
   docker network create app-network
   ```

2. **Update Baileys stack** (in Portainer):
   ```yaml
   services:
     baileys-server-pro:
       # ... other config ...
       expose:
         - "3000"
       networks:
         - app-network

   networks:
     app-network:
       external: true
   ```

3. **Connect ZRInv to the same network**:
   ```bash
   docker network connect app-network zrinv-container-name
   ```

4. **Update ZRInv configuration**:
   ```javascript
   const BAILEYS_API_URL = 'http://baileys-server-pro:3000';
   ```

## Security Benefits

✅ **No External Exposure**
- Server cannot be accessed from the internet
- Prevents brute force attacks
- Prevents DDoS attacks

✅ **Localhost/Network Only**
- Only applications on the same VPS can access it
- Docker network isolation
- Reduced attack surface

✅ **No Firewall Rules Needed**
- Port 3000 doesn't need to be open in firewall
- Automatic protection

## Troubleshooting

### Issue: ZRInv cannot connect to Baileys server

**Check 1: Both running on same VPS?**
```bash
# Check if both containers are running
docker ps | grep -E "baileys|zrinv"
```

**Check 2: Network connectivity**
```bash
# Test from VPS host
curl http://localhost:3000/api/config

# Test from within ZRInv container
docker exec -it zrinv-container-name curl http://localhost:3000/api/config
```

**Check 3: Using correct URL in ZRInv**
- If using host network: `http://localhost:3000`
- If using Docker network: `http://baileys-server-pro:3000`

### Issue: "Connection refused"

**Solution:** Check if containers are on the same network:
```bash
# List networks for each container
docker inspect baileys-server-pro -f '{{json .NetworkSettings.Networks}}'
docker inspect zrinv-container -f '{{json .NetworkSettings.Networks}}'
```

### Issue: Want to access web UI for testing

**Option 1: SSH Tunnel** (Recommended)
```bash
# From your local machine
ssh -L 3000:localhost:3000 user@zulfadli.com

# Then access in browser:
http://localhost:3000
```

**Option 2: Temporary Access** (Not recommended)
```bash
# Temporarily expose port (restart container to revert)
docker run -p 0.0.0.0:3000:3000 baileys-server-pro:latest

# Remember to stop and use the secure configuration!
```

## Testing the Setup

### 1. From VPS Host
```bash
# Start a session
curl -X POST http://localhost:3000/api/sessions/start \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-session"}'

# Check status
curl http://localhost:3000/api/sessions/test-session/status
```

### 2. From ZRInv Application
```javascript
// Your ZRInv code
const response = await fetch('http://localhost:3000/api/sessions/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId: 'zrinv-session' })
});
```

### 3. Verify External Access is Blocked
```bash
# From another machine (should fail):
curl http://zulfadli.com:3000/
# Expected: Connection timeout or refused
```

## Additional Security Recommendations

1. ✅ **Already implemented:** Localhost-only binding
2. **Consider:** Add API authentication/tokens
3. **Consider:** Rate limiting (already implemented in your server)
4. **Consider:** Regular security updates
5. **Monitor:** Check logs regularly
   ```bash
   docker logs baileys-server-pro -f
   ```

## Environment Variables

```bash
# .env file for production
NODE_ENV=production
PORT=3000
# API_BASE_URL not needed for localhost-only setup
```

## Summary

- 🔒 **Secure:** Not accessible from internet
- ✅ **Functional:** Works perfectly for VPS-internal communication
- 🚀 **Simple:** No complex firewall rules needed
- 💪 **Robust:** Protected from external attacks
