# 📥 Installation Guide

This guide will help you install OPEN MIND AI on your computer.

## 🖥️ System Requirements

### Minimum Requirements
- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **RAM**: 4 GB
- **Disk Space**: 500 MB
- **Node.js**: 18.0 or higher

### Recommended Requirements
- **RAM**: 8 GB or more (for running local LLM models)
- **Disk Space**: 2 GB or more
- **Ollama**: For full AI capabilities

---

## 🚀 Quick Install

### Linux & macOS

```bash
# One-line installation
curl -fsSL https://raw.githubusercontent.com/Antono4/openmind/main/scripts/install.sh | bash
```

Or manually:

```bash
# Clone the repository
git clone https://github.com/Antono4/openmind.git
cd openmind

# Run installer
chmod +x scripts/install.sh
./scripts/install.sh
```

### Windows

```powershell
# Run PowerShell as Administrator
irm https://raw.githubusercontent.com/Antono4/openmind/main/scripts/install/install-windows.ps1 | iex
```

Or manually:

```powershell
# Clone the repository
git clone https://github.com/Antono4/openmind.git
cd openmind

# Run installer
.\scripts\install\install-windows.ps1
```

---

## 📋 Manual Installation

### Step 1: Install Prerequisites

#### Node.js (Required)
Download from: https://nodejs.org/

Or use package managers:

```bash
# macOS
brew install node

# Linux (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows (with winget)
winget install OpenJS.NodeJS
```

#### pnpm (Required)
```bash
npm install -g pnpm
```

#### Rust (Optional - for Desktop App)
```bash
# Linux/macOS
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows
# Download from https://rustup.rs
```

#### Ollama (Optional - for AI features)
```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai

# Pull a model
ollama pull llama3
```

---

### Step 2: Clone & Install

```bash
# Clone repository
git clone https://github.com/Antono4/openmind.git
cd openmind

# Install dependencies
pnpm install

# Build applications
pnpm build
```

---

### Step 3: Configure PATH

#### Linux/macOS
Add to your `~/.bashrc` or `~/.zshrc`:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

#### Windows
Add to System PATH:
```
%LOCALAPPDATA%\OpenMindAI\bin
```

---

## 📱 Applications

### CLI Application

The CLI is installed to `~/.local/bin/openmind` (Linux) or equivalent.

```bash
# Show help
openmind --help

# Chat mode
openmind chat

# System info
openmind info
```

### API Server

```bash
# Start API server
pnpm start:api

# Server runs at http://localhost:3001
```

### Desktop App

```bash
# Development mode
pnpm dev:desktop

# Production (requires build)
cd apps/desktop
pnpm tauri build
```

---

## 🔧 Troubleshooting

### Command 'openmind' not found

1. Make sure the binary is in your PATH
2. Restart your terminal
3. Check the installation location

```bash
# Linux/macOS
echo $PATH | tr ':' '\n' | grep local

# Windows
echo %PATH%
```

### Node.js version error

```bash
# Check version
node --version

# Should be 18.0.0 or higher
```

### Ollama connection error

```bash
# Check if Ollama is running
ollama serve

# List available models
ollama list

# Pull a model
ollama pull llama3
```

---

## 🗑️ Uninstallation

### Linux/macOS
```bash
rm -rf ~/.openmind
rm -rf ~/.local/bin/openmind
rm -f ~/.local/share/applications/openmind.desktop
```

### Windows
```powershell
Remove-Item -Recurse -Force $env:LOCALAPPDATA\OpenMindAI
```

---

## 📞 Support

- **GitHub Issues**: https://github.com/Antono4/openmind/issues
- **Documentation**: https://github.com/Antono4/openmind#readme