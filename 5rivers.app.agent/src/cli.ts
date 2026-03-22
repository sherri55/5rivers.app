#!/usr/bin/env node
/**
 * CLI test harness for the 5Rivers agent.
 * Interactive REPL — type messages and see the agent respond.
 *
 * Usage: FIVE_RIVERS_TOKEN=<jwt> OLLAMA_HOST=<host> node dist/cli.js
 */
import 'dotenv/config';
import * as readline from 'node:readline';
import { processMessage } from './llm.js';
import { loadAuthMap } from './auth.js';

const TOKEN = process.env.FIVE_RIVERS_TOKEN;
if (!TOKEN) {
  console.error('Error: Set FIVE_RIVERS_TOKEN environment variable (JWT token for the 5Rivers API)');
  process.exit(1);
}

loadAuthMap();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '\n> ',
});

console.log('5Rivers Agent CLI — type a message to interact (Ctrl+C to quit)');
console.log(`  Ollama: ${process.env.OLLAMA_HOST ?? 'http://localhost:11434'}`);
console.log(`  Model:  ${process.env.OLLAMA_MODEL ?? 'llama3.1'}`);
console.log(`  API:    ${process.env.FIVE_RIVERS_API_URL ?? 'http://localhost:4000/api'}`);
rl.prompt();

rl.on('line', async (line) => {
  const input = line.trim();
  if (!input) { rl.prompt(); return; }

  if (input === '/quit' || input === '/exit') {
    console.log('Goodbye!');
    process.exit(0);
  }

  try {
    console.log('\n⏳ Thinking...');
    const response = await processMessage('cli', 'local', input, TOKEN);

    if (response.toolCalls) {
      console.log(`\n🔧 Tool calls: ${response.toolCalls.map((tc) => tc.name).join(', ')}`);
    }
    console.log(`\n${response.text}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nError: ${msg}`);
  }

  rl.prompt();
});
