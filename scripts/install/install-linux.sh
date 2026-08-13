#!/bin/bash
#
# OPEN MIND AI - Linux Installer
#
# Usage: ./install-linux.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
INSTALL_DIR="${HOME}/.openmind"
BIN_DIR="${HOME}/.local/bin"
SHARE_DIR="${HOME}/.local/share/openmind"
DESKTOP_FILE="${HOME}/.local/share/applications/openmind.desktop"
REPO_URL="https://github.com/Antono4/openmind.git"

print_banner() {
    echo -e "${BLUE}"
    echo "  ╔═══════════════════════════════════════════════════════╗"
    echo "  ║   OPEN MIND AI - Linux Installer                      ║"
    echo "  ║   AI Without Token Limitations                        ║"
    echo "  ╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_info() { echo -e "${YELLOW}[i]${NC} $1"; }

# Check prerequisites
check_prereqs() {
    echo -e "\n${BLUE}Checking prerequisites...${NC}\n"
    
    # Check for Node.js
    if command -v node &> /dev/null; then
        print_status "Node.js: $(node -v)"
    else
        print_error "Node.js not found"
        echo "  Install: https://nodejs.org/en/download/"
        exit 1
    fi
    
    # Check for pnpm
    if command -v pnpm &> /dev/null; then
        print_status "pnpm: $(pnpm -v)"
    else
        print_info "Installing pnpm..."
        npm install -g pnpm
        print_status "pnpm installed"
    fi
    
    # Check for Git
    if command -v git &> /dev/null; then
        print_status "Git: $(git --version)"
    else
        print_error "Git not found"
        exit 1
    fi
    
    # Check for Rust (optional)
    if command -v rustc &> /dev/null; then
        print_status "Rust: $(rustc --version | cut -d' ' -f2)"
    else
        print_info "Rust not found (optional for CLI)"
        print_info "Install: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    fi
    
    # Check for Ollama (optional)
    if command -v ollama &> /dev/null; then
        print_status "Ollama: $(ollama --version)"
    else
        print_info "Ollama not found (optional for AI features)"
        print_info "Install: curl -fsSL https://ollama.ai/install.sh | sh"
    fi
}

# Install dependencies
install_deps() {
    echo -e "\n${BLUE}Installing...${NC}\n"
    
    # Create directories
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$BIN_DIR"
    mkdir -p "$SHARE_DIR"
    mkdir -p "$(dirname "$DESKTOP_FILE")"
    
    # Clone or update
    if [ -d "$INSTALL_DIR/.git" ]; then
        print_info "Updating existing installation..."
        cd "$INSTALL_DIR"
        git pull origin main
    else
        print_info "Cloning repository..."
        git clone "$REPO_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    
    # Install dependencies
    print_info "Installing Node.js packages..."
    pnpm install
    print_status "Dependencies installed"
}

# Build applications
build_apps() {
    echo -e "\n${BLUE}Building applications...${NC}\n"
    
    cd "$INSTALL_DIR"
    
    # Build CLI
    print_info "Building CLI..."
    pnpm --filter @openmind/cli build
    cp -r apps/cli/dist/* "$BIN_DIR/"
    chmod +x "$BIN_DIR"/*
    print_status "CLI built and installed to $BIN_DIR"
    
    # Build API Server
    print_info "Building API server..."
    pnpm --filter @openmind/api-server build
    print_status "API server built"
}

# Create desktop entry
create_desktop_entry() {
    echo -e "\n${BLUE}Creating desktop entry...${NC}\n"
    
    cat > "$DESKTOP_FILE" << 'EOF'
[Desktop Entry]
Name=OPEN MIND AI
Comment=Open-source AI without token limitations
Exec=openmind info
Icon=openmind
Terminal=false
Type=Application
Categories=Utility;AI;
Keywords=ai;chat;assistant;llm;ollama;
StartupNotify=true
EOF
    
    chmod +x "$DESKTOP_FILE"
    print_status "Desktop entry created"
    
    # Update desktop database if available
    if command -v update-desktop-database &> /dev/null; then
        update-desktop-database "$(dirname "$DESKTOP_FILE")" 2>/dev/null || true
    fi
}

# Update shell profile
update_shell() {
    echo -e "\n${BLUE}Configuring shell...${NC}\n"
    
    SHELL_RC="${HOME}/.bashrc"
    if [[ -f "${HOME}/.zshrc" ]]; then
        SHELL_RC="${HOME}/.zshrc"
    fi
    
    # Add to PATH
    if ! grep -q "$BIN_DIR" "$SHELL_RC" 2>/dev/null; then
        echo "" >> "$SHELL_RC"
        echo "# OPEN MIND AI" >> "$SHELL_RC"
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
        print_status "PATH updated in $SHELL_RC"
    fi
    
    source "$SHELL_RC" 2>/dev/null || true
}

# Print completion
print_completion() {
    echo -e "\n${GREEN}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║   Installation Complete!                              ║"
    echo "║                                                       ║"
    echo "║   Next steps:                                         ║"
    echo "║   1. Restart terminal or: source ~/.bashrc            ║"
    echo "║   2. Run: openmind --help                             ║"
    echo "║   3. For AI features:                                 ║"
    echo "║      curl -fsSL https://ollama.ai/install.sh | sh     ║"
    echo "║      ollama pull llama3                               ║"
    echo "║                                                       ║"
    echo "║   Location: $INSTALL_DIR  ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Main
main() {
    print_banner
    check_prereqs
    install_deps
    build_apps
    create_desktop_entry
    update_shell
    print_completion
}

main "$@"