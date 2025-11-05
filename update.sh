#!/bin/bash

# Quick Update Script for Baileys Server Pro
# Use this for HTML/CSS/JS changes without rebuilding the image

echo "🔄 Updating Baileys Server Pro container..."

# Copy updated files to container
if [ -f "public/index.html" ]; then
    echo "📄 Updating HTML files..."
    docker cp public/index.html baileys-server-pro:/usr/src/app/public/index.html
fi

if [ -d "public" ]; then
    echo "🎨 Updating static assets..."
    docker cp public/. baileys-server-pro:/usr/src/app/public/
fi

echo "✅ Container updated successfully!"
echo "🌐 Visit: http://localhost:3000"