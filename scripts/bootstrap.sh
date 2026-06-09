#!/bin/bash
# OPEN MIND AI - Bootstrap Script
# 
# Sets up the development environment for OPEN MIND AI.

set -e

echo "🚀 OPEN MIND AI - Bootstrap"
echo "============================"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

# Check for Rust
if ! command -v rustc &> /dev/null; then
    echo "🦀 Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

echo ""
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "✅ Bootstrap complete!"
echo ""
echo "Next steps:"
echo "  - Run 'pnpm dev' to start development"
echo "  - Run 'pnpm build' to build for production"
echo "  - See README.md for more information"