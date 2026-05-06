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

log "Denying direct access to internal Docker ports (8080, 13378)..."
ufw deny 8080
ufw deny 13378

log "Reloading UFW..."
ufw reload

log "UFW status:"
ufw status numbered

log "✓ UFW configured successfully"
