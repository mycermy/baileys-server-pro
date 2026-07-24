#!/bin/bash
# Setup script to create symlinks for Baileys volumes and fix permissions

echo "🔍 Checking for Baileys volumes..."

# Check for volumes with different naming patterns
SESSIONS_VOLUME=""
UPLOADS_VOLUME=""

# Try stack-prefixed names first (Portainer default)
if docker volume ls | grep -q "baileys-server-pro_baileys_sessions"; then
    SESSIONS_VOLUME="baileys-server-pro_baileys_sessions"
    UPLOADS_VOLUME="baileys-server-pro_baileys_uploads"
elif docker volume ls | grep -q "baileys-server-pro_wasap_sessions"; then
    SESSIONS_VOLUME="baileys-server-pro_wasap_sessions"
    UPLOADS_VOLUME="baileys-server-pro_wasap_uploads"
# Try simple names
elif docker volume ls | grep -q "wasap_sessions"; then
    SESSIONS_VOLUME="wasap_sessions"
    UPLOADS_VOLUME="wasap_uploads"
elif docker volume ls | grep -q "baileys_sessions"; then
    SESSIONS_VOLUME="baileys_sessions"
    UPLOADS_VOLUME="baileys_uploads"
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

# Ensure parent directories are traversable by web server users
# (Docker resets these on boot, causing "Server Sessions (0)" after reboot)
echo "🔑 Fixing parent directory traversal permissions..."
sudo chmod o+rx /var/lib/docker
sudo chmod o+rx /var/lib/docker/volumes
sudo chmod o+rx "$SESSIONS_PATH"
sudo chmod o+rx "$UPLOADS_PATH"

# Fix permissions on volume contents
echo "🔑 Fixing volume content permissions..."
sudo chown -R 1000:1000 "$SESSIONS_PATH" "$UPLOADS_PATH"
sudo chmod -R 755 "$SESSIONS_PATH" "$UPLOADS_PATH"

echo ""
echo "✅ Permissions fixed!"
echo ""

# Create symlinks
BACKUP_DIR="/home/zulfadli.com/backups"
echo "🔗 Creating symlinks in $BACKUP_DIR..."
sudo mkdir -p "$BACKUP_DIR"

# Remove existing symlinks if they exist
sudo rm -f "$BACKUP_DIR/sessions" "$BACKUP_DIR/uploads"

# Create new symlinks
sudo ln -s "$SESSIONS_PATH" "$BACKUP_DIR/sessions"
sudo ln -s "$UPLOADS_PATH" "$BACKUP_DIR/uploads"

# Fix symlink permissions (make them accessible to your user)
chown -h zulfa5798:zulfa5798 "$BACKUP_DIR/sessions" "$BACKUP_DIR/uploads"

# Add user to group 1000 for volume access
usermod -aG 1000 zulfa5798

echo "✅ Symlinks created!"
echo "   - $BACKUP_DIR/sessions -> $SESSIONS_PATH"
echo "   - $BACKUP_DIR/uploads -> $UPLOADS_PATH"
echo ""

echo "📋 Current ownership:"
ls -la "$SESSIONS_PATH" 2>/dev/null || echo "   (directory will be created on first use)"
echo ""
echo "🔄 Restarting container..."
docker restart baileys-server-pro

echo ""
echo "🎉 Done! Check logs with:"
echo "   docker logs baileys-server-pro -f"
echo ""
echo "💡 You can now edit directly via:"
echo "   ls -la $BACKUP_DIR/sessions"
echo "   nano $BACKUP_DIR/sessions/some-file"