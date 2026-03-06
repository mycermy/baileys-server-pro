# Portainer CE Installation and Removal Guide

This guide provides step-by-step instructions for installing and removing Portainer Community Edition (CE) using Docker on Linux. These steps work on Linux (including VPS) with Docker installed. For macOS or Windows, refer to the respective documentation.

## Prerequisites

- The latest [supported](https://docs.portainer.io/start/requirements-and-prerequisites) version of Docker installed and working. We recommend following the [official installation instructions](https://docs.docker.com/engine/install/) for Docker - in particular, we advise against installing Docker via snap on Ubuntu distributions as you may run into compatibility issues.
- sudo access on the machine that will host your Portainer Server instance.
- Basic knowledge of terminal/command line.

**Assumptions:**
- Your environment meets [our requirements](https://docs.portainer.io/start/requirements-and-prerequisites). While Portainer may work with other configurations, it may require configuration changes or have limited functionality.
- You are accessing Docker via Unix sockets. Alternatively, you can also connect via TCP.
- SELinux is disabled on the machine running Docker. If you require SELinux, you will need to pass the `--privileged` flag to Docker when deploying Portainer.
- Docker is running as root. Portainer with rootless Docker has some limitations and requires additional configuration.

Portainer consists of two elements: the Portainer Server and the Portainer Agent. Both run as lightweight Docker containers. This guide installs the Portainer Server. To add environments, refer to the [Portainer Agent instructions](https://docs.portainer.io/admin/environments/add/docker/agent).

By default, Portainer Server exposes the UI over port `9443` and a TCP tunnel server over port `8000`. The latter is optional and only required for Edge compute features with Edge agents.

## Installation Steps

You can deploy Portainer using `docker run` or Docker Compose.

### Option 1: Using Docker Run

1. Create the volume that Portainer Server will use to store its database:

   ```bash
   docker volume create portainer_data
   ```

2. Download and install the Portainer Server container:

   ```bash
   docker run -d -p 8000:8000 -p 9443:9443 --name portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce:lts
   ```

   By default, Portainer generates and uses a self-signed SSL certificate to secure port `9443`. Alternatively, you can provide your own SSL certificate [during installation](https://docs.portainer.io/advanced/ssl#using-your-own-ssl-certificate-on-docker-standalone) or [via the Portainer UI](https://docs.portainer.io/admin/settings#ssl-certificate) after installation.

   If you require HTTP port `9000` open for legacy reasons, add `-p 9000:9000` to the command.

### Option 2: Using Docker Compose

1. Download the compose file:

   ```bash
   curl -L https://downloads.portainer.io/ce-lts/portainer-compose.yaml -o portainer-compose.yaml
   ```

   Alternatively, create a `portainer-compose.yaml` file with the following contents:

   ```yaml
   services:
     portainer:
       container_name: portainer
       image: portainer/portainer-ce:lts
       restart: always
       volumes:
         - /var/run/docker.sock:/var/run/docker.sock
         - portainer_data:/data
       ports:
         - 9443:9443
         - 8000:8000  # Remove if you do not intend to use Edge Agents

   volumes:
     portainer_data:
       name: portainer_data

   networks:
     default:
       name: portainer_network
   ```

2. Deploy Portainer:

   ```bash
   docker compose -f portainer-compose.yaml up -d
   ```

### Verify Installation

Check that Portainer is running:

```bash
docker ps | grep portainer
```

You should see output similar to:

```
CONTAINER ID   IMAGE                        COMMAND        CREATED         STATUS         PORTS                                                                                                NAMES
7963585688a9   portainer/portainer-ce:lts   "/portainer"   8 seconds ago   Up 8 seconds   0.0.0.0:8000->8000/tcp, [::]:8000->8000/tcp, 0.0.0.0:9443->9443/tcp, [::]:9443->9443/tcp, 9000/tcp   portainer
```

### Access Portainer

1. Open your web browser and go to `https://localhost:9443` (replace `localhost` with your server's IP or FQDN if needed).
2. Accept the self-signed certificate warning.
3. Complete the initial setup to create an admin user.

**Important:** Portainer's web interface runs on HTTPS only (port 9443). Port 8000 is for Edge agent communication and does not serve the web UI.

## Removal Steps

### Step 1: Stop the Portainer Container

Stop the running Portainer container:

```bash
docker stop portainer
```

### Step 2: Remove the Portainer Container

Remove the stopped container:

```bash
docker rm portainer
```

### Step 3: Remove the Portainer Image (Optional)

If you want to remove the Portainer CE image:

```bash
docker rmi portainer/portainer-ce
```

### Step 4: Remove the Data Volume (Optional - WARNING: This deletes all Portainer data)

If you want to completely remove all Portainer data:

```bash
docker volume rm portainer_data
```

**⚠️ WARNING:** Removing the data volume will delete all Portainer configurations, users, and settings. Make sure to backup important data before doing this.

### Step 5: Verify Removal

Check that Portainer is completely removed:

```bash
docker ps -a | grep portainer  # Should show no results
docker images | grep portainer  # Should show no results if image was removed
docker volume ls | grep portainer_data  # Should show no results if volume was removed
```

## Troubleshooting

### Port Already in Use
If ports 8000 or 9443 are already in use, change the port mapping:

```bash
docker run -d \
  -p 8001:8000 \
  -p 9444:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

### Permission Issues on macOS/Linux
If you encounter permission issues with Docker socket:

```bash
sudo chmod 666 /var/run/docker.sock
```

**Note:** This is less secure. Consider adding your user to the docker group instead.

### Cannot Connect to Docker Socket
Ensure Docker is running and the socket exists:

```bash
docker info
ls -la /var/run/docker.sock
```

### Reset Admin Password
If you forget the admin password, you can reset it by removing the data volume and recreating the container (this will reset all settings).

### Local Environment Connection Issues (Linux Server)
If the local environment keeps going "down" when trying to live connect on a Linux server:

1. **Check Docker socket permissions:**
   ```bash
   ls -la /var/run/docker.sock
   # Should show: srw-rw---- 1 root docker
   ```

2. **Add your user to docker group:**
   ```bash
   sudo usermod -aG docker $USER
   # Log out and back in, or restart your shell session
   ```

3. **If running as root, ensure proper permissions:**
   ```bash
   sudo chmod 666 /var/run/docker.sock
   # OR better: sudo chown root:docker /var/run/docker.sock
   ```

4. **Check SELinux/AppArmor (if enabled):**
   ```bash
   # For SELinux:
   sudo setsebool -P docker_connect_any 1
   
   # For AppArmor (Ubuntu/Debian):
   sudo apparmor_parser -r -W /etc/apparmor.d/docker
   ```

5. **Change restart policy to 'always':**
   ```yaml
   restart: always  # Instead of unless-stopped
   ```

6. **Verify Docker daemon is accessible:**
   ```bash
   docker info
   docker ps
   ```

7. **Check Portainer container logs:**
   ```bash
   docker logs portainer
   ```

8. **Restart Portainer and Docker:**
   ```bash
   sudo systemctl restart docker
   docker restart portainer
   ```

**Most common fix:** Change `restart: unless-stopped` to `restart: always` and ensure your user is in the docker group.

## Additional Notes

- Portainer CE is free and open-source
- For production use, consider using Portainer Business Edition for additional features
- Always backup your Portainer data volume before major updates
- The container will automatically restart on system reboot due to `--restart=always`

## Using with Docker Compose (Alternative Installation)

**Recommended setup:** Create a dedicated folder for Portainer and place your compose file there:

```bash
mkdir portainer
cd portainer
```

Create a `docker-compose.yml` file with the following contents (or download it as shown in the installation steps above):

```yaml
services:
  portainer:
    container_name: portainer
    image: portainer/portainer-ce:lts
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    ports:
      - 9443:9443
      - 8000:8000  # Remove if you do not intend to use Edge Agents

volumes:
  portainer_data:
    name: portainer_data

networks:
  default:
    name: portainer_network
```

**Network behavior:** If no `networks` section is specified, Docker Compose automatically creates a default network named after your project directory. Portainer doesn't need inter-container communication, so the default network is sufficient.

Then run:

```bash
docker compose up -d
```

For removal with Docker Compose:

```bash
docker compose down
docker compose down -v  # Also removes volumes
```

**Docker Compose commands:**
- **Start services:** `docker compose up -d`
- **Stop services:** `docker compose down`
- **Stop and remove volumes:** `docker compose down -v`
- **View logs:** `docker compose logs`
- **View running services:** `docker compose ps`

### Remote Docker Agent Setup (Advanced)

For connecting to a remote Docker environment via Portainer Agent, use this configuration (based on the GitHub example you shared):

```yaml
version: '3.8'

services:
  portainer:
    image: portainer/portainer-ce:lts
    command: >
      -H tcp://agent:9001 --tlsskipverify
    ports:
      - "80:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - labnetwork

networks:
  labnetwork:
    external: true

volumes:
  portainer_data:
    name: portainer_data
```

**Key differences:**
- Uses `-H tcp://agent:9001 --tlsskipverify` to connect to a Portainer Agent running on another host
- Maps port **80** (HTTP) to container port **9000** (web UI) - **HTTP only, no HTTPS**
- Requires an external network named `labnetwork` for communication with the agent
- **Skips TLS verification** (`--tlsskipverify`) - **NOT SECURE** for production

**What this means:** This setup connects Portainer to a remote Docker environment via a Portainer Agent. The web UI runs on HTTP port 80 (not HTTPS) and communicates with the agent at `tcp://agent:9001`. Use this when you want to manage Docker on a different server through an agent.

#### Secure HTTPS Setup (Recommended for Production)

For secure connections, configure the Portainer Agent with TLS certificates and use:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:lts
    command: >
      -H https://agent:9001
    ports:
      - "443:9443"  # HTTPS port
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
      - /path/to/certs:/certs  # Mount certificates
    environment:
      - AGENT_SECRET=your-secret-key
    networks:
      - labnetwork
```

**Requirements for HTTPS:**
1. Portainer Agent must be configured with TLS certificates
2. Use `https://` instead of `tcp://`
3. Remove `--tlsskipverify` flag
4. Mount certificate files if needed
5. Set `AGENT_SECRET` environment variable for authentication