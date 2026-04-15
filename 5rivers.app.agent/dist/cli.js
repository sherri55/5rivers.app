#!/usr/bin/env node
/**
 * CLI test harness for the 5Rivers agent.
 * Interactive REPL — type messages and see the agent respond.
 *
 * Usage: node dist/cli.js
 * Credentials via .env: FIVE_RIVERS_EMAIL, FIVE_RIVERS_PASSWORD, FIVE_RIVERS_ORG_SLUG
 * Or static token:      FIVE_RIVERS_TOKEN=<jwt>
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env'), override: true });
import * as readline from 'node:readline';
import { processMessage } from './llm.js';
import { loadAuthMap } from './auth.js';
loadAuthMap();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\n> ',
});
const provider = process.env.LLM_PROVIDER ?? 'ollama';
console.log('5Rivers Agent CLI — type a message to interact (Ctrl+C to quit)');
console.log(`  Provider: ${provider}`);
if (provider === 'groq') {
    const key = process.env.GROQ_API_KEY ?? '(not set)';
    console.log(`  Groq key: ${key.slice(0, 8)}...${key.slice(-4)}`);
    console.log(`  Model:    ${process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'}`);
}
else if (provider === 'lmstudio') {
    console.log(`  LM Studio: ${process.env.LMSTUDIO_HOST ?? 'http://localhost:1234'}`);
    console.log(`  Model:     ${process.env.LMSTUDIO_MODEL ?? '(auto)'}`);
}
else {
    console.log(`  Ollama: ${process.env.OLLAMA_HOST ?? 'http://localhost:11434'}`);
    console.log(`  Model:  ${process.env.OLLAMA_MODEL ?? 'llama3.1'}`);
}
console.log(`  API:    ${process.env.FIVE_RIVERS_API_URL ?? 'http://localhost:4000/api'}`);
rl.prompt();
rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
        rl.prompt();
        return;
    }
    if (input === '/quit' || input === '/exit') {
        console.log('Goodbye!');
        process.exit(0);
    }
    if (input === '/clear') {
        const { clearHistory } = await import('./conversation.js');
        clearHistory('cli', 'local');
        console.log('Conversation history cleared.');
        rl.prompt();
        return;
    }
    try {
        console.log('\n⏳ Thinking...');
        const response = await processMessage('cli', 'local', input);
        if (response.toolCalls) {
            console.log(`\n🔧 Tool calls: ${response.toolCalls.map((tc) => tc.name).join(', ')}`);
        }
        console.log(`\n${response.text}`);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const cause = err?.cause;
        console.error(`\nError: ${msg}`);
        if (cause)
            console.error(`Cause: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
    rl.prompt();
});
