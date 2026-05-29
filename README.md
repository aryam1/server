# Server Infrastructure as Code

Complete, reproducible VPS setup for Ubuntu. Automates everything except manual authentication steps.

## What's Included

- **System packages** — Essential tools (nginx, docker, tailscale, etc.)
- **Nginx** — Reverse proxy with 3 vhost configurations (static site + 2 docker proxies)
- **Docker services** — Audiobookshelf and Filebrowser
- **SSH hardening** — Key-based auth only, root login disabled
- **UFW firewall** — Strict rules (HTTP, HTTPS allowed; SSH and Docker ports blocked)
- **Tailscale** — Secure VPN tunnel (manual auth required)
- **Unattended-upgrades** — Automatic security updates

## Quick Start

### 1. Clone this repo on your VPS

```bash
git clone https://github.com/aryam1/server.git ~/server
cd ~/server
```

### 2. Run the provisioning script

```bash
sudo bash provision.sh
```

This will:
- ✓ Update and install all packages
- ✓ Configure SSH hardening
- ✓ Setup UFW firewall rules
- ✓ Install and configure Docker
- ✓ Setup Nginx with vhosts
- ✓ Install Tailscale daemon

### 3. Complete manual steps

**SSL Certificates** (using Let's Encrypt):
```bash
sudo certbot --nginx -d aryam.dev -d www.aryam.dev -d abs.aryam.dev -d files.aryam.dev
```

**Tailscale Authentication** (establishes secure tunnel):
```bash
sudo tailscale up
# Follow the link to authenticate with your Tailscale account
```

**Create website content**:
```bash
sudo mkdir -p /var/www/aryam.dev
sudo bash -c 'echo "<h1>Hello World</h1>" > /var/www/aryam.dev/index.html'
```

**Start Docker containers**:
```bash
cd /opt/audiobookshelf && sudo docker compose up -d
cd /opt/filebrowser && sudo docker compose up -d
```

### 4. Verify everything

```bash
# Check services
sudo systemctl status nginx
sudo tailscale status

# Check Docker
docker ps

# Check firewall
sudo ufw status

# Test Nginx
sudo nginx -t
```

## Directory Structure

```
server/
├── provision.sh              # Main orchestration script
├── README.md                 # This file
├── .gitignore               # Git ignore patterns
│
├── scripts/
│   ├── install-packages.sh   # System package installation
│   ├── setup-ssh.sh          # SSH hardening
│   ├── setup-ufw.sh          # UFW firewall rules
│   ├── setup-docker.sh       # Docker setup & image pulls
│   ├── setup-nginx.sh        # Nginx vhost configuration
│   └── setup-tailscale.sh    # Tailscale daemon
│
├── configs/
│   ├── nginx/
│   │   ├── aryam.dev         # Static website vhost
│   │   ├── abs.aryam.dev     # Audiobookshelf proxy
│   │   └── files.aryam.dev   # Filebrowser proxy
│   └── ssh/
│       └── sshd_config       # SSH hardened configuration
│
└── docker/
    ├── audiobookshelf/
    │   └── docker-compose.yml
    └── filebrowser/
        └── docker-compose.yml
```

## Configuration

### Domains

Update these in the scripts/configs to match your domain(s):
- `aryam.dev` — Static website
- `abs.aryam.dev` — Audiobookshelf (port 13378)
- `files.aryam.dev` — Filebrowser (port 8080)

Replace with your actual domain names before running provisioning.

### Ports

- **80** — HTTP (auto-redirected to HTTPS by Nginx)
- **443** — HTTPS (managed by certbot)
- **22** — SSH (hardened, key-based only)
- **13378** — Audiobookshelf (internal, proxied via Nginx)
- **8080** — Filebrowser (closed, only routable through Tailscale, internally proxied via Nginx)
- **41641/UDP** — Tailscale

### Docker Services

Both services are configured to:
- Restart automatically if they crash
- Bind to localhost only (proxied via Nginx)
- Use persistent volumes

**Audiobookshelf** directories:
- `/opt/audiobookshelf/audiobooks` — Audio library
- `/opt/audiobookshelf/podcasts` — Podcast library
- `/opt/audiobookshelf/config` — Configuration
- `/opt/audiobookshelf/metadata` — Metadata cache

**Filebrowser** directories:
- `/opt/filebrowser/data` — Database and config
- `/opt/files` — Shared file browse root

## Maintenance

### Update packages

```bash
sudo apt update && sudo apt upgrade
```

(Unattended-upgrades handles security updates automatically)

### SSL certificate renewal

```bash
sudo certbot renew
```

(Should be automatic via systemd timer)

### View service logs

```bash
# Nginx
sudo journalctl -u nginx -f

# Docker
docker logs -f abs
docker logs -f filebrowser
```

### Restart services

```bash
sudo systemctl restart nginx
docker restart abs filebrowser
```

## Customization

### Add more Nginx vhosts

1. Create config in `configs/nginx/<domain>`
2. Add setup in `scripts/setup-nginx.sh`
3. Run certbot to add SSL
4. Reload Nginx: `sudo systemctl reload nginx`


## Troubleshooting

### Nginx won't start

```bash
sudo nginx -t  # Check syntax
sudo journalctl -u nginx -n 20  # View recent errors
```

### Docker containers won't start

```bash
docker compose logs  # From the service directory
docker ps -a  # Show all containers including stopped
```

### UFW blocking connections

```bash
sudo ufw status numbered  # List all rules
sudo ufw allow <port>  # Allow a port
sudo ufw delete <rule-number>  # Remove a rule
```

### SSL certificate errors

```bash
sudo certbot certificates  # View current certs
sudo certbot renew --dry-run  # Test renewal
```

## Security Notes

- SSH key-based auth only (no passwords)
- Root login disabled
- UFW firewall enabled with strict rules
- Automatic security updates via unattended-upgrades
- Docker containers bound to localhost only
- Tailscale provides additional security layer and private access to sensitive services

## Backup & Recovery

### Create a backup

```bash
# Backup Docker data
tar -czf ~/docker-backup-$(date +%s).tar.gz /opt/{audiobookshelf,filebrowser}

# Backup configs
tar -czf ~/config-backup-$(date +%s).tar.gz /etc/{nginx,ssh}
```

### Restore

```bash
tar -xzf docker-backup-*.tar.gz -C /
tar -xzf config-backup-*.tar.gz -C /
```

## Next Steps

1. **Update domain names** in all configs to match your setup
2. **Push to GitHub** — make your own fork and customize
3. **Run provision.sh** on a fresh Ubuntu VPS
4. **Complete manual steps** (certs, auth, content)
5. **Verify all services** are running

## License

Adapt as needed for your infrastructure.
