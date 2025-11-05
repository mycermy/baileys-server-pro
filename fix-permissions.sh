#!/bin/bash

# Fix Permissions Script for Baileys Server Pro
# This script fixes permission issues with Docker volumes

echo "🔧 Fixing permissions for Baileys Server Pro..."

# Create directories if they don't exist
mkdir -p sessions uploads

# Get the node user UID from the Docker image (usually 1000)
NODE_UID=1000
NODE_GID=1000

echo "📁 Setting ownership to UID:GID = $NODE_UID:$NODE_GID"

# Fix permissions for sessions and uploads directories
# Use sudo if current user doesn't own the directories
if [ -w "sessions" ] && [ -w "uploads" ]; then
    chown -R $NODE_UID:$NODE_GID sessions uploads
    chmod -R 755 sessions uploads
else
    echo "⚠️  Need sudo privileges to fix permissions..."
    sudo chown -R $NODE_UID:$NODE_GID sessions uploads
    sudo chmod -R 755 sessions uploads
fi

echo "✅ Permissions fixed!"
echo ""
echo "📋 Directory ownership:"
ls -la | grep -E "sessions|uploads"
echo ""
echo "🚀 Now you can start the container:"
echo "   docker-compose up -d"
echo "   or restart your Portainer stack"
