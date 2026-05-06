#!/bin/bash
set -e

log() { echo "→ $1"; }

log "Updating package lists..."
apt update

log "Installing packages..."
apt install -y \
    build-essential \
    curl \
    git \
    wget \
    unzip \
    btop \
    tmux \
    neovim \
    nano \
    fish \
    bat \
    ripgrep \
    fzf \
    zoxide \
    certbot \
    python3-certbot-nginx \
    nginx \
    docker.io \
    docker-compose-plugin \
    ufw \
    tailscale \
    unattended-upgrades \

log "Configuring unattended-upgrades..."
dpkg-reconfigure -plow unattended-upgrades

log "✓ Packages installed successfully"
