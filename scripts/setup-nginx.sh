#!/bin/bash
set -e

log() { echo "→ $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log "Enabling Nginx..."
systemctl enable nginx

log "Setting up vhost configurations..."
cp "$SCRIPT_DIR/../configs/nginx/aryam.dev" /etc/nginx/sites-available/
cp "$SCRIPT_DIR/../configs/nginx/abs.aryam.dev" /etc/nginx/sites-available/
cp "$SCRIPT_DIR/../configs/nginx/files.aryam.dev" /etc/nginx/sites-available/

log "Creating symlinks to sites-enabled..."
ln -sf /etc/nginx/sites-available/aryam.dev /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/abs.aryam.dev /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/files.aryam.dev /etc/nginx/sites-enabled/

log "Testing Nginx configuration..."
nginx -t || {
    echo "✗ Nginx config test failed"
    exit 1
}

log "✓ Nginx configured (note: SSL certs must be generated separately with certbot)"
