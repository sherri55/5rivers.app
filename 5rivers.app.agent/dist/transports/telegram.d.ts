/**
 * Telegram bot transport for the 5Rivers agent.
 *
 * Commands:
 *   /start   — welcome message
 *   /help    — list available actions
 *   /register <token> — link your Telegram account to a 5Rivers JWT
 *   /clear   — clear conversation history
 *   Any other message → processed by the agent
 */
import { Telegraf } from 'telegraf';
export declare function createTelegramBot(botToken: string): Telegraf;
