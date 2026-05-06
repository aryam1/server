#!/bin/bash
set -e

log() { echo "→ $1"; }

log "Enabling Tailscale..."
systemctl enable tailscaled
systemctl start tailscaled

log ""
log "✓ Tailscale installed and started"
log ""
log "⚠  MANUAL STEP REQUIRED:"
log "   Run: sudo tailscale up"
log "   Then authenticate with your Tailscale account"
log ""
