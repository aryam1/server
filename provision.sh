#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════════════════════════
# VPS Provisioning Script
# Automated setup for a fully reproducible Ubuntu VPS
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/provision.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}→${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Main Execution
# ═══════════════════════════════════════════════════════════════════════════════

main() {
    log "Starting VPS provisioning..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use: sudo bash provision.sh)"
    fi
    
    # Run individual setup scripts
    log "Installing system packages..."
    bash "$SCRIPT_DIR/scripts/install-packages.sh"
    
    log "Setting up Docker..."
    bash "$SCRIPT_DIR/scripts/setup-docker.sh"
    
    log "Setting up Tailscale..."
    bash "$SCRIPT_DIR/scripts/setup-tailscale.sh"
    
    log "Setting up UFW firewall..."
    bash "$SCRIPT_DIR/scripts/setup-ufw.sh"
        
    log "Setting up SSH hardening..."
    bash "$SCRIPT_DIR/scripts/setup-ssh.sh"
    
    log ""
    log "═══════════════════════════════════════════════════════════════════════════"
    log "Provisioning complete!"
    log "═══════════════════════════════════════════════════════════════════════════"
    log ""
    log "Next steps (MANUAL):"
    log ""
    log "  1. Set up Tailscale authentication:"
    log "     sudo tailscale up"
    log ""
    log "  2. Start Docker containers:"
    log "     for dir in /server/docker/*/; cd $dir; docker compose up -d; cd -; end"
    log ""
    log "  3. Verify services:"
    log "     docker ps"
    log ""
    log "  4. Once Tailscale is authenticated and you can SSH in via Tailscale IP:"
    log "     Disable direct SSH access to reduce attack surface:"
    log "     sudo ufw delete allow 22/tcp"
    log "     sudo ufw deny 22/tcp"
    log "     sudo systemctl disable --now ssh"
    log ""
}

main "$@"
