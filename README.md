# OPEN MIND AI

<p align="center">
  <img src="https://img.shields.io/badge/AI-Token%20Free-brightgreen?style=for-the-badge" alt="Token Free">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Architecture-Rust%20+%20TypeScript-orange?style=for-the-badge" alt="Architecture">
</p>

> **OPEN MIND AI** - An open-source AI assistant that runs without token limitations.
> Powered by local LLM (Ollama), vector search, and semantic embeddings.

## ✨ Features

- 🚀 **No Token Limits** - Process unlimited text without restrictions
- 🤖 **Local LLM** - Powered by Ollama for complete privacy
- 🔍 **Vector Search** - Semantic search with local vector database
- 📄 **File Processing** - Extract text from PDF, DOCX, images, and more
- 🔌 **Plugin System** - Extensible architecture for custom functionality
- 🎙️ **Voice Support** - Voice input and output capabilities
- 🌐 **REST API** - OpenAI-compatible API for integration
- 🔄 **WebSocket** - Real-time communication support
- 📱 **Cross-Platform** - Desktop app, CLI, and web interfaces
- 🔒 **Privacy-First** - Run entirely on your local machine

## 🏗️ Architecture

```
openmind/
├── apps/
│   ├── desktop/              # Tauri + React desktop app
│   ├── cli/                  # Command-line interface
│   └── api-server/           # REST API + WebSocket server
├── packages/
│   ├── core/                 # Rust core library
│   ├── ai-core/              # Ollama & LLM integration
│   ├── memory-engine/        # TypeScript memory + SQLite
│   ├── vector-db/            # Local vector database
│   ├── file-processor/       # PDF, DOCX, image processing
│   ├── connectors/           # OAuth integration framework
│   ├── plugin-system/        # Extensible plugin architecture
│   ├── shared-types/         # Shared TS types & schemas
│   ├── ui/                   # Shared React components
│   └── voice/                # Voice input/output support
├── config/
├── scripts/
└── .github/
    └── workflows/
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Rust 1.70+
- pnpm 8+
- Ollama (for LLM features)

### Installation

```bash
# Clone the repository
git clone https://github.com/Antono4/openmind.git
cd openmind

# Run bootstrap script
./scripts/bootstrap.sh

# Or manually install
pnpm install

# Install Ollama (if not installed)
# macOS/Linux: curl -fsSL https://ollama.ai/install.sh | sh
# Windows: Download from https://ollama.ai

# Pull a model
ollama pull llama3
```

### Running

```bash
# Start API server
pnpm start:api

# Start desktop app
pnpm dev:desktop

# Start CLI
pnpm dev:cli
```

## 📦 Packages

| Package | Description |
|---------|-------------|
| `@openmind/ai-core` | Ollama integration with streaming support |
| `@openmind/vector-db` | Local vector database for semantic search |
| `@openmind/file-processor` | Process PDF, DOCX, images, and more |
| `@openmind/plugin-system` | Extensible plugin architecture |
| `@openmind/memory-engine` | Memory operations with SQLite |
| `@openmind/voice` | Voice input/output support |
| `@openmind/connectors` | OAuth integration framework |

## 🌐 API Endpoints

### Chat Completions (OpenAI-compatible)

```bash
curl -X POST http://localhost:3001/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Embeddings

```bash
curl -X POST http://localhost:3001/api/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "nomic-embed-text", "input": "Hello world"}'
```

### Vector Search

```bash
curl -X POST http://localhost:3001/api/v1/vector/search \
  -H "Content-Type: application/json" \
  -d '{"query": "artificial intelligence"}'
```

## 💻 CLI Commands

```bash
openmind           # Interactive mode
openmind chat      # Chat with Ollama
openmind stream    # Streaming chat
openmind embed     # Generate embeddings
openmind search    # Vector search mode
openmind file      # Process files
openmind plugins   # Plugin manager
openmind info      # System information
```

## 🔌 Plugin System

```typescript
import { Plugin, pluginManager } from '@openmind/plugin-system';

const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  hooks: {
    onLoad: () => console.log('Plugin loaded'),
    onProcess: async (input) => {
      // Custom processing logic
      return input;
    },
  },
};

await pluginManager.loadPlugin(myPlugin);
```

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| Core | Rust |
| Frontend | React + TypeScript |
| Desktop | Tauri |
| LLM | Ollama |
| Database | SQLite |
| Vector DB | Custom (SQLite-based) |
| Build Tool | pnpm (workspaces) |
| API | Express + WebSocket |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ by the OPEN MIND Team
- Powered by Rust, TypeScript, and Ollama