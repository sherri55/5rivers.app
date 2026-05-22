import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth.middleware';
import { badRequest } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

/** Delay helper for fake-streaming the final text. */
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * POST /api/agent/chat
 * Body: { message: string }
 * Response: { reply: string, toolCalls?: Array<{ name, args, result }> }
 *
 * Passes the user's JWT to the agent so it operates with their org context.
 */
router.post(
  '/agent/chat',
  asyncHandler(async (req: Request, res: Response) => {
    const { message, images } = req.body ?? {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw badRequest('message is required');
    }

    // Dynamic import to avoid hard dependency on the agent package
    const { processMessage } = await import(
      '../../../5rivers.app.agent/dist/index.js'
    );

    const token = req.headers.authorization?.slice(7)?.trim();
    if (!token) throw badRequest('Missing auth token');

    const userId = req.user!.userId;
    const response = await processMessage('web', userId, message.trim(), token, images);

    res.json({
      reply: response.text,
      toolCalls: response.toolCalls,
    });
  }),
);

/**
 * POST /api/agent/chat-stream
 * Body: { message: string, images?: Array<{ data, mimeType }> }
 *
 * Server-Sent Events stream. Events (newline-delimited JSON after "data: "):
 *   { type: "tool",  name: string }          — agent is executing a tool
 *   { type: "token", text: string }           — chunk of the final reply
 *   { type: "done",  toolCalls?: [...] }      — all done
 *   { type: "error", message: string }        — something went wrong
 */
router.post(
  '/agent/chat-stream',
  asyncHandler(async (req: Request, res: Response) => {
    const { message, images } = req.body ?? {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw badRequest('message is required');
    }

    const token = req.headers.authorization?.slice(7)?.trim();
    if (!token) throw badRequest('Missing auth token');

    // ── SSE headers ──────────────────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if behind proxy
    res.flushHeaders();

    const send = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // ── Run agent, emit tool events in real-time ──────────────────────────────
    const { processMessage } = await import(
      '../../../5rivers.app.agent/dist/index.js'
    );

    let agentResponse: Awaited<ReturnType<typeof processMessage>>;
    try {
      agentResponse = await processMessage(
        'web',
        req.user!.userId,
        message.trim(),
        token,
        images,
        (event) => send(event), // forward tool events to the client in real-time
      );
    } catch (err) {
      send({ type: 'error', message: err instanceof Error ? err.message : String(err) });
      res.end();
      return;
    }

    // ── Stream the final text in small chunks ─────────────────────────────────
    // Split on word boundaries so chunks always end at a natural break point.
    const text   = agentResponse.text ?? '';
    const CHUNK  = 20; // characters per SSE event
    const DELAY  = 12; // ms between events

    for (let i = 0; i < text.length; i += CHUNK) {
      send({ type: 'token', text: text.slice(i, i + CHUNK) });
      if (i + CHUNK < text.length) await delay(DELAY);
    }

    // ── Final event ───────────────────────────────────────────────────────────
    send({ type: 'done', toolCalls: agentResponse.toolCalls });
    res.end();
  }),
);

router.post(
  '/agent/clear',
  asyncHandler(async (req: Request, res: Response) => {
    const { resetConversation } = await import('../../../5rivers.app.agent/dist/index.js');
    resetConversation('web', req.user!.userId);
    res.json({ ok: true });
  }),
);

export default router;
