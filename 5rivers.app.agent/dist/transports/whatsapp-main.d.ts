#!/usr/bin/env node
/**
 * WhatsApp bot entry point.
 * Usage: FIVE_RIVERS_TOKEN=<jwt> node dist/transports/whatsapp-main.js
 *
 * On first run, scan the QR code with your WhatsApp phone.
 * Subsequent runs will use the saved session.
 */
import 'dotenv/config';
