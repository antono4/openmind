/**
 * OPEN MIND AI - AI Core
 * 
 * Local LLM integration with Ollama, OpenAI-compatible API support,
 * and streaming response handling.
 */

export interface AIProvider {
  name: string;
  type: 'ollama' | 'openai' | 'anthropic' | 'custom';
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_ctx?: number;
  num_predict?: number;
  repeat_penalty?: number;
  stop?: string[];
  stream?: boolean;
}

export interface ChatCompletionResponse {
  model: string;
  created_at: string;
  message: {
    role: 'assistant';
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  context?: number[];
}

export interface EmbeddingOptions {
  model: string;
  prompt: string;
}

export interface EmbeddingResponse {
  model: string;
  embedding: number[];
  total_duration: number;
}

export interface ModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

// Ollama API Client
export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;
  private timeout: number;

  constructor(options: {
    baseUrl?: string;
    defaultModel?: string;
    timeout?: number;
  } = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
    this.defaultModel = options.defaultModel || 'llama3';
    this.timeout = options.timeout || 120000;
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        messages: options.messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          top_p: options.top_p,
          top_k: options.top_k,
          num_ctx: options.num_ctx || 4096,
          num_predict: options.num_predict,
          repeat_penalty: options.repeat_penalty || 1.1,
        },
        stop: options.stop,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async *chatStream(options: ChatCompletionOptions): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        messages: options.messages,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.7,
          top_p: options.top_p,
          top_k: options.top_k,
          num_ctx: options.num_ctx || 4096,
          num_predict: options.num_predict,
          repeat_penalty: options.repeat_penalty || 1.1,
        },
        stop: options.stop,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              yield data.message.content;
            }
            if (data.done) break;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async generate(prompt: string, options: Partial<ChatCompletionOptions> = {}): Promise<string> {
    const response = await this.chat({
      model: options.model || this.defaultModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature,
      top_p: options.top_p,
      num_ctx: options.num_ctx,
    });

    return response.message.content;
  }

  async *generateStream(prompt: string, options: Partial<ChatCompletionOptions> = {}): AsyncGenerator<string> {
    yield* this.chatStream({
      model: options.model || this.defaultModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature,
      top_p: options.top_p,
      num_ctx: options.num_ctx,
    });
  }

  async getEmbedding(prompt: string, model = 'nomic-embed-text'): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt }),
    });

    if (!response.ok) {
      throw new Error(`Embedding error: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  async listModels(): Promise<{ models: ModelInfo[] }> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }
    return response.json();
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// OpenAI Compatible Client
export class OpenAICompatibleClient {
  private baseUrl: string;
  private apiKey: string;
  private defaultModel: string;

  constructor(options: {
    baseUrl: string;
    apiKey?: string;
    defaultModel?: string;
  }) {
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey || 'dummy';
    this.defaultModel = options.defaultModel || 'gpt-3.5-turbo';
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p,
        max_tokens: options.num_predict,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      model: data.model,
      created_at: new Date().toISOString(),
      message: {
        role: 'assistant',
        content: data.choices[0]?.message?.content || '',
      },
      done: true,
    };
  }

  async *chatStream(options: ChatCompletionOptions): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.num_predict,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }
}

// AI Manager - Unified interface for multiple providers
export class AIManager {
  private providers: Map<string, OllamaClient | OpenAICompatibleClient> = new Map();
  private activeProvider: string = 'ollama';

  constructor() {
    // Default to Ollama
    this.providers.set('ollama', new OllamaClient());
  }

  addOllama(name = 'ollama', options?: ConstructorParameters<typeof OllamaClient>[0]): void {
    this.providers.set(name, new OllamaClient(options));
    this.activeProvider = name;
  }

  addOpenAI(name: string, options: ConstructorParameters<typeof OpenAICompatibleClient>[0]): void {
    this.providers.set(name, new OpenAICompatibleClient(options));
  }

  setActiveProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not found`);
    }
    this.activeProvider = name;
  }

  getProvider(): OllamaClient | OpenAICompatibleClient | undefined {
    return this.providers.get(this.activeProvider);
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const provider = this.getProvider();
    if (!provider) throw new Error('No active provider');
    return provider.chat(options);
  }

  async *chatStream(options: ChatCompletionOptions): AsyncGenerator<string> {
    const provider = this.getProvider();
    if (!provider) throw new Error('No active provider');
    yield* provider.chatStream(options);
  }

  async generate(prompt: string, options?: Partial<ChatCompletionOptions>): Promise<string> {
    const provider = this.getProvider();
    if (!provider) throw new Error('No active provider');
    if ('generate' in provider) {
      return (provider as OllamaClient).generate(prompt, options);
    }
    const response = await this.chat({
      model: options?.model || 'default',
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature,
    });
    return response.message.content;
  }

  async *generateStream(prompt: string, options?: Partial<ChatCompletionOptions>): AsyncGenerator<string> {
    const provider = this.getProvider();
    if (!provider) throw new Error('No active provider');
    if ('generateStream' in provider) {
      yield* (provider as OllamaClient).generateStream(prompt, options);
    } else {
      yield* this.chatStream({
        model: options?.model || 'default',
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature,
      });
    }
  }

  async getEmbedding(prompt: string, model?: string): Promise<number[]> {
    const provider = this.getProvider();
    if (!provider) throw new Error('No active provider');
    if (provider instanceof OllamaClient) {
      return provider.getEmbedding(prompt, model);
    }
    throw new Error('Embeddings not supported by this provider');
  }

  async isProviderAvailable(name?: string): Promise<boolean> {
    const providerName = name || this.activeProvider;
    const provider = this.providers.get(providerName);
    if (!provider) return false;
    if (provider instanceof OllamaClient) {
      return provider.isAvailable();
    }
    return true;
  }

  getProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Export singleton instance
export const aiManager = new AIManager();

export default {
  OllamaClient,
  OpenAICompatibleClient,
  AIManager,
  aiManager,
};