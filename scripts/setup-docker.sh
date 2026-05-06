#!/bin/bash
set -e

log() { echo "→ $1"; }

log "Starting Docker daemon..."
systemctl start docker
systemctl enable docker

log "Creating service directories..."
mkdir -p /opt/audiobookshelf/{audiobooks,podcasts,config,metadata}
mkdir -p /opt/filebrowser/data
mkdir -p /opt/files

log "Setting up audiobookshelf compose file..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "$SCRIPT_DIR/../docker/audiobookshelf/docker-compose.yml" /opt/audiobookshelf/

log "Setting up filebrowser compose file..."
cp "$SCRIPT_DIR/../docker/filebrowser/docker-compose.yml" /opt/filebrowser/

log "Setting proper permissions..."
chown -R 1000:1000 /opt/filebrowser/data
chmod -R 755 /opt/audiobookshelf
chmod -R 755 /opt/filebrowser
chmod -R 755 /opt/files

log "Pulling Docker images..."
docker pull ghcr.io/advplyr/audiobookshelf:latest
docker pull gtstef/filebrowser:stable

log "✓ Docker setup complete (containers not started - use 'docker compose up' in service dirs)"
