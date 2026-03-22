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
import { processMessage, invalidateEntityCache } from '../llm.js';
import { getToken, setToken, hasToken } from '../auth.js';
import { clearHistory } from '../conversation.js';

const PLATFORM = 'telegram';

export function createTelegramBot(botToken: string): Telegraf {
  const bot = new Telegraf(botToken);

  bot.start((ctx) => {
    const registered = hasToken(PLATFORM, String(ctx.from.id));
    ctx.reply(
      `Welcome to 5Rivers Assistant! 🚛\n\n` +
      (registered
        ? `You're registered and ready to go. Send me a message like "show today's jobs" or a job entry.`
        : `To get started, register your API token:\n/register <your-jwt-token>\n\nGet your token from the 5Rivers web app settings.`),
    );
  });

  bot.help((ctx) => {
    ctx.reply(
      `*5Rivers Assistant — Commands*\n\n` +
      `/register <token> — Link your account\n` +
      `/clear — Clear conversation history\n` +
      `/help — Show this message\n\n` +
      `*What you can ask:*\n` +
      `• "Show today's jobs"\n` +
      `• "List drivers"\n` +
      `• "Add expense $500 truck maintenance"\n` +
      `• "Create job for tomorrow, ABC Trucking, 8am-4pm"\n` +
      `• Or paste a job entry in any format\n\n` +
      `I'll parse your message, confirm details, and create the records for you.`,
      { parse_mode: 'Markdown' },
    );
  });

  bot.command('register', (ctx) => {
    const token = ctx.message.text.split(' ').slice(1).join(' ').trim();
    if (!token) {
      ctx.reply('Usage: /register <your-jwt-token>');
      return;
    }
    setToken(PLATFORM, String(ctx.from.id), token);
    ctx.reply('Token registered successfully! You can now send me messages to manage your 5Rivers data.');
  });

  bot.command('clear', (ctx) => {
    clearHistory(PLATFORM, String(ctx.from.id));
    ctx.reply('Conversation history cleared.');
  });

  // Handle all text messages
  bot.on('text', async (ctx) => {
    const userId = String(ctx.from.id);
    const token = getToken(PLATFORM, userId);

    if (!token) {
      ctx.reply(
        'You need to register first. Use:\n/register <your-jwt-token>\n\nGet your token from the 5Rivers web app.',
      );
      return;
    }

    const userMessage = ctx.message.text;

    try {
      // Show typing indicator
      await ctx.sendChatAction('typing');

      const response = await processMessage(PLATFORM, userId, userMessage, token);

      // Invalidate entity cache if any write tools were called
      if (response.toolCalls?.some((tc) => tc.name.startsWith('create_') || tc.name.startsWith('update_'))) {
        invalidateEntityCache();
      }

      // Split long messages (Telegram limit is 4096 chars)
      const text = response.text;
      if (text.length <= 4096) {
        await ctx.reply(text);
      } else {
        const chunks = splitMessage(text, 4096);
        for (const chunk of chunks) {
          await ctx.reply(chunk);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.includes('Unauthorized')) {
        await ctx.reply('Your session has expired. Please re-register with /register <token>');
      } else if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
        await ctx.reply("I can't reach the 5Rivers server right now. Is it running?");
      } else {
        await ctx.reply(`Something went wrong: ${msg}\n\nTry again in a moment.`);
      }
    }
  });

  return bot;
}

function splitMessage(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let splitAt = remaining.lastIndexOf('\n', maxLen);
    if (splitAt === -1 || splitAt < maxLen / 2) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
