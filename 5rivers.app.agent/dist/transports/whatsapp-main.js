#!/usr/bin/env node
/**
 * WhatsApp bot entry point.
 * Usage: FIVE_RIVERS_TOKEN=<jwt> node dist/transports/whatsapp-main.js
 *
 * On first run, scan the QR code with your WhatsApp phone.
 * Subsequent runs will use the saved session.
 */
import 'dotenv/config';
import { loadAuthMap } from '../auth.js';
import { createWhatsAppBot } from './whatsapp.js';
loadAuthMap();
const client = createWhatsAppBot();
console.log('Starting WhatsApp bot...');
console.log(`  Ollama: ${process.env.OLLAMA_HOST ?? 'http://localhost:11434'}`);
console.log(`  Model:  ${process.env.OLLAMA_MODEL ?? 'llama3.1'}`);
console.log(`  API:    ${process.env.FIVE_RIVERS_API_URL ?? 'http://localhost:4000/api'}`);
client.initialize();
