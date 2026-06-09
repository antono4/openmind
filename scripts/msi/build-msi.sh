#!/bin/bash
#
# OPEN MIND AI - MSI Installer Builder (Cross-Platform)
#
# This script builds an MSI installer using Tauri bundler.
# For standalone MSI without Rust, use build-cli-msi.sh
#
# Usage:
#   ./build-msi.sh              # Build all targets
#   ./build-msi.sh --cli-only   # Build CLI only
#

set -e

# Configuration
PRODUCT_NAME="OPEN MIND AI"
VERSION="1.0.0"
OUTPUT_DIR="${OUTPUT_DIR:-./dist/installers}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() { echo -e "${BLUE}[BUILD]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

print_banner() {
    echo -e "${BLUE}"
    echo "  ╔═══════════════════════════════════════════════════════╗"
    echo "  ║   OPEN MIND AI - MSI Installer Builder                ║"
    echo "  ║   Version: $VERSION                                  ║"
    echo "  ╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check prerequisites
check_prereqs() {
    print_step "Checking prerequisites..."
    
    # Check Node.js
    if command -v node &> /dev/null; then
        print_success "Node.js: $(node -v)"
    else
        print_error "Node.js not found. Please install from https://nodejs.org"
        exit 1
    fi
    
    # Check pnpm
    if command -v pnpm &> /dev/null; then
        print_success "pnpm: $(pnpm -v)"
    else
        print_info "Installing pnpm..."
        npm install -g pnpm
    fi
    
    # Check Rust (optional)
    if command -v rustc &> /dev/null; then
        print_success "Rust: $(rustc --version | cut -d' ' -f2)"
        HAS_RUST=true
    else
        print_info "Rust not found. CLI-only build will be used."
        HAS_RUST=false
    fi
    
    # Check for cross-compilation tools (optional)
    if command -v cross &> /dev/null; then
        print_success "Cross-compilation: available"
        HAS_CROSS=true
    else
        print_info "Cross-compilation tools not found."
        print_info "Install: cargo install cross"
        HAS_CROSS=false
    fi
}

# Create output directory
create_output_dir() {
    print_step "Creating output directory..."
    mkdir -p "$OUTPUT_DIR"
    print_success "Output: $OUTPUT_DIR"
}

# Build CLI
build_cli() {
    print_step "Building CLI application..."
    cd "$(dirname "$0")/../.."
    
    pnpm install
    pnpm --filter @openmind/cli build
    pnpm --filter @openmind/api-server build
    
    print_success "CLI built successfully"
}

# Build desktop app with Tauri
build_desktop() {
    if [ "$HAS_RUST" = false ]; then
        print_info "Skipping desktop build (Rust not installed)"
        return
    fi
    
    print_step "Building desktop application with Tauri..."
    cd "$(dirname "$0")/../.."
    
    cd apps/desktop
    pnpm tauri build --bundles msi
    
    # Copy MSI to output
    MSI_PATH=$(find src-tauri/target/release/bundle/msi -name "*.msi" 2>/dev/null | head -1)
    if [ -n "$MSI_PATH" ]; then
        cp "$MSI_PATH" "$OUTPUT_DIR/$PRODUCT_NAME-$VERSION.msi"
        print_success "MSI created: $OUTPUT_DIR/$PRODUCT_NAME-$VERSION.msi"
    fi
    
    # Copy NSIS installer
    NSIS_PATH=$(find src-tauri/target/release/bundle/nsis -name "*.exe" 2>/dev/null | head -1)
    if [ -n "$NSIS_PATH" ]; then
        cp "$NSIS_PATH" "$OUTPUT_DIR/$PRODUCT_NAME-$VERSION-setup.exe"
        print_success "NSIS installer created: $OUTPUT_DIR/$PRODUCT_NAME-$VERSION-setup.exe"
    fi
    
    cd ../..
}

# Create portable distribution
create_portable() {
    print_step "Creating portable distribution..."
    cd "$(dirname "$0")/../.."
    
    PORTABLE_DIR="$OUTPUT_DIR/$PRODUCT_NAME-$VERSION-portable"
    mkdir -p "$PORTABLE_DIR"
    
    # Copy CLI
    cp -r apps/cli/dist/* "$PORTABLE_DIR/" 2>/dev/null || true
    cp -r apps/api-server/dist/* "$PORTABLE_DIR/" 2>/dev/null || true
    
    # Copy install script
    cp scripts/install/install-linux.sh "$PORTABLE_DIR/" 2>/dev/null || true
    
    # Create README
    cat > "$PORTABLE_DIR/README.txt" << 'EOF'
OPEN MIND AI - Portable Version
===============================

Version: 1.0.0

Usage:
  CLI:    node dist/main.js --help
  API:    node dist/index.js

For full installation:
  chmod +x install-linux.sh
  ./install-linux.sh

For AI features, install Ollama:
  curl -fsSL https://ollama.ai/install.sh | sh
  ollama pull llama3

More info: https://github.com/Antono4/openmind
EOF
    
    # Create ZIP
    cd "$OUTPUT_DIR"
    zip -r "$PRODUCT_NAME-$VERSION-portable.zip" "$PRODUCT_NAME-$VERSION-portable" 2>/dev/null || true
    rm -rf "$PRODUCT_NAME-$VERSION-portable"
    
    print_success "Portable ZIP created: $OUTPUT_DIR/$PRODUCT_NAME-$VERSION-portable.zip"
}

# Build MSI with WiX (Linux)
build_wix_msi() {
    if ! command -v heat &> /dev/null; then
        print_info "WiX not installed. Skipping MSI build."
        return
    fi
    
    print_step "Building MSI with WiX..."
    cd "$(dirname "$0")/../.."
    
    # This would require Wine for Windows executables
    print_info "WiX MSI build requires Windows environment."
}

# Main build process
main() {
    print_banner
    
    CLI_ONLY=false
    if [ "$1" = "--cli-only" ]; then
        CLI_ONLY=true
    fi
    
    check_prereqs
    create_output_dir
    build_cli
    
    if [ "$CLI_ONLY" = false ]; then
        build_desktop
    fi
    
    create_portable
    
    # Summary
    echo ""
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║   Build Complete!                                      ║"
    echo "║                                                       ║"
    echo -e "║   Output: ${NC}$OUTPUT_DIR${GREEN}                       ║"
    echo "║                                                       ║"
    echo -e "║   Files:${NC}"
    ls -la "$OUTPUT_DIR" 2>/dev/null | grep -v "^total" | while read line; do
        echo -e "║     $line${GREEN}"
    done
    echo "║                                                       ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

main "$@"