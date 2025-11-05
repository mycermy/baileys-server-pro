# 🚀 Portainer Deployment Guide

## Complete Setup in 3 Steps

### Step 1: Deploy Stack in Portainer

1. Open Portainer web interface
2. Go to **Stacks** → **Add Stack**
3. Fill in:
   - **Name**: `baileys-server-pro`
   - **Build method**: Select **Repository**
   - **Repository URL**: `https://github.com/mycermy/baileys-server-pro`
   - **Repository reference**: `refs/heads/local-dev`
   - **Compose path**: `portainer-stack.yml`
4. Click **Deploy the stack**

✅ Stack will build and start (but will have permission errors initially)

---

### Step 2: Fix Permissions on VPS

SSH into your VPS and run:

```bash
# Quick one-liner fix
docker volume inspect baileys_sessions 2>/dev/null | grep Mountpoint | awk '{print $2}' | tr -d ',"' | xargs sudo chown -R 1000:1000 && \
docker volume inspect baileys_uploads 2>/dev/null | grep Mountpoint | awk '{print $2}' | tr -d ',"' | xargs sudo chown -R 1000:1000 && \
echo "✅ Permissions fixed!"
```

**Or use the provided script:**

```bash
# Clone the repo on your VPS
git clone https://github.com/mycermy/baileys-server-pro.git
cd baileys-server-pro

# Run the fix script
./fix-portainer-volumes.sh
```

---

### Step 3: Restart Container

**In Portainer:**
- Go to **Containers** → Find `baileys-server-pro`
- Click **Restart**

**Or via SSH:**
```bash
docker restart baileys-server-pro
```

**Check logs:**
- In Portainer: **Containers** → `baileys-server-pro` → **Logs**
- Should see: `✅ Server listening on http://127.0.0.1:3000`
- No more EACCES errors! 🎉

---

## Troubleshooting

### Error: "pull access denied for baileys-server-pro"

✅ **Fixed!** The updated `portainer-stack.yml` now uses `build:` instead of `image:`

### Error: "EACCES: permission denied"

Run the permission fix script (Step 2 above)

### Error: "version is obsolete"

This is just a warning, you can safely ignore it or remove `version: "3.8"` from the YAML

### Need to Update Code?

1. **Push changes to GitHub**
2. **In Portainer**: Go to your stack → Click **Pull and redeploy**

---

## What's Configured

✅ **Security**: Localhost-only access (`127.0.0.1:3000`)  
✅ **Permissions**: Runs as non-root user (UID 1000)  
✅ **Persistence**: Volumes for sessions and uploads  
✅ **Auto-restart**: Container restarts on failure  
✅ **Health checks**: Automatic monitoring  

---

## Testing Your Deployment

### From VPS (should work):
```bash
curl http://localhost:3000/api/config
```

### From ZRInv project:
```javascript
const BAILEYS_API_URL = 'http://localhost:3000';
```

### From internet (should fail - security):
```bash
curl http://zulfadli.com:3000
# Connection refused or timeout (this is good!)
```

---

## Quick Reference

| Action | Command/Location |
|--------|-----------------|
| View logs | Portainer → Containers → baileys-server-pro → Logs |
| Restart | Portainer → Containers → baileys-server-pro → Restart |
| Update code | Portainer → Stacks → baileys-server-pro → Pull and redeploy |
| Fix permissions | SSH: `./fix-portainer-volumes.sh` |
| Check status | `docker ps \| grep baileys` |

---

## Need More Help?

- 📖 Full permission guide: [PORTAINER_PERMISSION_FIX.md](PORTAINER_PERMISSION_FIX.md)
- 🔒 Security setup: [SECURITY_SETUP.md](SECURITY_SETUP.md)
- 🚀 VPS deployment: [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md)
