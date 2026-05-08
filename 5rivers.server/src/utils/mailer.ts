/**
 * Email transport wrapper.
 *
 * Reads SMTP config from env vars and exposes a single `sendMail()` function.
 * If SMTP_HOST is not configured, the function logs a warning and returns
 * `{ skipped: true }` instead of throwing — callers don't need to special-case
 * "email not configured".
 *
 * Required env vars (all-or-nothing — set them all to enable email):
 *   SMTP_HOST       — e.g. smtp.gmail.com
 *   SMTP_PORT       — e.g. 587 (TLS) or 465 (SSL)
 *   SMTP_USER       — login (often the from-address)
 *   SMTP_PASSWORD   — login password / app password
 *   SMTP_FROM       — default From: header, e.g. "5Rivers <info@…>"
 *   SMTP_SECURE     — optional: "true" to force SSL (port 465)
 */

import nodemailer, { type Transporter } from 'nodemailer';

let cachedTransporter: Transporter | null = null;

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
}

function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM ?? user;
  const secure = (process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true' || port === 465;

  if (!host || !user || !pass || !from) return null;
  return { host, port, user, pass, from, secure };
}

export function isEmailConfigured(): boolean {
  return readSmtpConfig() !== null;
}

function getTransporter(cfg: SmtpConfig): Transporter {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  return cachedTransporter;
}

export interface SendMailInput {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface SendMailResult {
  skipped?: boolean;
  messageId?: string;
  error?: string;
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const cfg = readSmtpConfig();
  if (!cfg) {
    console.warn('[mailer] SMTP not configured — set SMTP_HOST/PORT/USER/PASSWORD/FROM in .env to enable email. Skipping send.');
    return { skipped: true };
  }
  try {
    const transporter = getTransporter(cfg);
    const info = await transporter.sendMail({
      from: cfg.from,
      to: Array.isArray(input.to) ? input.to.join(', ') : input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
    });
    console.log(`[mailer] sent → ${input.to} (id=${info.messageId})`);
    return { messageId: info.messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[mailer] send failed: ${msg}`);
    return { error: msg };
  }
}
