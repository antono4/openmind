/**
 * OPEN MIND AI - API Server
 * 
 * REST API and WebSocket server for OPEN MIND AI.
 * Provides OpenAI-compatible endpoints and real-time communication.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { OllamaClient, AIManager, ChatMessage } from '@openmind/ai-core';
import { MemoryEngine } from '@openmind/memory-engine';
import { VectorDB } from '@openmind/vector-db';
import { processFile, chunkText } from '@openmind/file-processor';
import { pluginManager } from '@openmind/plugin-system';
import type { Conversation, Message } from '@openmind/shared-types';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Services
const aiManager = new AIManager();
const memory = new MemoryEngine({ path: './data/memory.db' });
const vectorDb = new VectorDB({ path: './data/vectors.db', dimension: 768 });
const conversations: Map<string, Conversation> = new Map();

// WebSocket clients
const wsClients: Map<string, WebSocket> = new Map();

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      ollama: aiManager.isProviderAvailable(),
      memory: true,
      vectorDb: true,
    },
  });
});

// API Info
app.get('/api/v1/info', (_req: Request, res: Response) => {
  res.json({
    name: 'OPEN MIND AI',
    version: '1.0.0',
    description: 'Open-source AI without token limitations',
    capabilities: [
      'chat',
      'embeddings',
      'file-processing',
      'vector-search',
      'plugins',
    ],
  });
});

// ============= Chat Completions (OpenAI-compatible) =============

app.post('/api/v1/chat/completions', async (req: Request, res: Response) => {
  try {
    const { model = 'llama3', messages, temperature = 0.7, max_tokens, stream = false } = req.body;

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages is required' });
    }

    // Convert to ChatMessage format
    const chatMessages: ChatMessage[] = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));

    if (stream) {
      // Streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullContent = '';
      for await (const chunk of aiManager.chatStream({ model, messages: chatMessages, temperature, num_predict: max_tokens })) {
        fullContent += chunk;
        res.write(`data: ${JSON.stringify({
          choices: [{ delta: { content: chunk } }]
        })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Non-streaming response
      const response = await aiManager.chat({
        model,
        messages: chatMessages,
        temperature,
        num_predict: max_tokens,
      });

      res.json({
        id: `chatcmpl-${uuidv4()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          message: response.message,
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: response.prompt_eval_count || 0,
          completion_tokens: response.eval_count || 0,
          total_tokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
        },
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// ============= Embeddings =============

app.post('/api/v1/embeddings', async (req: Request, res: Response) => {
  try {
    const { model = 'nomic-embed-text', input } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'input is required' });
    }

    const inputs = Array.isArray(input) ? input : [input];
    const embeddings = await Promise.all(
      inputs.map(async (text: string) => {
        const embedding = await aiManager.getEmbedding(text, model);
        return {
          object: 'embedding',
          embedding,
          index: inputs.indexOf(text),
        };
      })
    );

    res.json({
      object: 'list',
      data: embeddings,
      model,
      usage: {
        prompt_tokens: inputs.join(' ').split(/\s+/).length,
        total_tokens: inputs.join(' ').split(/\s+/).length,
      },
    });
  } catch (error) {
    console.error('Embedding error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// ============= Models =============

app.get('/api/v1/models', async (_req: Request, res: Response) => {
  try {
    const provider = aiManager.getProvider();
    if (provider instanceof OllamaClient) {
      const data = await provider.listModels();
      res.json({
        object: 'list',
        data: data.models.map(m => ({
          id: m.name,
          object: 'model',
          created: new Date(m.modified_at).getTime() / 1000,
          owned_by: 'local',
          size: m.size,
        })),
      });
    } else {
      res.json({
        object: 'list',
        data: [{ id: 'gpt-3.5-turbo', object: 'model', created: 1677610602, owned_by: 'openai' }],
      });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// ============= Conversations =============

app.get('/api/v1/conversations', (_req: Request, res: Response) => {
  const list = Array.from(conversations.values()).map(c => ({
    id: c.id,
    title: c.title,
    messageCount: c.messages.length,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
  res.json({ conversations: list });
});

app.post('/api/v1/conversations', (req: Request, res: Response) => {
  const { title = 'New Conversation' } = req.body;
  const conversation: Conversation = {
    id: uuidv4(),
    title,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  conversations.set(conversation.id, conversation);
  res.status(201).json(conversation);
});

app.get('/api/v1/conversations/:id', (req: Request, res: Response) => {
  const conversation = conversations.get(req.params.id);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  res.json(conversation);
});

app.delete('/api/v1/conversations/:id', (req: Request, res: Response) => {
  const deleted = conversations.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  res.json({ success: true });
});

app.post('/api/v1/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const conversation = conversations.get(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { content, role = 'user' } = req.body;
    
    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      role,
      content,
      timestamp: Date.now(),
    };
    conversation.messages.push(userMessage);

    // Get AI response
    const chatMessages: ChatMessage[] = conversation.messages.map(m => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));

    const response = await aiManager.chat({
      model: 'llama3',
      messages: chatMessages,
    });

    // Add assistant message
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: response.message.content,
      timestamp: Date.now(),
    };
    conversation.messages.push(assistantMessage);
    conversation.updatedAt = Date.now();

    res.json({
      userMessage,
      assistantMessage,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// ============= Vector Search =============

app.post('/api/v1/vector/search', async (req: Request, res: Response) => {
  try {
    const { query, limit = 10, filter } = req.body;

    // Generate embedding for query
    const embedding = await aiManager.getEmbedding(query);
    
    // Search
    const results = vectorDb.search(embedding, limit, filter);
    
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

app.post('/api/v1/vector/add', async (req: Request, res: Response) => {
  try {
    const { text, metadata = {} } = req.body;

    // Generate embedding
    const embedding = await aiManager.getEmbedding(text);
    
    // Add to vector DB
    const id = vectorDb.add(embedding, { text, ...metadata });
    
    res.json({ id });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// ============= File Processing =============

app.post('/api/v1/process-file', async (req: Request, res: Response) => {
  try {
    const { file, mimeType, filename } = req.body;

    // Decode base64 file
    const buffer = Buffer.from(file, 'base64');
    
    // Process file
    const result = await processFile(buffer, mimeType, filename);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

app.post('/api/v1/chunk-text', (req: Request, res: Response) => {
  const { text, chunkSize = 1000, overlap = 100 } = req.body;
  const chunks = chunkText(text, chunkSize, overlap);
  res.json({ chunks, count: chunks.length });
});

// ============= Plugins =============

app.get('/api/v1/plugins', (_req: Request, res: Response) => {
  res.json({ plugins: pluginManager.listPlugins() });
});

app.post('/api/v1/plugins/:name/load', async (req: Request, res: Response) => {
  const { name } = req.params;
  const plugin = pluginManager.getPlugin(name);
  if (!plugin) {
    return res.status(404).json({ error: 'Plugin not found' });
  }
  await pluginManager.loadPlugin(plugin);
  res.json({ success: true });
});

app.post('/api/v1/plugins/:name/unload', async (req: Request, res: Response) => {
  const { name } = req.params;
  await pluginManager.unloadPlugin(name);
  res.json({ success: true });
});

// ============= Memory =============

app.get('/api/v1/memory/stats', (_req: Request, res: Response) => {
  res.json(memory.getStats());
});

app.post('/api/v1/memory/store', (req: Request, res: Response) => {
  const { key, value } = req.body;
  const id = memory.store(key, value);
  res.json({ id });
});

app.get('/api/v1/memory/:key', (req: Request, res: Response) => {
  const entry = memory.retrieve(req.params.key);
  if (!entry) {
    return res.status(404).json({ error: 'Memory entry not found' });
  }
  res.json(entry);
});

app.post('/api/v1/memory/search', (req: Request, res: Response) => {
  const { pattern } = req.body;
  const results = memory.search(pattern);
  res.json({ results });
});

app.delete('/api/v1/memory/:key', (req: Request, res: Response) => {
  memory.delete(req.params.key);
  res.json({ success: true });
});

// ============= WebSocket =============

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  wsClients.set(clientId, ws);

  console.log(`WebSocket client connected: ${clientId}`);

  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    timestamp: Date.now(),
  }));

  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'chat':
          // Process chat message
          const response = await aiManager.chat({
            model: message.model || 'llama3',
            messages: message.messages,
            temperature: message.temperature,
          });
          
          ws.send(JSON.stringify({
            type: 'chat_response',
            id: message.id,
            response: response.message.content,
          }));
          break;

        case 'chat_stream':
          // Stream chat response
          let fullContent = '';
          for await (const chunk of aiManager.chatStream({
            model: message.model || 'llama3',
            messages: message.messages,
            temperature: message.temperature,
          })) {
            fullContent += chunk;
            ws.send(JSON.stringify({
              type: 'chat_chunk',
              id: message.id,
              chunk,
            }));
          }
          ws.send(JSON.stringify({
            type: 'chat_complete',
            id: message.id,
            fullContent,
          }));
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        default:
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  });

  ws.on('close', () => {
    wsClients.delete(clientId);
    console.log(`WebSocket client disconnected: ${clientId}`);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for ${clientId}:`, error);
  });
});

// Broadcast to all clients
function broadcast(message: object): void {
  const data = JSON.stringify(message);
  for (const ws of wsClients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║   OPEN MIND AI - API Server               ║
║   Running on http://localhost:${PORT}        ║
║                                           ║
║   Endpoints:                              ║
║   - GET  /health                          ║
║   - POST /api/v1/chat/completions         ║
║   - POST /api/v1/embeddings               ║
║   - GET  /api/v1/models                   ║
║   - WS   /ws                              ║
║                                           ║
╚═══════════════════════════════════════════╝
  `);
});

export { app, server };