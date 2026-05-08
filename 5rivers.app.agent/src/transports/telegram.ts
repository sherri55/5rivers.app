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
import { Telegraf, type Context } from 'telegraf';
import { processMessage, type ImageInput } from '../llm.js';
import { getToken, setToken } from '../auth.js';
import { resetConversation } from '../llm.js';

const PLATFORM = 'telegram';

export function createTelegramBot(botToken: string): Telegraf {
  const bot = new Telegraf(botToken);

  // ── /start ──────────────────────────────────────────────────────────────────
  bot.start((ctx) => {
    ctx.reply(
      `Welcome to 5Rivers Assistant! 🚛\n\n` +
      `Send me a message or photo of a ticket and I'll handle the rest.\n\n` +
      `• Text: "show today's jobs", "list drivers"\n` +
      `• Photo: snap a ticket or paystub — I'll parse and create the job\n\n` +
      `/help — more info   /clear — reset conversation`,
    );
  });

  // ── /help ────────────────────────────────────────────────────────────────────
  bot.help((ctx) => {
    ctx.reply(
      `*5Rivers Assistant — Commands*\n\n` +
      `/clear — Reset conversation history\n` +
      `/register <token> — Link a specific JWT (optional)\n` +
      `/help — Show this message\n\n` +
      `*What you can do:*\n` +
      `• Send a *photo* of a ticket → I'll extract, validate, and create the job\n` +
      `• "Show today's jobs"\n` +
      `• "List drivers"\n` +
      `• "Jobs for this week"\n` +
      `• Any free-form question about your fleet data`,
      { parse_mode: 'Markdown' },
    );
  });

  // ── /register ────────────────────────────────────────────────────────────────
  bot.command('register', (ctx) => {
    const token = ctx.message.text.split(' ').slice(1).join(' ').trim();
    if (!token) {
      ctx.reply('Usage: /register <your-jwt-token>');
      return;
    }
    setToken(PLATFORM, String(ctx.from.id), token);
    ctx.reply('✅ Token registered. You\'re all set!');
  });

  // ── /clear ───────────────────────────────────────────────────────────────────
  bot.command('clear', (ctx) => {
    resetConversation(PLATFORM, String(ctx.from.id));
    ctx.reply('🗑️ Conversation cleared.');
  });

  // ── Text messages ────────────────────────────────────────────────────────────
  bot.on('text', async (ctx) => {
    await handleMessage(ctx, ctx.message.text, []);
  });

  // ── Photo messages ───────────────────────────────────────────────────────────
  bot.on('photo', async (ctx) => {
    // Telegram provides multiple resolutions — take the largest (last in array)
    const photos = ctx.message.photo;
    const largest = photos[photos.length - 1];

    let images: ImageInput[] = [];
    try {
      await ctx.sendChatAction('upload_photo');
      const fileLink = await ctx.telegram.getFileLink(largest.file_id);
      const res = await fetch(fileLink.href);
      if (!res.ok) throw new Error(`Failed to download photo: ${res.status}`);
      const arrayBuf = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuf).toString('base64');
      images = [{ data: base64, mimeType: 'image/jpeg' }];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.reply(`⚠️ Could not download the photo: ${msg}`);
      return;
    }

    // Caption (if any) is treated as the accompanying text message
    const caption = ctx.message.caption ?? '';
    await handleMessage(ctx, caption, images);
  });

  // ── Document messages (PDF, high-res photos sent as files) ──────────────────
  bot.on('document', async (ctx) => {
    const doc = ctx.message.document;
    const mime = doc.mime_type ?? '';

    if (!mime.startsWith('image/') && mime !== 'application/pdf') {
      await ctx.reply('I can only process image files and PDFs. Please send a photo or image file.');
      return;
    }

    let images: ImageInput[] = [];
    try {
      await ctx.sendChatAction('upload_document');
      const fileLink = await ctx.telegram.getFileLink(doc.file_id);
      const res = await fetch(fileLink.href);
      if (!res.ok) throw new Error(`Failed to download file: ${res.status}`);
      const arrayBuf = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuf).toString('base64');
      images = [{ data: base64, mimeType: mime.startsWith('image/') ? mime : 'image/jpeg' }];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.reply(`⚠️ Could not download the file: ${msg}`);
      return;
    }

    const caption = ctx.message.caption ?? '';
    await handleMessage(ctx, caption, images);
  });

  // ── Shared handler ───────────────────────────────────────────────────────────
  async function handleMessage(ctx: Context, userMessage: string, images: ImageInput[]) {
    const userId = String(ctx.from?.id ?? 'unknown');
    // Per-user token takes precedence; falls back to auto-token (email/password env)
    const token = getToken(PLATFORM, userId) ?? undefined;

    try {
      await ctx.sendChatAction('typing');
      const response = await processMessage(PLATFORM, userId, userMessage, token, images);
      await sendLong(ctx, response.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[telegram] error for user ${userId}:`, msg);
      if (msg.includes('401') || msg.includes('Unauthorized')) {
        await ctx.reply('🔒 Session expired. Use /register <token> to re-link your account.');
      } else if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
        await ctx.reply("⚠️ Can't reach the 5Rivers server. Is it running?");
      } else {
        await ctx.reply(`Something went wrong: ${msg}`);
      }
    }
  }

  return bot;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Send a message, splitting at newlines if it exceeds Telegram's 4096-char limit. */
async function sendLong(ctx: Context, text: string): Promise<void> {
  const MAX = 4096;
  if (text.length <= MAX) {
    await ctx.reply(text);
    return;
  }
  const chunks = splitMessage(text, MAX);
  for (const chunk of chunks) {
    await ctx.reply(chunk);
  }
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
