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
fi

# Check for local changes
if [[ -n $(git status --porcelain) ]]; then
    echo "⚠️  Warning: You have uncommitted local changes!"
    echo "These changes will be used for deployment but not pushed to origin."
    echo "Consider committing and pushing your changes first."
    echo
else
    echo "Pulling latest changes from origin..."
    git pull origin ${BRANCH}
fi

echo
echo "🔄 Redeploying container..."
docker-compose down
docker-compose build --no-cache  # Force rebuild with new code
docker-compose up -d
echo "✅ Container redeployed!"

# Build and tag for registry deployment (only if registry is specified)
if [[ "${REGISTRY}" != "localhost"* ]]; then
    echo "🏷️  Tagging image for registry..."
    docker tag baileys-server-pro-baileys-server-pro ${IMAGE_NAME}
    echo "⬆️  Pushing image to registry..."
    docker push ${IMAGE_NAME}
fi
echo
echo "✅ Deployment complete!"
echo "Local Image: baileys-server-pro-baileys-server-pro"
if [[ "${REGISTRY}" != "localhost"* ]]; then
    echo "Registry Image: ${IMAGE_NAME}"
fi
echo
echo "📋 Portainer Deployment Instructions:"
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