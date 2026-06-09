#!/bin/bash
# OPEN MIND AI - Installation Verification Script
# 
# Verifies that all dependencies are correctly installed.

set -e

echo "🔍 OPEN MIND AI - Verifying Installation"
echo "========================================"

# Check Node.js version
NODE_VERSION=$(node -v)
echo "✓ Node.js: $NODE_VERSION"

# Check pnpm version
PNPM_VERSION=$(pnpm -v)
echo "✓ pnpm: $PNPM_VERSION"

# Check Rust version
RUST_VERSION=$(rustc --version)
echo "✓ Rust: $RUST_VERSION"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✓ Dependencies installed"
else
    echo "❌ Dependencies not installed. Run 'pnpm install' first."
    exit 1
fi

# Check for workspace packages
echo ""
echo "📦 Workspace Packages:"
for dir in packages/* apps/*; do
    if [ -d "$dir" ]; then
        if [ -f "$dir/package.json" ]; then
            NAME=$(node -p "require('./$dir/package.json').name")
            echo "  ✓ $NAME"
        fi
    fi
done

echo ""
echo "✅ Installation verified!"
echo ""
echo "Run 'pnpm build' to build all packages."