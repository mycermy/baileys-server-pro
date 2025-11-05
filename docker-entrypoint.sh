#!/bin/sh
set -e

# Entrypoint script to ensure proper permissions for sessions and uploads directories

echo "🔧 Checking and fixing permissions..."

# Create directories if they don't exist (should already exist from Dockerfile)
mkdir -p /usr/src/app/sessions /usr/src/app/uploads

# Check if we can write to the directories
if [ ! -w "/usr/src/app/sessions" ] || [ ! -w "/usr/src/app/uploads" ]; then
    echo "⚠️  Warning: Cannot write to sessions or uploads directory"
    echo "📋 Current permissions:"
    ls -la /usr/src/app/ | grep -E "sessions|uploads"
    echo ""
    echo "💡 This container needs proper volume permissions."
    echo "   Run this on your host/VPS:"
    echo "   sudo chown -R 1000:1000 /path/to/sessions /path/to/uploads"
    echo ""
fi

echo "✅ Permission check complete"
echo "🚀 Starting application..."

# Execute the main command (node server.js)
exec "$@"
