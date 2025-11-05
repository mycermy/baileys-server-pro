#!/bin/bash

# Quick Permission Fix for Portainer Volumes
# Run this on your VPS after deploying the stack

echo "🔧 Baileys Server Pro - Permission Fix"
echo "=========================================="
echo ""

# Find and fix sessions volume
echo "📁 Fixing sessions volume..."
SESSIONS_PATH=$(docker volume inspect baileys_sessions 2>/dev/null | grep Mountpoint | awk '{print $2}' | tr -d ',"')

if [ -z "$SESSIONS_PATH" ]; then
    echo "⚠️  Volume 'baileys_sessions' not found yet"
    echo "   Deploy the stack in Portainer first, then run this script"
    exit 1
fi

# Find and fix uploads volume
echo "📁 Fixing uploads volume..."
UPLOADS_PATH=$(docker volume inspect baileys_uploads 2>/dev/null | grep Mountpoint | awk '{print $2}' | tr -d ',"')

echo ""
echo "Found volumes:"
echo "  Sessions: $SESSIONS_PATH"
echo "  Uploads:  $UPLOADS_PATH"
echo ""

# Fix permissions
echo "🔑 Setting ownership to 1000:1000..."
sudo chown -R 1000:1000 "$SESSIONS_PATH" "$UPLOADS_PATH"
sudo chmod -R 755 "$SESSIONS_PATH" "$UPLOADS_PATH"

echo ""
echo "✅ Permissions fixed!"
echo ""
echo "📋 Current permissions:"
sudo ls -la "$SESSIONS_PATH"
echo ""
echo "🔄 Now restart the container:"
echo "   docker restart baileys-server-pro"
echo "   Or use Portainer UI to restart the stack"
echo ""
echo "🎉 Done! Your sessions should work now."
