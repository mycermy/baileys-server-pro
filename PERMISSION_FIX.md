# Permission Issues Fix Guide

## Error: EACCES (Permission Denied)

```
Error al iniciar la sesión ZRInvois
error: {
  "errno": -13,
  "syscall": "mkdir",
  "code": "EACCES",
  "path": "/usr/src/app/sessions/ZRInvois"
}
```

This error occurs when the Node.js process inside the container doesn't have permission to create directories in the mounted volume.

## Quick Fix (On Your VPS)

### Step 1: Stop the container
```bash
docker-compose down
# OR in Portainer: Stop the stack
```

### Step 2: Fix permissions
```bash
# Run the fix script
./fix-permissions.sh

# Or manually:
sudo chown -R 1000:1000 sessions uploads
sudo chmod -R 755 sessions uploads
```

### Step 3: Rebuild and restart
```bash
# Rebuild the image
docker-compose build

# Start the container
docker-compose up -d

# Check logs
docker logs baileys-server-pro -f
```

## What Changed

### ✅ Dockerfile
- Added `sessions` directory creation
- Kept `node` user for security

### ✅ docker-compose.yml
- Added `user: "1000:1000"` to run as node user
- This ensures proper permissions with host volumes

### ✅ portainer-stack.yml
- Added `user: "1000:1000"` for consistency

## Understanding the Issue

### The Problem:
1. Docker container runs as `node` user (UID 1000)
2. Volume mounted from host may be owned by `root` (UID 0)
3. Node user can't write to root-owned directory
4. Result: EACCES error

### The Solution:
1. Set volume ownership to UID 1000 on host
2. Configure container to run as UID 1000
3. Now user IDs match → permissions work!

## Verification Commands

### Check container user:
```bash
docker exec baileys-server-pro id
# Should show: uid=1000(node) gid=1000(node)
```

### Check directory permissions:
```bash
ls -la sessions/
# Should show: drwxr-xr-x ... 1000 1000 ... sessions/
```

### Check if app can write:
```bash
docker exec baileys-server-pro touch /usr/src/app/sessions/test.txt
docker exec baileys-server-pro ls -la /usr/src/app/sessions/test.txt
```

## Alternative Solutions

### Option 1: Run as root (Not Recommended)
In `Dockerfile`, comment out:
```dockerfile
# USER node
```

**Pros:** Works immediately
**Cons:** Security risk (running as root)

### Option 2: Different UID
If your host user has a different UID:
```bash
# Find your UID
id -u

# Update docker-compose.yml
user: "YOUR_UID:YOUR_GID"
```

### Option 3: Named volumes (Portainer default)
Use Docker-managed volumes instead of bind mounts:
```yaml
volumes:
  - baileys_sessions:/usr/src/app/sessions
  - baileys_uploads:/usr/src/app/uploads

volumes:
  baileys_sessions:
    driver: local
  baileys_uploads:
    driver: local
```

**Pros:** Automatic permission handling
**Cons:** Harder to access files from host

## For Portainer Users

### Using the Fix Script:
1. **SSH into your VPS**
2. **Navigate to project directory**
   ```bash
   cd /path/to/baileys-server-pro
   ```
3. **Run fix script**
   ```bash
   ./fix-permissions.sh
   ```
4. **In Portainer**: Update stack with new configuration
5. **Redeploy the stack**

### Or Set Permissions Manually:
```bash
# On your VPS
cd /var/lib/docker/volumes/

# Find your volume
sudo ls -la | grep baileys

# Fix permissions
sudo chown -R 1000:1000 baileys_sessions baileys_uploads
```

## Troubleshooting

### Still getting EACCES after fix?

**Check 1:** Container user
```bash
docker exec baileys-server-pro whoami
# Should show: node
```

**Check 2:** Volume permissions inside container
```bash
docker exec baileys-server-pro ls -la /usr/src/app/
# sessions and uploads should be owned by 'node'
```

**Check 3:** SELinux (if on CentOS/RHEL)
```bash
# Check if SELinux is enforcing
getenforce

# If yes, add :z or :Z to volume mounts
volumes:
  - ./sessions:/usr/src/app/sessions:z
```

**Check 4:** AppArmor (if on Ubuntu)
```bash
# Check AppArmor status
sudo aa-status

# May need to adjust Docker profile
```

### Logs still show permission errors?

**Nuclear option (last resort):**
```bash
# Stop everything
docker-compose down -v

# Remove old volumes
sudo rm -rf sessions uploads

# Recreate with correct permissions
mkdir -p sessions uploads
sudo chown -R 1000:1000 sessions uploads
chmod -R 755 sessions uploads

# Rebuild and start
docker-compose build --no-cache
docker-compose up -d
```

## Success Indicators

✅ **Container starts without errors**
```bash
docker logs baileys-server-pro
# Should show: "Server listening on http://127.0.0.1:3000"
```

✅ **Can create sessions**
```bash
curl -X POST http://localhost:3000/api/sessions/start \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-session"}'
```

✅ **Session directory created**
```bash
ls -la sessions/
# Should show: test-session/
```

## Prevention

To avoid this issue in the future:

1. ✅ Always use `user: "1000:1000"` in docker-compose
2. ✅ Set correct permissions before first run
3. ✅ Use the provided `fix-permissions.sh` script
4. ✅ Document your UID/GID if different from 1000

## Need Help?

If you're still experiencing issues:
1. Check container logs: `docker logs baileys-server-pro`
2. Verify permissions: `ls -la sessions/`
3. Check user: `docker exec baileys-server-pro id`
4. Review this guide again 📖
