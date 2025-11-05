# Permission Fix for Portainer Deployment

## Quick Fix (Recommended Method)

### Step 1: Use Build Configuration in Portainer

When deploying in Portainer, use the **Repository** method:

1. **In Portainer**:
   - Go to **Stacks** → **Add Stack**
   - **Name**: `baileys-server-pro`
   - **Build method**: ✅ **Repository**
   - **Repository URL**: `https://github.com/mycermy/baileys-server-pro`
   - **Repository reference**: `refs/heads/local-dev`
   - **Compose path**: `portainer-stack.yml`

2. **The stack will build from source** (no pre-built image needed)

### Step 2: Fix Volume Permissions (CRITICAL)

Before or after deploying, you MUST fix permissions on VPS:

```bash
# SSH into your VPS first
ssh user@zulfadli.com

# Option A: Find volumes by name
docker volume ls | grep baileys

# Option B: Inspect the container to find volume paths
docker inspect baileys-server-pro | grep -A 10 Mounts

# Option C: Find the actual path
docker volume inspect baileys_sessions
docker volume inspect baileys_uploads
```

This will show something like:
```json
[
    {
        "Name": "baileys_sessions",
        "Mountpoint": "/var/lib/docker/volumes/baileys_sessions/_data"
    }
]
```

### Step 2: Fix Permissions on VPS

```bash
# Once you know the path, fix permissions
sudo chown -R 1000:1000 /var/lib/docker/volumes/baileys_sessions/_data
sudo chown -R 1000:1000 /var/lib/docker/volumes/baileys_uploads/_data
sudo chmod -R 755 /var/lib/docker/volumes/baileys_sessions/_data
sudo chmod -R 755 /var/lib/docker/volumes/baileys_uploads/_data
```

### Step 3: Update Your Portainer Stack

1. **In Portainer UI**:
   - Go to **Stacks** → Select `baileys-server-pro`
   - Click **Editor**
   - Make sure your stack YAML includes `user: "1000:1000"`:

```yaml
version: "3.8"

services:
  baileys-server-pro:
    image: baileys-server-pro:latest
    container_name: baileys-server-pro
    restart: unless-stopped
    # Add this line for proper permissions
    user: "1000:1000"
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - baileys_sessions:/usr/src/app/sessions
      - baileys_uploads:/usr/src/app/uploads
    networks:
      - baileys-network

volumes:
  baileys_sessions:
    driver: local
  baileys_uploads:
    driver: local

networks:
  baileys-network:
    driver: bridge
```

2. Click **Update the stack**

### Step 4: Verify

```bash
# Check if container is running
docker ps | grep baileys

# Check logs
docker logs baileys-server-pro -f

# Should see successful session creation
```

## Alternative: Use Portainer Console

1. **In Portainer UI**:
   - Go to **Containers** → Select `baileys-server-pro`
   - Click **Console** → Select `/bin/sh`
   - Click **Connect**

2. **Test permissions inside container**:
```sh
# Inside container console
whoami
# Should show: node

id
# Should show: uid=1000(node) gid=1000(node)

ls -la /usr/src/app/
# Check if sessions and uploads are writable

touch /usr/src/app/sessions/test.txt
# If this works, permissions are OK
```

## Quick Fix Script for VPS (via SSH)

Save this as `fix-portainer-permissions.sh` on your VPS:

```bash
#!/bin/bash

echo "🔧 Fixing Portainer volume permissions..."

# Find volume paths
SESSIONS_PATH=$(docker volume inspect baileys_sessions -f '{{ .Mountpoint }}' 2>/dev/null)
UPLOADS_PATH=$(docker volume inspect baileys_uploads -f '{{ .Mountpoint }}' 2>/dev/null)

if [ -z "$SESSIONS_PATH" ]; then
    echo "❌ Volume 'baileys_sessions' not found"
    echo "Available volumes:"
    docker volume ls | grep baileys
    exit 1
fi

echo "📁 Found volumes:"
echo "   Sessions: $SESSIONS_PATH"
echo "   Uploads:  $UPLOADS_PATH"

# Fix permissions
echo "🔑 Setting ownership to 1000:1000..."
sudo chown -R 1000:1000 "$SESSIONS_PATH"
sudo chown -R 1000:1000 "$UPLOADS_PATH"
sudo chmod -R 755 "$SESSIONS_PATH"
sudo chmod -R 755 "$UPLOADS_PATH"

echo "✅ Permissions fixed!"
echo ""
echo "📋 Current permissions:"
sudo ls -la "$SESSIONS_PATH"
echo ""
echo "🔄 Now restart your container in Portainer"
echo "   Or run: docker restart baileys-server-pro"
```

## Complete Fix Process

### On Your Local Machine (Push Changes):
```bash
# Make sure changes are committed
git add .
git commit -m "Fix: Add user mapping for volume permissions"
git push origin local-dev
```

### On Your VPS (via SSH):

```bash
# 1. SSH into VPS
ssh user@zulfadli.com

# 2. Create the fix script
cat > fix-portainer-permissions.sh << 'EOF'
#!/bin/bash
echo "🔧 Fixing Portainer volume permissions..."
SESSIONS_PATH=$(docker volume inspect baileys_sessions -f '{{ .Mountpoint }}' 2>/dev/null)
UPLOADS_PATH=$(docker volume inspect baileys_uploads -f '{{ .Mountpoint }}' 2>/dev/null)
if [ -z "$SESSIONS_PATH" ]; then
    echo "❌ Volume 'baileys_sessions' not found"
    docker volume ls | grep baileys
    exit 1
fi
echo "📁 Sessions: $SESSIONS_PATH"
echo "📁 Uploads:  $UPLOADS_PATH"
sudo chown -R 1000:1000 "$SESSIONS_PATH" "$UPLOADS_PATH"
sudo chmod -R 755 "$SESSIONS_PATH" "$UPLOADS_PATH"
echo "✅ Permissions fixed!"
sudo ls -la "$SESSIONS_PATH"
EOF

# 3. Make it executable
chmod +x fix-portainer-permissions.sh

# 4. Run it
./fix-portainer-permissions.sh
```

### In Portainer UI:

1. **Rebuild the image** (if you updated Dockerfile):
   - Go to **Images** → Click **Build**
   - Or pull new image from registry

2. **Update Stack Configuration**:
   - Go to **Stacks** → `baileys-server-pro`
   - Add `user: "1000:1000"` line (as shown above)
   - Click **Update the stack**

3. **Check Logs**:
   - Go to **Containers** → `baileys-server-pro`
   - Click **Logs**
   - Should see: "✅ Server listening on http://127.0.0.1:3000"
   - Test creating a session - no more EACCES errors!

## Troubleshooting

### Can't find volumes?
```bash
# List all volumes
docker volume ls

# Find baileys-related volumes
docker volume ls | grep -i baileys
```

### Volume names different?
```bash
# Check what your container is actually using
docker inspect baileys-server-pro -f '{{ json .Mounts }}' | jq
```

### Still permission errors?
```bash
# Check volume path and fix
docker volume inspect YOUR_VOLUME_NAME

# Fix with actual path
sudo chown -R 1000:1000 /var/lib/docker/volumes/YOUR_VOLUME/_data
```

### Nuclear option (start fresh):
```bash
# Stop and remove container (in Portainer or via SSH)
docker stop baileys-server-pro
docker rm baileys-server-pro

# Remove volumes (WARNING: deletes all sessions!)
docker volume rm baileys_sessions baileys_uploads

# Recreate in Portainer with user: "1000:1000"
# Fresh start with correct permissions
```
