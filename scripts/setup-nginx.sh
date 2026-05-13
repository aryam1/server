#!/bin/bash
set -e
log() { echo "→ $1"; }
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_AVAILABLE="$SCRIPT_DIR/../configs/nginx/sites-available"
NGINX_ENABLED="$SCRIPT_DIR/../configs/nginx/sites-enabled"
EMAIL="arya.mukherjee@hotmail.com"

log "Installing certbot..."
apt install -y certbot python3-certbot-nginx

log "Stopping Nginx to free port 80 for certbot..."
systemctl stop nginx

log "Generating SSL certificates..."
for enabled in "$NGINX_ENABLED"/*; do
    domain=$(basename "$enabled")
    certbot certonly --standalone -d "$domain" \
        --non-interactive --agree-tos -m "$EMAIL"
    log "  Cert issued: $domain"
done

log "Enabling Nginx..."
systemctl enable nginx

log "Creating symlinks for enabled sites..."
for enabled in "$NGINX_ENABLED"/*; do
    site=$(basename "$enabled")
    if [ -f "$NGINX_AVAILABLE/$site" ]; then
        ln -sf "$NGINX_AVAILABLE/$site" "/etc/nginx/sites-enabled/$site"
        log "  Enabled: $site"
    else
        echo "✗ Warning: $site listed in enabled but not found in available, skipping"
    fi
done

log "Copying landing page..."
mkdir -p /var/www/aryam.dev
cp "$SCRIPT_DIR/../configs/nginx/index.html" /var/www/aryam.dev/

log "Starting Nginx..."
systemctl start nginx

log "Testing Nginx configuration..."
nginx -t || {
    echo "✗ Nginx config test failed"
    exit 1
}
log "✓ Nginx configured"
