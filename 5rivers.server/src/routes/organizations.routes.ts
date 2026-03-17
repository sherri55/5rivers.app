import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { forbidden } from '../middleware/errorHandler';
import { query } from '../db/connection';

const router = Router();

/** List all organizations (id, name, slug). Super-admin only. */
router.get('/organizations', requireAuth, async (req, res, next) => {
  if (!req.user?.isSuperAdmin) {
    next(forbidden('Super-admin only'));
    return;
  }
  try {
    const rows = await query<Array<{ id: string; name: string; slug: string }>>(
      `SELECT id, name, slug FROM Organizations ORDER BY name`
    );
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    next(e);
  }
});

export default router;
