# Dockerfile

# --- Etapa 1: Builder ---
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
RUN apk add --no-cache git
COPY package*.json ./
RUN npm install
COPY . .

# --- Etapa 2: Producción ---
FROM node:18-alpine
WORKDIR /usr/src/app

ENV NODE_ENV=production
RUN apk add --no-cache git curl wget
COPY package*.json ./
RUN npm install --omit=dev --clean
COPY --from=builder /usr/src/app .

# Create required directories before changing ownership
RUN mkdir -p /usr/src/app/sessions /usr/src/app/uploads

EXPOSE 3000

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Give the 'node' user ownership of the application directory
# This ensures the user can create folders and write to 'sessions' and 'uploads'
RUN chown -R node:node /usr/src/app

# Run application as non-root user for security
# Note: If you encounter permission issues with volumes, you may need to:
# 1. Set user: "node:node" in docker-compose.yml, or
# 2. Fix host directory permissions, or
# 3. Comment out the USER line below (less secure)
USER node

# Set entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

# The command to start the application
CMD [ "node", "server.js" ]