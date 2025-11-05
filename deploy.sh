#!/bin/bash

# Baileys Server Pro - Docker Deployment Script
# Usage: ./deploy.sh [registry-url] [tag] [branch]
# Examples:
#   ./deploy.sh                    # localhost:5000, latest, local-dev
#   ./deploy.sh myregistry.com v1.0.0 main
#   ./deploy.sh "" "" production   # deploy production branch [branch]

set -e

REGISTRY=${1:-"localhost:5000"}
TAG=${2:-"latest"}
BRANCH=${3:-"local-dev"}
IMAGE_NAME="${REGISTRY}/baileys-server-pro:${TAG}"

echo "🚀 Building Baileys Server Pro Docker Image"
echo "Registry: ${REGISTRY}"
echo "Tag: ${TAG}"
echo "Branch: ${BRANCH}"
echo "Full Image Name: ${IMAGE_NAME}"
echo

# Check and switch to specified branch
echo "🌿 Checking git branch..."
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: ${CURRENT_BRANCH}"

if [ "${CURRENT_BRANCH}" != "${BRANCH}" ]; then
    echo "Switching to branch: ${BRANCH}"
    git checkout ${BRANCH}
    git pull origin ${BRANCH}
else
    echo "Already on branch: ${BRANCH}"
    git pull origin ${BRANCH}
fi

echo
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
echo "� Redeploying container..."
docker-compose down
docker-compose up -d
echo "✅ Container redeployed!"
echo
echo " Portainer Deployment Instructions:"
echo "1. Go to portainer.test/"
echo "2. Navigate to Stacks → Add Stack"
echo "3. Name: baileys-server-pro"
echo "4. Repository URL: https://github.com/mycermy/baileys-server-pro"
echo "5. Reference: Branch '${BRANCH}'"
echo "6. Compose path: portainer-stack.yml"
echo "7. Deploy!"
echo
echo "🔗 After deployment, access:"
echo "• API: http://your-server:3000"
echo "• Docs: http://your-server:3000/api-docs"