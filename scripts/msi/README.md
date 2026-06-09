# 📦 MSI Installer Builder

This directory contains scripts for building MSI installers for OPEN MIND AI.

## 📋 Scripts

| Script | Platform | Description |
|--------|----------|-------------|
| `build-msi.sh` | Linux/macOS | Build MSI/NSIS installers using Tauri |
| `build-msi.ps1` | Windows | Build MSI installers using PowerShell |
| `wix-config.wxi` | All | WiX configuration for custom MSI builds |

## 🚀 Quick Build

### Windows (PowerShell as Admin)

```powershell
# Navigate to scripts directory
cd scripts\msi

# Build MSI with Tauri (requires Rust)
.\build-msi.ps1

# Build standalone MSI
.\build-msi.ps1 -Standalone

# Build portable ZIP (no Rust required)
.\build-msi.ps1 -Standalone
```

### Linux/macOS

```bash
# Navigate to scripts directory
cd scripts/msi

# Make executable
chmod +x build-msi.sh

# Build installers
./build-msi.sh

# CLI only build
./build-msi.sh --cli-only
```

## 📦 Output

Builds will be placed in `dist/installers/`:

```
dist/installers/
├── OPEN MIND AI-1.0.0.msi           # MSI installer (Windows)
├── OPEN MIND AI-1.0.0-setup.exe     # NSIS installer (Windows)
└── OPEN MIND AI-1.0.0-portable.zip  # Portable ZIP (all platforms)
```

## 🔧 Requirements

### For Full MSI Build (Windows)
- Node.js 18+
- Rust 1.70+
- pnpm 8+
- WiX Toolset 3.x (optional, for custom MSI)

### For CLI Build Only
- Node.js 18+
- pnpm 8+

### For Portable ZIP
- Node.js 18+
- pnpm 8+

## 🛠️ WiX Configuration

The `wix-config.wxi` file can be used with WiX Toolset to create custom MSI installers.

### Install WiX

```bash
# Windows (with winget)
winget install WiXToolset.WiX

# Or download from https://wixtoolset.org/
```

### Build Custom MSI

```powershell
# Navigate to project
cd openmind

# Build with WiX
candle.exe -ext WixFirewallExtension scripts/msi/product.wxs
light.exe -ext WixFirewallExtension -o dist/installers/openmind.msi product.wixobj
```

## 📝 MSI Features

The MSI installer includes:

- ✅ Desktop shortcut
- ✅ Start Menu entries
- ✅ Program uninstaller entry
- ✅ Multi-language support (English, Indonesian)
- ✅ Custom installation directory
- ✅ File association (optional)

## 🔍 Troubleshooting

### "Rust not found" error
Install Rust from https://rustup.rs

### "WiX not found" error
Install WiX from https://wixtoolset.org/

### MSI build fails
Try building CLI only:
```bash
./build-msi.sh --cli-only
```

## 📄 License

MIT - See main repository