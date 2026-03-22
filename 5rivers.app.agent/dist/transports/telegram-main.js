#!/usr/bin/env node
/**
 * Telegram bot entry point.
 * Usage: TELEGRAM_BOT_TOKEN=<token> FIVE_RIVERS_TOKEN=<jwt> node dist/transports/telegram-main.js
 */
import 'dotenv/config';
import { loadAuthMap } from '../auth.js';
import { createTelegramBot } from './telegram.js';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('Error: Set TELEGRAM_BOT_TOKEN environment variable');
    console.error('Create a bot via @BotFather on Telegram to get your token.');
    process.exit(1);
}
loadAuthMap();
const bot = createTelegramBot(BOT_TOKEN);
bot.launch().then(() => {
    console.log('Telegram bot is running!');
    console.log(`  Ollama: ${process.env.OLLAMA_HOST ?? 'http://localhost:11434'}`);
    console.log(`  Model:  ${process.env.OLLAMA_MODEL ?? 'llama3.1'}`);
    console.log(`  API:    ${process.env.FIVE_RIVERS_API_URL ?? 'http://localhost:4000/api'}`);
});
// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
