#!/usr/bin/env node
/**
 * CLI harness for the 5Rivers agent.
 *
 * Usage:
 *   node dist/cli.js                          # use default profile from agent.profiles.json
 *   node dist/cli.js --profile deepseek       # named profile
 *   node dist/cli.js --provider deepseek      # raw provider override
 *   node dist/cli.js --local lmstudio --cloud deepseek   # explicit hybrid
 *   node dist/cli.js --provider deepseek --model deepseek-reasoner --reasoning
 *
 * Runtime commands (type in the REPL):
 *   /profile <name>      — switch profile without restarting
 *   /provider <name>     — switch provider without restarting
 *   /model <name>        — change model without restarting
 *   /profiles            — list all available profiles
 *   /config              — show current provider/model config
 *   /clear               — reset conversation history
 *   /quit | /exit        — exit
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env'), override: true });
// Apply CLI flags / profile before importing llm.ts (providers read process.env at init)
import { applyConfig, switchProfile, listProfiles, describeActiveConfig } from './config.js';
const activeConfig = applyConfig();
import * as readline from 'node:readline';
import { processMessage, clearProviderRegistry } from './llm.js';
import { loadAuthMap } from './auth.js';
import { createTelegramBot } from './transports/telegram.js';
loadAuthMap();
// ── Telegram bot ──────────────────────────────────────────────────────────────
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
if (telegramToken) {
    const bot = createTelegramBot(telegramToken);
    bot.launch().then(() => console.log('  Telegram: bot running'));
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
else {
    console.log('  Telegram: not configured (set TELEGRAM_BOT_TOKEN to enable)');
}
// ── Startup banner ────────────────────────────────────────────────────────────
const interactive = process.stdin.isTTY;
console.log(interactive
    ? '5Rivers Agent CLI — type a message, or /help for commands (Ctrl+C to quit)'
    : '5Rivers Agent — non-interactive mode (Telegram bot only)');
console.log(`  Config:  ${activeConfig}`);
console.log(`  API:     ${process.env.FIVE_RIVERS_API_URL ?? 'http://localhost:4000/api'}`);
if (!interactive) {
    console.log('  CLI:    disabled (stdin is not a TTY) — use Telegram or the UI');
}
else {
    startRepl();
}
// ── REPL ──────────────────────────────────────────────────────────────────────
function startRepl() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '\n> ',
    });
    rl.prompt();
    rl.on('line', async (line) => {
        const input = line.trim();
        if (!input) {
            rl.prompt();
            return;
        }
        // ── Slash commands ─────────────────────────────────────────────────────
        if (input === '/quit' || input === '/exit') {
            console.log('Goodbye!');
            process.exit(0);
        }
        if (input === '/help') {
            console.log(`
Commands:
  /profile <name>      Switch to a named profile (see /profiles)
  /provider <name>     Switch provider: gemini | groq | deepseek | lmstudio | ollama
  /model <name>        Change model for the active provider
  /profiles            List all available profiles
  /config              Show current provider/model configuration
  /clear               Reset conversation history and pipeline state
  /quit | /exit        Exit`);
            rl.prompt();
            return;
        }
        if (input === '/profiles') {
            console.log('\n' + listProfiles());
            rl.prompt();
            return;
        }
        if (input === '/config') {
            console.log(`\nActive config: ${describeActiveConfig()}`);
            rl.prompt();
            return;
        }
        if (input === '/clear') {
            const { resetConversation } = await import('./llm.js');
            resetConversation('cli', 'local');
            console.log('Conversation cleared.');
            rl.prompt();
            return;
        }
        // /profile <name>
        const profileMatch = input.match(/^\/profile\s+(\S+)$/i);
        if (profileMatch) {
            const result = switchProfile(profileMatch[1]);
            clearProviderRegistry();
            const { resetConversation } = await import('./llm.js');
            resetConversation('cli', 'local');
            console.log('\n' + result);
            console.log('(conversation reset for new provider)');
            rl.prompt();
            return;
        }
        // /provider <name>
        const providerMatch = input.match(/^\/provider\s+(\S+)$/i);
        if (providerMatch) {
            const result = switchProfile(providerMatch[1]);
            clearProviderRegistry();
            const { resetConversation } = await import('./llm.js');
            resetConversation('cli', 'local');
            console.log('\n' + result);
            console.log('(conversation reset for new provider)');
            rl.prompt();
            return;
        }
        // /model <name>
        const modelMatch = input.match(/^\/model\s+(\S+)$/i);
        if (modelMatch) {
            const model = modelMatch[1];
            const p = (process.env.LLM_PROVIDER ?? 'ollama').toLowerCase();
            if (p === 'deepseek')
                process.env.DEEPSEEK_MODEL = model;
            else if (p === 'gemini')
                process.env.GEMINI_MODEL = model;
            else if (p === 'groq')
                process.env.GROQ_MODEL = model;
            else if (p === 'ollama')
                process.env.OLLAMA_MODEL = model;
            else if (p === 'lmstudio')
                process.env.LMSTUDIO_TOOL_MODEL = model;
            clearProviderRegistry();
            const { resetConversation } = await import('./llm.js');
            resetConversation('cli', 'local');
            console.log(`\n✅ Model set to "${model}" for ${p}. (conversation reset)`);
            rl.prompt();
            return;
        }
        // ── Regular message ────────────────────────────────────────────────────
        try {
            console.log('\n⏳ Thinking...');
            const response = await processMessage('cli', 'local', input);
            if (response.toolCalls) {
                console.log(`\n🔧 Tools: ${response.toolCalls.map((tc) => tc.name).join(', ')}`);
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
}
