/**
 * WhatsApp bot transport for the 5Rivers agent.
 * Uses whatsapp-web.js (free, QR code auth — no Meta Business API needed).
 *
 * Commands (prefix with !):
 *   !register <token> — link WhatsApp number to a 5Rivers JWT
 *   !clear — clear conversation history
 *   !help — list available actions
 *   Any other message → processed by the agent
 */
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import { processMessage, invalidateEntityCache } from '../llm.js';
import { getToken, setToken } from '../auth.js';
import { clearHistory } from '../conversation.js';
const PLATFORM = 'whatsapp';
export function createWhatsAppBot() {
    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
    });
    client.on('qr', (qr) => {
        console.log('\n📱 Scan this QR code with WhatsApp:');
        console.log(`QR data: ${qr}`);
        console.log('(Or install qrcode-terminal: npm i -g qrcode-terminal, then pipe the QR data)\n');
    });
    client.on('ready', () => {
        console.log('WhatsApp bot is ready!');
    });
    client.on('message', async (message) => {
        // Ignore group messages and status updates
        if (message.from.includes('@g.us') || message.from === 'status@broadcast')
            return;
        const userId = message.from.replace('@c.us', '');
        const text = message.body?.trim();
        if (!text)
            return;
        // Command handling
        if (text.startsWith('!register ')) {
            const token = text.slice('!register '.length).trim();
            if (!token) {
                await message.reply('Usage: !register <your-jwt-token>');
                return;
            }
            setToken(PLATFORM, userId, token);
            await message.reply('Token registered! You can now send me messages to manage your 5Rivers data.');
            return;
        }
        if (text === '!clear') {
            clearHistory(PLATFORM, userId);
            await message.reply('Conversation history cleared.');
            return;
        }
        if (text === '!help') {
            await message.reply(`*5Rivers Assistant*\n\n` +
                `!register <token> — Link your account\n` +
                `!clear — Clear conversation history\n` +
                `!help — Show this message\n\n` +
                `*What you can ask:*\n` +
                `• "Show today's jobs"\n` +
                `• "List drivers"\n` +
                `• "Add expense $500 truck maintenance"\n` +
                `• "Create job for tomorrow, ABC Trucking, 8am-4pm"\n` +
                `• Or paste a job entry in any format`);
            return;
        }
        // Check registration
        const token = getToken(PLATFORM, userId);
        if (!token) {
            await message.reply('You need to register first. Send:\n!register <your-jwt-token>\n\nGet your token from the 5Rivers web app.');
            return;
        }
        try {
            const response = await processMessage(PLATFORM, userId, text, token);
            if (response.toolCalls?.some((tc) => tc.name.startsWith('create_') || tc.name.startsWith('update_'))) {
                invalidateEntityCache();
            }
            await message.reply(response.text);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('401') || msg.includes('Unauthorized')) {
                await message.reply('Your session has expired. Please re-register with !register <token>');
            }
            else if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
                await message.reply("I can't reach the 5Rivers server right now. Is it running?");
            }
            else {
                await message.reply(`Something went wrong: ${msg}\n\nTry again in a moment.`);
            }
        }
    });
    return client;
}
