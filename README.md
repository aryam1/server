# Server

Single-VPS infrastructure-as-code for Ubuntu. Shell scripts provision the OS; Docker Compose runs all services behind Traefik.

**Public** services are served on port 443 (Let's Encrypt via Cloudflare DNS challenge). **Private** services are only reachable over Tailscale.

## Stack

- **Traefik** — reverse proxy and TLS termination for every service; routes by Docker labels
- **Docker Compose** — one project per service, all on an external `proxy` network
- **Tailscale** — private overlay for sensitive services
- **UFW** — default-deny firewall
- **SSH hardening** — key-only, no root login
- **Unattended-upgrades** — automatic security updates

## Services

| Service | Containers | Hostname | Access |
|---|---|---|---|
| Website | `site` | `aryam.dev` | public |
| Website (dev) | `site-dev` | `dev.aryam.dev` | private |
| Audiobookshelf | `abs`, `absg`, `readmeabook` | `abs.aryam.dev`, `absg.aryam.dev`, `rmab.aryam.dev` | public |
| Filebrowser | `files` | `files.aryam.dev` | private |
| Prowlarr | `prow` | `prow.aryam.dev` | private |
| qBittorrent | `gluetun`, `qbittorrent`, `mousehole` | `qb.aryam.dev`, `mousehole.aryam.dev` | private |
| Homepage | `homepage` | `home.aryam.dev` | private |
| Dozzle (logs) | `dozzle` | `logs.aryam.dev` | private |
| Dockhand | `dockhand` | `dockhand.aryam.dev` | private |
| GoatCounter | `goatcounter` | `stats.aryam.dev` | private |
| Traefik dashboard | `traf` | Tailscale entrypoint | private |

qBittorrent and Mousehole share Gluetun's network namespace, so all their traffic exits through NordVPN (WireGuard, Netherlands).

## Quick Start

### 1. Clone onto the VPS

Compose files bind absolute `/server` paths, so clone there:

```bash
sudo git clone https://github.com/aryam1/server.git /server
```

### 2. Fill in secrets

`.env` files are gitignored — create them before starting anything:

**`docker/traefik/.env`** (required — Traefik will not start without it)

```
CF_API_EMAIL=you@example.com        # Cloudflare account email
CF_DNS_API_TOKEN=...                # API token with DNS:Edit on aryam.dev
PUBLIC_IP=...                       # server's public IPv4
TAILSCALE_IP=...                    # server's Tailscale IP (after step 4)
```

**`docker/qbittorrent/.env`**

```
NORDVPN_PRIVATE_KEY=...             # NordVPN WireGuard private key
MAM_COOKIE=...                      # MyAnonaMouse session cookie (mam_points.py)
```

**`docker/homepage/.env`**

```
HOMEPAGE_VAR_OWM_API_KEY=...        # OpenWeatherMap API key
```

Also ensure the ACME storage exists and is only readable by root:

```bash
sudo touch /server/docker/traefik/data/acme.json
sudo chmod 600 /server/docker/traefik/data/acme.json
```

### 3. Provision the OS

```bash
sudo bash provision.sh
```

Runs, in order: install-packages → setup-docker → setup-tailscale → setup-ufw → setup-ssh.

### 4. Authenticate Tailscale

```bash
sudo tailscale up          # follow the auth link
tailscale ip -4            # put this in docker/traefik/.env as TAILSCALE_IP
```

### 5. Start containers — Traefik first

Traefik creates the external `proxy` network that every other service joins:

```bash
cd /server/docker/traefik && sudo docker compose up -d
for dir in /server/docker/*/; do (cd "$dir" && sudo docker compose up -d); done
```

### 6. Verify

```bash
docker ps
sudo ufw status
tailscale status
```

Check `https://aryam.dev` publicly and any private hostname from a tailnet device.

### 7. Optional hardening

Once Tailscale SSH works, close port 22 entirely (see `scripts/setup-ufw.sh` output):

```bash
sudo ufw delete allow 22/tcp && sudo ufw reload
sudo systemctl disable --now ssh
```

## Adding a Service

1. Create `docker/<name>/docker-compose.yml` joining the external `proxy` network.
2. Add Traefik labels:

```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.<name>.rule=Host(`<name>.aryam.dev`)
  - traefik.http.routers.<name>.entrypoints=private   # or public
  - traefik.http.routers.<name>.tls.certresolver=cf   # private entrypoint only
  - traefik.http.services.<name>.loadbalancer.server.port=<container-port>
```

3. `sudo docker compose up -d` from the new directory.

Note: if you omit the `rule` label, Traefik's default rule assigns `<compose-service-name>.aryam.dev`.

## Networking Rules

- All services join the external `proxy` network defined by Traefik's compose file.
- `exposedByDefault: false` — every container needs explicit `traefik.enable=true` and router labels.
- Services never publish host ports; only Traefik listens on the host: `80` (redirect to HTTPS), `443` on `PUBLIC_IP` (public entrypoint), `443` on `TAILSCALE_IP` → container `8443` (private entrypoint), and `41641/udp` for Tailscale.
- Private entrypoint is firewalled to `100.64.0.0/10` (Tailscale CGNAT range) — it is not reachable from the internet.

## Ports

| Port | Purpose |
|---|---|
| 80 | HTTP, redirects to HTTPS |
| 443 | HTTPS (public, bound to public IP) |
| 443 → 8443 | HTTPS private entrypoint (bound to Tailscale IP only) |
| 41641/udp | Tailscale |
| 22 | SSH (hardened, should be closed after Tailscale SSH works) |

## Directory Structure

```
server/
├── provision.sh               # Main orchestration script (run as root)
├── scripts/                   # Individual setup steps called by provision.sh
│   ├── install-packages.sh
│   ├── setup-docker.sh
│   ├── setup-tailscale.sh
│   ├── setup-ufw.sh
│   └── setup-ssh.sh
├── configs/
│   └── ssh/sshd_config        # Hardened SSH configuration
├── websites/                  # Static portfolio served by the site container
└── docker/                    # One compose project per service
    ├── traefik/               # .env, data/traefik.yml, data/acme.json, logs/
    ├── site/                  # nginx:alpine, default.conf (prod), nocache.conf (dev)
    ├── audiobooks/            # Audiobookshelf, green proxy, ReadMeABook
    ├── filebrowser/
    ├── prowlarr/
    ├── qbittorrent/           # gluetun + qbittorrent + mousehole
    ├── homepage/
    ├── dozzle/
    ├── dockhand/
    └── goatcounter/
```

The `site` container serves `/server/websites` read-only and proxies `/count` and `/count.js` to GoatCounter, allowlisting only specific `ref` query values (see `docker/site/default.conf`).

## Maintenance

### Update images

```bash
cd /server/docker/<service>
sudo docker compose pull && sudo docker compose up -d
```

### View logs

Dozzle at `logs.aryam.dev`, or:

```bash
sudo docker logs -f traf
sudo docker logs -f <container>
```

### Certificates

Handled entirely by Traefik's Cloudflare DNS-challenge resolver (`cf`) — no certbot. Certs live in `docker/traefik/data/acme.json` and renew automatically.

### Backups

```bash
# Traefik state (certificates) — root-only file
sudo tar -czf ~/backup-$(date +%s).tar.gz /server/docker/traefik/data/acme.json /etc/ssh
# Service state
tar -czf ~/data-backup-$(date +%s).tar.gz /server/docker/*/config /server/docker/*/data /mnt/storagebox
```

## Troubleshooting

**A service is unreachable**
- Confirm the container is on the `proxy` network and has `traefik.enable=true` plus matching router/service labels.
- Wrong cert resolver or missing entrypoint label is the usual cause.

**Traefik won't start**
- Requires `docker/traefik/.env` with `CF_API_EMAIL`, `CF_DNS_API_TOKEN`, `PUBLIC_IP`, `TAILSCALE_IP`.
- Ensure `data/acme.json` exists with mode `600`.

**Certificate errors**
- Check `sudo docker logs traf`. The Cloudflare token needs `DNS:Edit` on `aryam.dev`.
- Do not run certbot — it would fight Traefik for port 80/443.

**New service can't start**
- Start Traefik first; the `proxy` network must already exist.

**Firewall blocking Tailscale**
- Private services require `ufw allow from 100.64.0.0/10 to any port 8443 proto tcp`.

## Security Model

- UFW default-deny incoming (allow: 22, 80, 443, 41641/udp, 8443 from Tailscale range)
- SSH key-only, root login disabled, PAM disabled
- Private entrypoint restricted to Tailscale CGNAT range
- qBittorrent traffic forced through NordVPN via Gluetun
- All secrets live in gitignored `.env` files
- Container images pinned to `latest` — update deliberately with `docker compose pull`
