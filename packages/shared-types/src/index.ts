/**
 * OPEN MIND AI - Shared Types
 * 
 * Common TypeScript types and schemas used across all packages.
 */

// Message types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

// Memory types
export interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  metadata?: Record<string, string>;
  createdAt: number;
  accessedAt: number;
  accessCount: number;
  priority: number;
}

export interface MemoryStats {
  totalEntries: number;
  totalSizeBytes: number;
  averageAccessCount: number;
  oldestEntry?: number;
  newestEntry?: number;
}

// Token types
export interface Token {
  type: 'word' | 'number' | 'punctuation' | 'whitespace' | 'special';
  value: string;
  position: number;
  length: number;
}

// Context types
export interface ContextEntry {
  id: string;
  tokens: Token[];
  createdAt: number;
  lastAccessed: number;
  priority: number;
}

// AI Configuration
export interface AIConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  apiKey?: string;
  baseUrl?: string;
}

// Connector types
export interface Connector {
  name: string;
  type: 'oauth' | 'api' | 'webhook';
  status: 'connected' | 'disconnected' | 'error';
  config: Record<string, unknown>;
}

// API Response types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Event types
export interface AIEvent {
  type: 'message' | 'thinking' | 'error' | 'complete';
  data: unknown;
  timestamp: number;
}

// App state types
export interface AppState {
  conversations: Conversation[];
  activeConversationId?: string;
  memory: MemoryEntry[];
  config: AIConfig;
  connectors: Connector[];
}

// Helper type for creating new messages
export function createMessage(
  role: Message['role'],
  content: string,
  metadata?: Record<string, unknown>
): Omit<Message, 'id' | 'timestamp'> {
  return {
    role,
    content,
    metadata,
  };
}

// Helper type for creating new conversations
export function createConversation(title: string): Omit<Conversation, 'id' | 'messages' | 'createdAt' | 'updatedAt'> {
  return {
    title,
  };
}

// Type guards
export function isMessage(obj: unknown): obj is Message {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'role' in obj &&
    'content' in obj
  );
}

export function isToken(obj: unknown): obj is Token {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'value' in obj
  );
}