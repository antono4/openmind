/**
 * OPEN MIND AI - Plugin System
 * 
 * Extensible plugin architecture for adding custom functionality.
 */

export interface Plugin {
  name: string;
  version: string;
  description?: string;
  author?: string;
  hooks: PluginHooks;
  config?: Record<string, unknown>;
}

export interface PluginHooks {
  onLoad?: () => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
  onMessage?: (message: unknown) => Promise<unknown> | unknown;
  onProcess?: (input: unknown, context: unknown) => Promise<unknown> | unknown;
  onEmbed?: (text: string) => Promise<number[]> | number[];
  beforeResponse?: (response: unknown) => Promise<unknown> | unknown;
  afterResponse?: (response: unknown) => Promise<unknown> | unknown;
}

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  main: string;
  dependencies?: Record<string, string>;
}

export type HookName = keyof PluginHooks;

// Plugin Manager
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private hookHandlers: Map<HookName, Array<{ plugin: string; handler: Function }>> = new Map();

  constructor() {
    // Initialize hook handler arrays
    const hookNames: HookName[] = ['onLoad', 'onUnload', 'onMessage', 'onProcess', 'onEmbed', 'beforeResponse', 'afterResponse'];
    for (const name of hookNames) {
      this.hookHandlers.set(name, []);
    }
  }

  async loadPlugin(plugin: Plugin): Promise<boolean> {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin ${plugin.name} is already loaded`);
      return false;
    }

    try {
      // Call onLoad hook if present
      if (plugin.hooks.onLoad) {
        await plugin.hooks.onLoad();
      }

      // Register hooks
      this.registerHooks(plugin);

      // Store plugin
      this.plugins.set(plugin.name, plugin);
      console.log(`Plugin ${plugin.name} v${plugin.version} loaded successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to load plugin ${plugin.name}:`, error);
      return false;
    }
  }

  async unloadPlugin(name: string): Promise<boolean> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      console.warn(`Plugin ${name} not found`);
      return false;
    }

    try {
      // Call onUnload hook if present
      if (plugin.hooks.onUnload) {
        await plugin.hooks.onUnload();
      }

      // Unregister hooks
      this.unregisterHooks(name);

      // Remove plugin
      this.plugins.delete(name);
      console.log(`Plugin ${name} unloaded successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to unload plugin ${name}:`, error);
      return false;
    }
  }

  private registerHooks(plugin: Plugin): void {
    const hookNames: HookName[] = ['onLoad', 'onUnload', 'onMessage', 'onProcess', 'onEmbed', 'beforeResponse', 'afterResponse'];
    
    for (const hookName of hookNames) {
      const hook = plugin.hooks[hookName];
      if (hook) {
        const handlers = this.hookHandlers.get(hookName)!;
        handlers.push({ plugin: plugin.name, handler: hook });
      }
    }
  }

  private unregisterHooks(pluginName: string): void {
    for (const [, handlers] of this.hookHandlers) {
      const index = handlers.findIndex(h => h.plugin === pluginName);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Execute all handlers for a specific hook
  async executeHook<T>(hookName: HookName, data: T): Promise<T> {
    const handlers = this.hookHandlers.get(hookName) || [];
    let result = data;

    for (const { handler } of handlers) {
      try {
        const newResult = await handler(result);
        if (newResult !== undefined) {
          result = newResult as T;
        }
      } catch (error) {
        console.error(`Error in ${hookName} hook:`, error);
      }
    }

    return result;
  }

  async onMessage(message: unknown): Promise<unknown> {
    return this.executeHook('onMessage', message);
  }

  async onProcess(input: unknown, context: unknown): Promise<unknown> {
    return this.executeHook('onProcess', { input, context });
  }

  async onEmbed(text: string): Promise<number[] | null> {
    const handlers = this.hookHandlers.get('onEmbed') || [];
    let embedding: number[] | null = null;

    for (const { handler } of handlers) {
      try {
        const result = await handler(text);
        if (result) {
          embedding = result as number[];
        }
      } catch (error) {
        console.error('Error in onEmbed hook:', error);
      }
    }

    return embedding;
  }

  async beforeResponse(response: unknown): Promise<unknown> {
    return this.executeHook('beforeResponse', response);
  }

  async afterResponse(response: unknown): Promise<unknown> {
    return this.executeHook('afterResponse', response);
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  listPlugins(): { name: string; version: string; description?: string }[] {
    return this.getAllPlugins().map(p => ({
      name: p.name,
      version: p.version,
      description: p.description,
    }));
  }

  isLoaded(name: string): boolean {
    return this.plugins.has(name);
  }

  getPluginCount(): number {
    return this.plugins.size;
  }
}

// Built-in plugins

// Memory Search Plugin
export function createMemorySearchPlugin(): Plugin {
  return {
    name: 'memory-search',
    version: '1.0.0',
    description: 'Enable memory-based search in conversations',
    hooks: {
      onProcess: async (data) => {
        const { input } = data as { input: string };
        if (input.toLowerCase().includes('remember') || input.toLowerCase().includes('recall')) {
          // This would integrate with memory engine
          console.log('Memory search triggered');
        }
        return data;
      },
    },
  };
}

// Code Analysis Plugin
export function createCodeAnalysisPlugin(): Plugin {
  return {
    name: 'code-analysis',
    version: '1.0.0',
    description: 'Analyze and explain code snippets',
    hooks: {
      onProcess: async (data) => {
        const { input } = data as { input: string };
        const codeBlocks = input.match(/```[\s\S]*?```/g);
        if (codeBlocks) {
          console.log(`Found ${codeBlocks.length} code blocks to analyze`);
        }
        return data;
      },
    },
  };
}

// Translation Plugin
export function createTranslationPlugin(): Plugin {
  return {
    name: 'translation',
    version: '1.0.0',
    description: 'Translate text between languages',
    hooks: {
      onMessage: async (message) => {
        const msg = message as { content: string };
        // Detect translation request
        if (msg.content.includes('translate to')) {
          console.log('Translation requested');
        }
        return message;
      },
    },
  };
}

// Web Search Plugin
export function createWebSearchPlugin(): Plugin {
  return {
    name: 'web-search',
    version: '1.0.0',
    description: 'Search the web for information',
    hooks: {
      onProcess: async (data) => {
        const { input } = data as { input: string };
        if (input.toLowerCase().includes('search for') || input.toLowerCase().includes('google')) {
          console.log('Web search triggered');
        }
        return data;
      },
    },
  };
}

// Export singleton instance
export const pluginManager = new PluginManager();

export default {
  Plugin,
  PluginHooks,
  PluginManager,
  pluginManager,
  createMemorySearchPlugin,
  createCodeAnalysisPlugin,
  createTranslationPlugin,
  createWebSearchPlugin,
};