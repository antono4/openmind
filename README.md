# OPEN MIND AI

> **Created by Antono**


<p align="center">
  <img src="https://img.shields.io/badge/AI-Token%20Free-brightgreen?style=for-the-badge" alt="Token Free">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Architecture-Rust%20+%20TypeScript-orange?style=for-the-badge" alt="Architecture">
</p>

> **OPEN MIND AI** - An open-source AI assistants.

## Features


- 🔓 **Open Source** - Fully transparent and community-driven
- 💻 **Cross-Platform** - Desktop app, CLI, and web interfaces
- 🔒 **Privacy-First** - Run locally on your machine
- ⚡ **High Performance** - Built with Rust for maximum speed
- 🎨 **Modern UI** - Clean, intuitive interface

## Architecture

```
openmind/
├── apps/
│   ├── desktop/              # Tauri + React desktop app
│   └── cli/                  # Command-line interface
├── packages/
│   ├── core/                 # Rust core library (memory, tokenjuice)
│   ├── memory-engine/        # TypeScript memory ops + SQLite
│   ├── connectors/           # OAuth integration framework
│   ├── shared-types/         # Shared TS types & schemas
│   └── ui/                   # Shared React components
├── config/
├── scripts/
└── .github/
    └── workflows/
```

## Quick Start

### Prerequisites

- Node.js 18+
- Rust 1.70+
- pnpm 8+

### Installation

```bash
# Clone the repository
git clone https://github.com/antono4/openmind.git
cd openmind

# Run bootstrap script
./scripts/bootstrap.sh

# Or manually install
pnpm install
```

### Development

```bash
# Start all apps in development mode
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint
```

## Apps

### Desktop App (Tauri + React)

```bash
cd apps/desktop
pnpm dev
```

### CLI

```bash
cd apps/cli
pnpm dev
```

```bash
# Interactive mode
openmind

# Chat mode
openmind chat

# Info
openmind info
```

## Packages

### Core (`packages/core`)
Rust core library with:
- Memory management with SQLite
- Token processing (no limits)
- Context management
- High-performance processing

### Memory Engine (`packages/memory-engine`)
TypeScript memory operations:
- SQLite persistence
- Fast in-memory cache
- Search and retrieval

### Connectors (`packages/connectors`)
OAuth integration framework:
- OAuth 2.0 support
- API connectors
- Webhook support

### UI (`packages/ui`)
Shared React components:
- Chat interface
- Input components
- Modal and cards

## Technology Stack

| Component | Technology |
|-----------|------------|
| Core | Rust |
| Frontend | React + TypeScript |
| Desktop | Tauri |
| Database | SQLite |
| Build Tool | pnpm (workspaces) |

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with ❤️ by the OPEN MIND Team
- Powered by antono4
