#!/bin/bash
#
# OPEN MIND AI - Universal Install Script
# 
# This script installs OPEN MIND AI on your system.
# Supports Linux, macOS, and Windows (WSL/bash).
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="openmind"
REPO_URL="https://github.com/Antono4/openmind.git"
INSTALL_DIR="${HOME}/.openmind"
BIN_DIR="${HOME}/.local/bin"
DESKTOP_DIR="${HOME}/.local/share/applications"

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Print banner
print_banner() {
    echo -e "${BLUE}"
    echo "  ╔═══════════════════════════════════════════════════════╗"
    echo "  ║                                                       ║"
    echo "  ║   ███████╗ █████╗ ██████╗  ██████╗██╗  ██╗            ║"
    echo "  ║   ██╔════╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝            ║"
    echo "  ║   ███████╗███████║██████╔╝██║     █████╔╝             ║"
    echo "  ║   ╚════██║██╔══██║██╔══██╗██║     ██╔═██╗             ║"
    echo "  ║   ███████║██║  ██║██║  ██║╚██████╗██║  ██╗            ║"
    echo "  ║   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝            ║"
    echo "  ║                                                       ║"
    echo "  ║   ${YELLOW}AI Without Token Limitations${BLUE}                     ║"
    echo "  ║                                                       ║"
    echo "  ╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Print status message
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

# Print error message
print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Print info message
print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

# Check prerequisites
check_prereqs() {
    echo -e "\n${BLUE}Checking prerequisites...${NC}\n"
    
    # Check for Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_status "Node.js: $NODE_VERSION"
    else
        print_error "Node.js not found. Please install Node.js 18+ first."
        echo "Visit: https://nodejs.org"
        exit 1
    fi
    
    # Check for pnpm
    if command -v pnpm &> /dev/null; then
        PNPM_VERSION=$(pnpm -v)
        print_status "pnpm: $PNPM_VERSION"
    else
        print_info "Installing pnpm..."
        npm install -g pnpm
        print_status "pnpm installed"
    fi
    
    # Check for Rust (optional for CLI only)
    if command -v rustc &> /dev/null; then
        RUST_VERSION=$(rustc --version | cut -d' ' -f2)
        print_status "Rust: $RUST_VERSION"
        RUST_INSTALLED=true
    else
        print_info "Rust not found. Desktop app requires Rust."
        print_info "Install from: https://rustup.rs"
        RUST_INSTALLED=false
    fi
    
    # Check for Ollama (optional)
    if command -v ollama &> /dev/null; then
        OLLAMA_VERSION=$(ollama --version)
        print_status "Ollama: $OLLAMA_VERSION"
        OLLAMA_INSTALLED=true
    else
        print_info "Ollama not found. AI features will use fallback mode."
        print_info "Install from: https://ollama.ai"
        OLLAMA_INSTALLED=false
    fi
}

# Install dependencies
install_deps() {
    echo -e "\n${BLUE}Installing dependencies...${NC}\n"
    
    # Create directories
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$BIN_DIR"
    mkdir -p "$DESKTOP_DIR"
    
    # Clone or update repository
    if [ -d "$INSTALL_DIR/.git" ]; then
        print_info "Updating existing installation..."
        cd "$INSTALL_DIR"
        git pull origin main
    else
        print_info "Cloning repository..."
        git clone "$REPO_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    
    # Install Node.js dependencies
    print_info "Installing Node.js packages..."
    pnpm install
    
    print_status "Dependencies installed"
}

# Build CLI
build_cli() {
    echo -e "\n${BLUE}Building CLI application...${NC}\n"
    
    cd "$INSTALL_DIR"
    pnpm --filter @openmind/cli build
    
    # Copy CLI binary to bin directory
    mkdir -p "$BIN_DIR"
    cp -r apps/cli/dist/* "$BIN_DIR/"
    
    print_status "CLI built and installed to $BIN_DIR"
}

# Build API Server
build_api() {
    echo -e "\n${BLUE}Building API server...${NC}\n"
    
    cd "$INSTALL_DIR"
    pnpm --filter @openmind/api-server build
    
    print_status "API server built"
}

# Create desktop entry (Linux)
create_desktop_entry() {
    echo -e "\n${BLUE}Creating desktop entry...${NC}\n"
    
    cat > "${DESKTOP_DIR}/openmind.desktop" << 'EOF'
[Desktop Entry]
Name=OPEN MIND AI
Comment=Open-source AI assistant without token limitations
Exec=openmind
Icon=openmind
Terminal=false
Type=Application
Categories=Utility;AI;
Keywords=ai;chat;assistant;llm;ollama;
EOF
    
    chmod +x "${DESKTOP_DIR}/openmind.desktop"
    print_status "Desktop entry created"
}

# Update shell profile
update_shell_profile() {
    echo -e "\n${BLUE}Updating shell profile...${NC}\n"
    
    SHELL_RC="${HOME}/.bashrc"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        SHELL_RC="${HOME}/.zshrc"
    fi
    
    # Add bin directory to PATH if not already there
    if ! grep -q "$BIN_DIR" "$SHELL_RC" 2>/dev/null; then
        echo "" >> "$SHELL_RC"
        echo "# OPEN MIND AI" >> "$SHELL_RC"
        echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >> "$SHELL_RC"
        print_status "Added $BIN_DIR to PATH in $SHELL_RC"
    fi
    
    # Source the profile
    source "$SHELL_RC" 2>/dev/null || true
}

# Print completion message
print_completion() {
    echo -e "\n${GREEN}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║                                                       ║"
    echo "║   ${YELLOW}Installation Complete!${GREEN}                               ║"
    echo "║                                                       ║"
    echo "║   Next steps:                                         ║"
    echo "║                                                       ║"
    echo "║   1. Restart your terminal or run:                    ║"
    echo "║      ${NC}source ~/.bashrc${GREEN} (or ~/.zshrc on macOS)${GREEN}          ║"
    echo "║                                                       ║"
    echo "║   2. Run the CLI:                                     ║"
    echo "║      ${NC}openmind --help${GREEN}                                      ║"
    echo "║                                                       ║"
    echo "║   3. For desktop app (requires Rust):                 ║"
    echo "║      ${NC}cd ~/.openmind && pnpm dev:desktop${GREEN}              ║"
    echo "║                                                       ║"
    echo "║   4. For API server:                                  ║"
    echo "║      ${NC}pnpm start:api${GREEN}                                    ║"
    echo "║                                                       ║"
    echo "║   5. Install Ollama for AI features:                  ║"
    echo "║      ${NC}curl -fsSL https://ollama.ai/install.sh | sh${GREEN}   ║"
    echo "║      ${NC}ollama pull llama3${GREEN}                               ║"
    echo "║                                                       ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Main installation
main() {
    print_banner
    
    OS=$(detect_os)
    echo -e "${BLUE}Detected OS: ${YELLOW}${OS}${NC}\n"
    
    check_prereqs
    install_deps
    build_cli
    build_api
    
    if [ "$OS" == "linux" ]; then
        create_desktop_entry
    fi
    
    update_shell_profile
    print_completion
}

# Run with sudo only if needed
if [ "$1" == "--sudo" ]; then
    export HOME=/root
fi

main "$@"