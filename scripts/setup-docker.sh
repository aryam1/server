#!/bin/bash
set -e
log() { echo "→ $1"; }

log "Starting Docker daemon..."
systemctl start docker
systemctl enable docker

log "✓ Docker ready - run 'docker compose up -d' from each service directory in the repo"
