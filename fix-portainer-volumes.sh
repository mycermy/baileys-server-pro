#!/bin/bash
# Simple Portainer Volume Permission Fix

echo "🔍 Checking for Baileys volumes..."

# Check if volumes exist
if ! docker volume ls | grep -q baileys_sessions; then
    echo "❌ Volume 'baileys_sessions' not found!"
    echo ""
    echo "📋 Available volumes:"
    docker volume ls
    echo ""
    echo "💡 You need to deploy the stack in Portainer first."
    echo "   After the stack is deployed, run this script again."
    exit 1
fi

echo "✅ Volumes found!"
echo ""

# Get volume paths
SESSIONS_PATH=$(docker volume inspect baileys_sessions --format '{{ .Mountpoint }}')
UPLOADS_PATH=$(docker volume inspect baileys_uploads --format '{{ .Mountpoint }}')

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
