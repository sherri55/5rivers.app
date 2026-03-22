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
declare const Client: typeof pkg.Client;
export declare function createWhatsAppBot(): InstanceType<typeof Client>;
export {};
