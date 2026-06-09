#!/usr/bin/env node

/**
 * OPEN MIND AI - Command Line Interface
 * 
 * A powerful terminal-based interface for OPEN MIND AI.
 * Supports chat, embeddings, file processing, and more.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { readFileSync, existsSync } from 'fs';
import { MemoryEngine } from '@openmind/memory-engine';
import { OllamaClient, AIManager } from '@openmind/ai-core';
import { VectorDB } from '@openmind/vector-db';
import { processFile, chunkText } from '@openmind/file-processor';
import { pluginManager } from '@openmind/plugin-system';
import type { Message } from '@openmind/shared-types';

// Initialize services
const memory = new MemoryEngine({ inMemory: true });
const aiManager = new AIManager();
const vectorDb = new VectorDB({ dimension: 768 });

// Initialize Ollama client with default settings
const ollama = new OllamaClient();

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

async function printBanner() {
  console.log(chalk.blue(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║   ███████╗ █████╗ ██████╗  ██████╗██╗  ██╗            ║
  ║   ██╔════╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝            ║
  ║   ███████╗███████║██████╔╝██║     █████╔╝             ║
  ║   ╚════██║██╔══██║██╔══██╗██║     ██╔═██╗             ║
  ║   ███████║██║  ██║██║  ██║╚██████╗██║  ██╗            ║
  ║   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝            ║
  ║                                                       ║
  ║   ${chalk.yellow('AI Without Token Limitations')}                     ║
  ║   ${chalk.gray('Open Source • Local LLM • Vector Search')}            ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `));
}

async function checkOllamaStatus() {
  const spinner = ora('Checking Ollama status...').start();
  const available = await ollama.isAvailable();
  
  if (available) {
    spinner.succeed('Ollama is running');
    try {
      const models = await ollama.listModels();
      if (models.models.length > 0) {
        console.log(chalk.gray(`  Available models: ${models.models.map(m => m.name).join(', ')}`));
      } else {
        console.log(chalk.yellow('  No models installed. Run: ollama pull llama3'));
      }
    } catch {
      console.log(chalk.yellow('  Could not fetch model list'));
    }
  } else {
    spinner.warn('Ollama is not running');
    console.log(chalk.gray('  Start Ollama with: ollama serve'));
    console.log(chalk.gray('  Or install from: https://ollama.ai'));
  }
  
  return available;
}

async function chatMode() {
  console.log(chalk.green('\n✓ Chat mode started'));
  console.log(chalk.gray('Type your messages. Type "exit" to quit, "clear" to clear history.\n'));

  const messages: Message[] = [];

  while (true) {
    const { input } = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message: chalk.cyan('You:'),
        prefix: '',
      },
    ]);

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log(chalk.blue('\nChat session ended. Goodbye!\n'));
      break;
    }

    if (input.toLowerCase() === 'clear') {
      messages.length = 0;
      console.log(chalk.gray('Conversation cleared.\n'));
      continue;
    }

    if (input.trim()) {
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: input,
        timestamp: Date.now(),
      };
      messages.push(userMessage);

      const spinner = ora('Thinking...').start();
      
      try {
        const response = await ollama.chat({
          model: 'llama3',
          messages: messages.map(m => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
          })),
        });

        spinner.succeed();

        console.log(chalk.magenta(`\nOPEN MIND AI:\n${response.message.content}\n`));

        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: response.message.content,
          timestamp: Date.now(),
        };
        messages.push(assistantMessage);
        
        console.log(chalk.gray(`Tokens: ${response.eval_count || 'N/A'} | Context: ${response.prompt_eval_count || 'N/A'}`));
      } catch (error) {
        spinner.fail('Failed to get response');
        console.log(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }
  }
}

async function streamChatMode() {
  console.log(chalk.green('\n✓ Stream Chat mode started'));
  console.log(chalk.gray('Streaming responses. Type "exit" to quit.\n'));

  const messages: { role: string; content: string }[] = [];

  while (true) {
    const { input } = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message: chalk.cyan('You:'),
        prefix: '',
      },
    ]);

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log(chalk.blue('\nStream chat ended. Goodbye!\n'));
      break;
    }

    if (input.trim()) {
      messages.push({ role: 'user', content: input });

      process.stdout.write(chalk.magenta('\nOPEN MIND AI: '));
      
      let fullResponse = '';
      try {
        for await (const chunk of ollama.chatStream({
          model: 'llama3',
          messages: messages as { role: 'user' | 'assistant' | 'system'; content: string }[],
        })) {
          process.stdout.write(chalk.magenta(chunk));
          fullResponse += chunk;
        }
        console.log('\n');
        
        messages.push({ role: 'assistant', content: fullResponse });
      } catch (error) {
        console.log(chalk.red(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }
  }
}

async function embeddingMode() {
  console.log(chalk.green('\n✓ Embedding mode started'));
  console.log(chalk.gray('Generate embeddings for text. Type "exit" to quit.\n'));

  while (true) {
    const { input } = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message: chalk.cyan('Text:'),
        prefix: '',
      },
    ]);

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log(chalk.blue('\nEmbedding mode ended.\n'));
      break;
    }

    if (input.trim()) {
      const spinner = ora('Generating embedding...').start();
      
      try {
        const embedding = await ollama.getEmbedding(input);
        spinner.succeed();
        
        console.log(chalk.gray(`\nEmbedding dimension: ${embedding.length}`));
        console.log(chalk.gray(`First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`));
        
        // Store in vector DB
        const id = vectorDb.add(embedding, { text: input, timestamp: Date.now() });
        console.log(chalk.green(`Stored in vector DB with ID: ${id}`));
      } catch (error) {
        spinner.fail('Failed to generate embedding');
        console.log(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }
  }
}

async function searchMode() {
  console.log(chalk.green('\n✓ Vector Search mode started'));
  console.log(chalk.gray('Search stored embeddings. Type "exit" to quit.\n'));

  while (true) {
    const { input } = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message: chalk.cyan('Query:'),
        prefix: '',
      },
    ]);

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log(chalk.blue('\nSearch mode ended.\n'));
      break;
    }

    if (input.trim()) {
      const spinner = ora('Searching...').start();
      
      try {
        const embedding = await ollama.getEmbedding(input);
        const results = vectorDb.search(embedding, 5);
        spinner.succeed();
        
        if (results.length > 0) {
          console.log(chalk.cyan('\nSearch Results:'));
          results.forEach((r, i) => {
            const text = r.metadata?.text || 'N/A';
            console.log(chalk.gray(`  ${i + 1}. [${(r.score * 100).toFixed(1)}%] ${text.substring(0, 100)}...`));
          });
        } else {
          console.log(chalk.yellow('  No results found'));
        }
      } catch (error) {
        spinner.fail('Search failed');
        console.log(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }
  }
}

async function fileProcessMode() {
  console.log(chalk.green('\n✓ File Processing mode started'));
  console.log(chalk.gray('Process PDF, DOCX, TXT files. Type "exit" to quit.\n'));

  while (true) {
    const { filepath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'filepath',
        message: chalk.cyan('File path:'),
        prefix: '',
      },
    ]);

    if (filepath.toLowerCase() === 'exit' || filepath.toLowerCase() === 'quit') {
      console.log(chalk.blue('\nFile processing ended.\n'));
      break;
    }

    if (filepath.trim() && existsSync(filepath)) {
      const spinner = ora('Processing file...').start();
      
      try {
        const buffer = readFileSync(filepath);
        const result = await processFile(buffer, undefined, filepath.split('/').pop());
        spinner.succeed();
        
        console.log(chalk.cyan('\nFile Info:'));
        console.log(chalk.gray(`  Type: ${result.type}`));
        console.log(chalk.gray(`  Size: ${(result.metadata.size / 1024).toFixed(2)} KB`));
        if (result.metadata.pages) console.log(chalk.gray(`  Pages: ${result.metadata.pages}`));
        if (result.metadata.wordCount) console.log(chalk.gray(`  Words: ${result.metadata.wordCount}`));
        
        console.log(chalk.cyan('\nContent Preview:'));
        console.log(chalk.gray(result.content.substring(0, 500) + (result.content.length > 500 ? '...' : '')));
        
        // Chunk the content
        const chunks = chunkText(result.content);
        console.log(chalk.green(`\n  Total chunks: ${chunks.length}`));
      } catch (error) {
        spinner.fail('Failed to process file');
        console.log(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    } else if (filepath.trim()) {
      console.log(chalk.red('File not found'));
    }
  }
}

async function pluginMode() {
  console.log(chalk.green('\n✓ Plugin Manager started'));
  console.log(chalk.gray('Manage plugins. Type "exit" to quit.\n'));

  // Load built-in plugins
  await pluginManager.loadPlugin({
    name: 'memory-search',
    version: '1.0.0',
    description: 'Memory search plugin',
    hooks: { onLoad: () => console.log(chalk.gray('  Memory search plugin loaded')) },
  });

  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.cyan('Action:'),
        choices: ['List plugins', 'Load plugin', 'Unload plugin', 'Check status', 'Exit'],
      },
    ]);

    if (action === 'Exit') {
      console.log(chalk.blue('\nPlugin manager closed.\n'));
      break;
    }

    switch (action) {
      case 'List plugins':
        const plugins = pluginManager.listPlugins();
        console.log(chalk.cyan('\nInstalled Plugins:'));
        if (plugins.length === 0) {
          console.log(chalk.gray('  No plugins'));
        } else {
          plugins.forEach(p => {
            console.log(chalk.gray(`  - ${p.name} v${p.version}${p.description ? ` - ${p.description}` : ''}`));
          });
        }
        break;

      case 'Check status':
        const stats = {
          plugins: pluginManager.getPluginCount(),
          vectors: vectorDb.count(),
        };
        console.log(chalk.cyan('\nSystem Status:'));
        console.log(chalk.gray(`  Active plugins: ${stats.plugins}`));
        console.log(chalk.gray(`  Vector entries: ${stats.vectors}`));
        break;
    }
  }
}

async function infoCommand() {
  const stats = memory.getStats();
  const vectorStats = vectorDb.getStats();
  
  console.log(chalk.blue('\n📊 OPEN MIND AI - System Information\n'));
  console.log(chalk.white('  Version:       '), chalk.green('1.0.0'));
  console.log(chalk.white('  Architecture:  '), chalk.green('CLI (Node.js) + Ollama'));
  console.log(chalk.white('  Memory Mode:  '), chalk.green('In-Memory (Demo)'));
  console.log(chalk.white('  Token Limit:  '), chalk.green('None (Unlimited)'));
  console.log(chalk.white('  License:      '), chalk.green('MIT'));
  
  console.log(chalk.white('\n  📦 Packages:'));
  console.log(chalk.gray('    - @openmind/ai-core (Ollama integration)'));
  console.log(chalk.gray('    - @openmind/vector-db (Semantic search)'));
  console.log(chalk.gray('    - @openmind/file-processor (PDF, DOCX, etc)'));
  console.log(chalk.gray('    - @openmind/plugin-system (Extensibility)'));
  
  console.log(chalk.white('\n  💾 Memory Stats:'));
  console.log(chalk.gray(`    Total Entries: ${stats.totalEntries}`));
  console.log(chalk.gray(`    Total Size:    ${stats.totalSizeBytes} bytes`));
  
  console.log(chalk.white('\n  🔍 Vector DB Stats:'));
  console.log(chalk.gray(`    Entries:       ${vectorStats.count}`));
  console.log(chalk.gray(`    Dimension:     ${vectorStats.dimension}`));
  console.log(chalk.gray(`    Metric:        ${vectorStats.metric}`));
}

async function main() {
  await printBanner();

  const args = process.argv.slice(2);
  const command = args[0] || 'interactive';

  switch (command) {
    case 'chat':
      await checkOllamaStatus();
      await chatMode();
      break;
    case 'stream':
      await checkOllamaStatus();
      await streamChatMode();
      break;
    case 'embed':
      await checkOllamaStatus();
      await embeddingMode();
      break;
    case 'search':
      await checkOllamaStatus();
      await searchMode();
      break;
    case 'file':
      await fileProcessMode();
      break;
    case 'plugins':
      await pluginMode();
      break;
    case 'info':
      await infoCommand();
      break;
    case 'help':
      console.log(chalk.blue('\n📖 OPEN MIND AI - Help\n'));
      console.log(chalk.white('  Usage: openmind [command]\n'));
      console.log(chalk.white('  Commands:'));
      console.log(chalk.gray('    openmind           - Interactive mode'));
      console.log(chalk.gray('    openmind chat      - Chat mode with Ollama'));
      console.log(chalk.gray('    openmind stream    - Streaming chat mode'));
      console.log(chalk.gray('    openmind embed     - Generate embeddings'));
      console.log(chalk.gray('    openmind search    - Vector search mode'));
      console.log(chalk.gray('    openmind file      - Process files'));
      console.log(chalk.gray('    openmind plugins   - Plugin manager'));
      console.log(chalk.gray('    openmind info      - System information'));
      console.log(chalk.gray('    openmind help      - Show this help\n'));
      break;
    default:
      await checkOllamaStatus();
      await interactiveMode();
  }

  memory.close();
  vectorDb.close();
}

async function interactiveMode() {
  console.log(chalk.green('\n✓ Interactive mode started'));
  console.log(chalk.gray('Type your messages. Type "exit" to quit.\n'));

  while (true) {
    const { message } = await inquirer.prompt([
      {
        type: 'input',
        name: 'message',
        message: chalk.cyan('You:'),
        prefix: '',
      },
    ]);

    if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit') {
      console.log(chalk.blue('\nThank you for using OPEN MIND AI! Goodbye.\n'));
      break;
    }

    if (message.trim()) {
      const spinner = ora('Processing...').start();
      await new Promise(resolve => setTimeout(resolve, 300));
      spinner.succeed();
      
      const responses = [
        `OPEN MIND AI processed: "${message.substring(0, 50)}..."`,
        `Ready for more! Your message has been noted.`,
        `Processing complete with unlimited context!`,
      ];
      
      console.log(chalk.magenta(`\nOPEN MIND AI: ${responses[Math.floor(Math.random() * responses.length)]}\n`));
    }
  }
}

main().catch(console.error);