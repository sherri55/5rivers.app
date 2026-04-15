import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth.middleware';
import { badRequest } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

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

router.post(
  '/agent/clear',
  asyncHandler(async (req: Request, res: Response) => {
    const { clearHistory } = await import('../../../5rivers.app.agent/dist/index.js');
    clearHistory('web', req.user!.userId);
    res.json({ ok: true });
  }),
);

export default router;
