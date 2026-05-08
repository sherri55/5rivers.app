/**
 * Telegram bot transport for the 5Rivers agent.
 *
 * Commands:
 *   /start   — welcome message
 *   /help    — list available actions
 *   /register <token> — link your Telegram account to a specific 5Rivers JWT
 *   /clear   — clear conversation history
 *   Any other message (text or photo) → processed by the agent
 *
 * Auth: uses per-user registered tokens when set, otherwise falls back to
 * the auto-token derived from FIVE_RIVERS_EMAIL / PASSWORD / ORG_SLUG —
 * so the bot works out of the box for single-org deployments.
 */
import { Telegraf } from 'telegraf';
export declare function createTelegramBot(botToken: string): Telegraf;
