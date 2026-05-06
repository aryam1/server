#!/bin/bash
set -e

log() { echo "→ $1"; }

SSHD_CONFIG="/etc/ssh/sshd_config"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log "Backing up original sshd_config..."
cp "$SSHD_CONFIG" "$SSHD_CONFIG.backup.$(date +%s)"

log "Updating sshd_config with secure settings..."

# Use provided config
cp "$SCRIPT_DIR/../configs/ssh/sshd_config" "$SSHD_CONFIG"
chmod 600 "$SSHD_CONFIG"

log "Testing SSH config..."
sshd -t || {
    echo "✗ SSH config test failed"
    exit 1
}

log "Restarting SSH service..."
systemctl restart ssh

log "✓ SSH hardened successfully"
