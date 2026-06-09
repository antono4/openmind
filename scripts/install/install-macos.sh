#!/bin/bash
#
# OPEN MIND AI - macOS Installer
#
# Usage: ./install-macos.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_NAME="OPEN MIND AI"
INSTALL_DIR="${HOME}/Library/Application Support/OpenMindAI"
BIN_DIR="${HOME}/.local/bin"
APP_BUNDLE="${HOME}/Applications/OpenMindAI.app"
REPO_URL="https://github.com/Antono4/openmind.git"

print_banner() {
    echo -e "${BLUE}"
    echo "  ╔═══════════════════════════════════════════════════════╗"
    echo "  ║   OPEN MIND AI - macOS Installer                      ║"
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
        print_error "Node.js not found. Please install from https://nodejs.org"
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
    
    # Check for Homebrew
    if command -v brew &> /dev/null; then
        print_status "Homebrew: $(brew --version | head -1)"
    else
        print_info "Homebrew not found. Some features may require manual installation."
    fi
    
    # Check for Ollama
    if command -v ollama &> /dev/null; then
        print_status "Ollama: $(ollama --version)"
    else
        print_info "Ollama not found. AI features will use fallback mode."
        print_info "Install: brew install ollama"
    fi
}

# Install dependencies
install_deps() {
    echo -e "\n${BLUE}Installing...${NC}\n"
    
    # Create directories
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$BIN_DIR"
    
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
    print_info "Installing dependencies..."
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
    print_status "CLI built"
    
    # Build API Server
    print_info "Building API server..."
    pnpm --filter @openmind/api-server build
    print_status "API server built"
}

# Update shell profile
update_shell() {
    echo -e "\n${BLUE}Configuring shell...${NC}\n"
    
    SHELL_RC="${HOME}/.zshrc"
    
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
    echo "║   1. Restart terminal or: source ~/.zshrc             ║"
    echo "║   2. Run: openmind --help                             ║"
    echo "║   3. For AI: brew install ollama && ollama pull llama3║"
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
    update_shell
    print_completion
}

main "$@"