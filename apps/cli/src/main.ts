#!/usr/bin/env node

/**
 * OPEN MIND AI - Command Line Interface
 * 
 * A terminal-based interface for OPEN MIND AI.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { MemoryEngine } from '@openmind/memory-engine';
import type { Message } from '@openmind/shared-types';

// Initialize memory engine
const memory = new MemoryEngine({ inMemory: true });

// Simple AI processing without token limits
const processMessage = async (input: string): Promise<string> => {
  const spinner = ora('Processing...').start();
  await new Promise(resolve => setTimeout(resolve, 300));
  spinner.succeed();
  
  // Store in memory
  memory.store(`msg_${Date.now()}`, input);
  
  const responses = [
    `I've received your message: "${input.substring(0, 50)}${input.length > 50 ? '...' : ''}"`,
    `OPEN MIND AI processed your input successfully!`,
    `Interesting! As an open-source AI without token limits, I can handle any amount of text.`,
    `Your message has been processed. Ready for the next input!`,
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

async function printBanner() {
  console.log(chalk.blue(`
  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║   ███████╗ █████╗ ██████╗  ██████╗██╗  ██╗  ║
  ║   ██╔════╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝  ║
  ║   ███████╗███████║██████╔╝██║     █████╔╝   ║
  ║   ╚════██║██╔══██║██╔══██╗██║     ██╔═██╗   ║
  ║   ███████║██║  ██║██║  ██║╚██████╗██║  ██╗  ║
  ║   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝  ║
  ║                                           ║
  ║   ${chalk.yellow('AI Without Token Limitations')}           ║
  ║   ${chalk.gray('Open Source • Local • Private')}            ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝
  `));
}

async function interactiveMode() {
  console.log(chalk.green('\n✓ Interactive mode started'));
  console.log(chalk.gray('Type your messages and press Enter. Type "exit" to quit.\n'));

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
      const response = await processMessage(message);
      console.log(chalk.magenta(`\nOPEN MIND AI: ${response}\n`));
    }
  }
}

async function chatMode() {
  console.log(chalk.green('\n✓ Chat mode started'));
  console.log(chalk.gray('Start chatting with OPEN MIND AI. Type "exit" to quit.\n'));

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

    if (input.trim()) {
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: input,
        timestamp: Date.now(),
      };
      messages.push(userMessage);

      const response = await processMessage(input);
      
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      messages.push(assistantMessage);

      console.log(chalk.magenta(`\nOPEN MIND AI: ${response}\n`));
      console.log(chalk.gray(`Messages in session: ${messages.length}\n`));
    }
  }
}

async function infoCommand() {
  const stats = memory.getStats();
  
  console.log(chalk.blue('\n📊 OPEN MIND AI - System Information\n'));
  console.log(chalk.white('  Version:      '), chalk.green('1.0.0'));
  console.log(chalk.white('  Architecture: '), chalk.green('CLI (Node.js)'));
  console.log(chalk.white('  Memory Mode: '), chalk.green('In-Memory (Demo)'));
  console.log(chalk.white('  Token Limit: '), chalk.green('None (Unlimited)'));
  console.log(chalk.white('  License:     '), chalk.green('MIT'));
  console.log(chalk.white('\n  Memory Stats:'));
  console.log(chalk.gray(`    Total Entries: ${stats.totalEntries}`));
  console.log(chalk.gray(`    Total Size:    ${stats.totalSizeBytes} bytes`));
  console.log(chalk.gray(`    Avg Access:    ${stats.averageAccessCount.toFixed(2)}\n`));
}

async function main() {
  await printBanner();

  const args = process.argv.slice(2);
  const command = args[0] || 'interactive';

  switch (command) {
    case 'chat':
      await chatMode();
      break;
    case 'info':
      await infoCommand();
      break;
    case 'help':
      console.log(chalk.blue('\n📖 OPEN MIND AI - Help\n'));
      console.log(chalk.white('  Available Commands:'));
      console.log(chalk.gray('    openmind              - Start interactive mode'));
      console.log(chalk.gray('    openmind chat         - Start chat mode'));
      console.log(chalk.gray('    openmind info         - Show system information'));
      console.log(chalk.gray('    openmind help         - Show this help message'));
      console.log(chalk.gray('    openmind --version    - Show version\n'));
      break;
    case '--version':
    case '-v':
      console.log(chalk.green('\nOPEN MIND AI v1.0.0\n'));
      break;
    default:
      await interactiveMode();
  }

  memory.close();
}

main().catch(console.error);