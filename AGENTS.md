# AGENTS.md

## Architecture

Single-VPS infrastructure-as-code for Ubuntu. Shell scripts provision the OS; Docker Compose runs all services behind Traefik.

**Entrypoint:** `sudo bash provision.sh` — runs scripts in order: install-packages → setup-docker → setup-tailscale → setup-ufw → setup-ssh.

**No build system, no tests, no CI, no linting.** This repo is pure shell + YAML + static HTML/JS/CSS.

## Traefik replaces Nginx (README is stale)

The README still references Nginx, certbot, and `/opt/` paths. These are all wrong. Traefik handles:
- **Public** (port 443) — `aryam.dev`, `abs.aryam.dev` with Let's Encrypt via Cloudflare DNS challenge
- **Private** (port 8443) — Tailscale-only: `files.aryam.dev`, qBittorrent, Mousehole
- **Metrics** (port 8082) — Prometheus scraping
- **Web** (port 80) — redirects to HTTPS

Certificates are managed by Traefik's Cloudflare resolver, not certbot. Do not add certbot commands.

## Service startup order

1. **Traefik first** — it creates the `proxy` external Docker network that all other services join.
2. Other services can start in any order after that.
3. To start all: `for dir in docker/*/; do (cd "$dir" && sudo docker compose up -d); done`

## Docker networking rules

- All services join the `proxy` external network (defined in traefik's compose file).
- Traefik discovers services by Docker labels (not by scanning compose files). `exposedByDefault: false` — every container needs explicit `traefik.enable=true` and router labels.
- qBittorrent + Mousehole share Gluetun's network namespace (`network_mode: "service:gluetun"`) for VPN tunneling.
- Services bind to Docker networks only, not host ports. The only host-port listeners are Traefik's entrypoints.

## Directory ownership

- `provision.sh` → OS setup (root required)
- `scripts/` → Individual setup steps, called by provision.sh
- `docker/<service>/` → One Docker Compose project per service, each with its own `.env` and volumes
- `websites/` → Static site served by the `site` Nginx container (Arya's portfolio)
- `configs/ssh/` → Hardened sshd_config

## Security model

- UFW: default-deny incoming, allow SSH/HTTP/HTTPS/Tailscale/Traefik-private
- SSH: key-only, no root login, PAM disabled
- Tailscale is the private overlay — services behind the `private` entrypoint are only reachable from Tailscale IPs (100.64.0.0/10)
- After Tailscale SSH is working, the recommended final step is closing port 22 entirely via UFW

## Editing conventions

- Docker Compose labels must match the exact router/service names already in use (e.g., `traefik.http.routers.abs`)
- Traefik cert resolver name is `cf` (Cloudflare)
- CF_API_EMAIL and CF_DNS_API_TOKEN are required in `docker/traefik/.env` — never commit these
- Use `aryam.dev` and its subdomains consistently (don't invent new domains)
