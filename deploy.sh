#!/bin/bash

# Baileys Server Pro - Docker Deployment Script
# Usage: ./deploy.sh [registry-url] [tag]

set -e

REGISTRY=${1:-"localhost:5000"}
TAG=${2:-"latest"}
IMAGE_NAME="${REGISTRY}/baileys-server-pro:${TAG}"

echo "🚀 Building Baileys Server Pro Docker Image"
echo "Registry: ${REGISTRY}"
echo "Tag: ${TAG}"
echo "Full Image Name: ${IMAGE_NAME}"
echo

# Build the Docker image
echo "📦 Building image..."
docker build -t ${IMAGE_NAME} .

# Push to registry (skip if localhost)
if [[ "${REGISTRY}" != "localhost"* ]]; then
    echo "⬆️  Pushing image to registry..."
    docker push ${IMAGE_NAME}
fi

echo
echo "✅ Build complete!"
echo "Image: ${IMAGE_NAME}"
echo
echo "📋 Portainer Deployment Instructions:"
echo "1. Go to portainer.test/"
echo "2. Navigate to Stacks → Add Stack"
echo "3. Name: baileys-server-pro"
echo "4. Repository URL: https://github.com/dev-juanda01/baileys-server-pro"
echo "5. Compose path: portainer-stack.yml"
echo "6. Deploy!"
echo
echo "🔗 After deployment, access:"
echo "• API: http://your-server:3000"
echo "• Docs: http://your-server:3000/api-docs"