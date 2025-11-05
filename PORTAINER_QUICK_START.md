# 🚀 Portainer Deployment Guide

## Setup in 3 Steps

### Step 1: Deploy Stack in Portainer

1. Open Portainer → **Stacks** → **Add Stack**
2. Fill in:
   - **Name**: `baileys-server-pro`
   - **Build method**: ✅ **Repository**
   - **Repository URL**: `https://github.com/mycermy/baileys-server-pro`
   - **Repository reference**: `refs/heads/local-dev`
   - **Compose path**: `portainer-stack.yml`
3. Click **Deploy the stack**

---

### Step 2: Fix Permissions on VPS

SSH into your VPS and run ONE of these:

**Option A: One-liner (for root user)**
```bash
docker volume inspect baileys-server-pro_baileys_sessions --format '{{ .Mountpoint }}' | xargs chown -R 1000:1000 && \
docker volume inspect baileys-server-pro_baileys_uploads --format '{{ .Mountpoint }}' | xargs chown -R 1000:1000 && \
echo "✅ Permissions fixed!"
```

**Option B: Use the automated script**
```bash
curl -o fix.sh https://raw.githubusercontent.com/mycermy/baileys-server-pro/local-dev/fix-portainer-volumes.sh
chmod +x fix.sh
./fix.sh
```

---

### Step 3: Restart Container

```bash
docker restart baileys-server-pro
docker logs baileys-server-pro --tail 20
```

**Expected output:**
```
✅ Server listening on http://127.0.0.1:3000
```

✅ No more EACCES errors!

---

## Security Configuration

- 🔒 **Localhost only**: Server binds to `127.0.0.1:3000`
- 🛡️ **Not accessible from internet** (protected from attacks)
- ✅ **Only your VPS apps can access it** (like ZRInv)

**Use in your ZRInv project:**
```javascript
const BAILEYS_API_URL = 'http://localhost:3000';
```

---

## Troubleshooting

### Error: "pull access denied"
✅ Fixed - use Repository method in Portainer

### Error: "EACCES: permission denied"
Run the permission fix script (Step 2)

### Check volumes exist:
```bash
docker volume ls | grep baileys
```

### Check container status:
```bash
docker ps | grep baileys
docker logs baileys-server-pro
```

---

## Update Code

1. Push changes to GitHub
2. In Portainer → Stack → **Pull and redeploy**
