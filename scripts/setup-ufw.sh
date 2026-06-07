#!/bin/bash
set -e

log() { echo "→ $1"; }

log "Enabling UFW..."
ufw --force enable

log "Setting default policies..."
ufw default deny incoming
ufw default allow outgoing

log "Allowing SSH (port 22)..."
ufw allow 22/tcp comment "SSH"

log "Allowing HTTP (port 80)..."
ufw allow 80/tcp comment "HTTP"

log "Allowing HTTPS (port 443)..."
ufw allow 443/tcp comment "HTTPS"

log "Allowing Tailscale (port 41641)..."
ufw allow 41641/udp comment "Tailscale"

log "Allowing Traefik\'s Tailscale endpoint..."
ufw allow from 100.64.0.0/10 to any port 8443 proto tcp comment "Traefik private entrypoint"

log "Reloading UFW..."
ufw reload

log "UFW status:"
ufw status numbered

log "✓ UFW configured successfully"
log ""
log "  Once Tailscale is verified and you can SSH via Tailscale IP, close port 22:"
log "  ufw delete allow 22/tcp && ufw reload"
