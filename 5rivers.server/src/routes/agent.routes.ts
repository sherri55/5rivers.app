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
    const { message } = req.body ?? {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw badRequest('message is required');
    }

    // Dynamic import to avoid hard dependency on the agent package
    const { processMessage, invalidateEntityCache } = await import(
      '../../../../5rivers.app.agent/dist/index.js'
    );

    const token = req.headers.authorization?.slice(7)?.trim();
    if (!token) throw badRequest('Missing auth token');

    const userId = req.user!.id;
    const response = await processMessage('web', userId, message.trim(), token);

    // Invalidate entity cache on writes
    if (response.toolCalls?.some((tc: { name: string }) => tc.name.startsWith('create_') || tc.name.startsWith('update_'))) {
      invalidateEntityCache();
    }

    res.json({
      reply: response.text,
      toolCalls: response.toolCalls,
    });
  }),
);

export default router;
