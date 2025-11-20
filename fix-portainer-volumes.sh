#!/bin/bash
# Simple Portainer Volume Permission Fix

echo "🔍 Checking for Baileys volumes..."

# Check for volumes with different naming patterns
SESSIONS_VOLUME=""
UPLOADS_VOLUME=""

# Try stack-prefixed names first (Portainer default)
if docker volume ls | grep -q "baileys-server-pro_wasap_sessions"; then
    SESSIONS_VOLUME="baileys-server-pro_wasap_sessions"
    UPLOADS_VOLUME="baileys-server-pro_wasap_uploads"
# Try simple names
elif docker volume ls | grep -q "wasap_sessions"; then
    SESSIONS_VOLUME="wasap_sessions"
    UPLOADS_VOLUME="wasap_uploads"
else
    echo "❌ Baileys volumes not found!"
    echo ""
    echo "📋 Available volumes:"
    docker volume ls
    echo ""
    echo "💡 You need to deploy the stack in Portainer first."
    echo "   After the stack is deployed, run this script again."
    exit 1
fi

echo "✅ Volumes found!"
echo "   - $SESSIONS_VOLUME"
echo "   - $UPLOADS_VOLUME"
echo ""

# Get volume paths
SESSIONS_PATH=$(docker volume inspect "$SESSIONS_VOLUME" --format '{{ .Mountpoint }}')
UPLOADS_PATH=$(docker volume inspect "$UPLOADS_VOLUME" --format '{{ .Mountpoint }}')

echo "📁 Volume paths:"
echo "   Sessions: $SESSIONS_PATH"
echo "   Uploads:  $UPLOADS_PATH"
echo ""

# Fix permissions
echo "🔑 Fixing permissions..."
chown -R 1000:1000 "$SESSIONS_PATH" "$UPLOADS_PATH"
chmod -R 755 "$SESSIONS_PATH" "$UPLOADS_PATH"

echo ""
echo "✅ Permissions fixed!"
echo ""
echo "📋 Current ownership:"
ls -la "$SESSIONS_PATH" 2>/dev/null || echo "   (directory will be created on first use)"
echo ""
echo "🔄 Restarting container..."
docker restart baileys-server-pro

echo ""
echo "🎉 Done! Check logs with:"
echo "   docker logs baileys-server-pro -f"
