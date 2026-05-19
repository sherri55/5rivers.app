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

/** Get current organization (name, slug, settings). */
router.get('/organization/me', requireAuth, async (req, res, next) => {
  try {
    const rows = await query<Array<{ id: string; name: string; slug: string; settings: string | null }>>(
      `SELECT id, name, slug, settings FROM Organizations WHERE id = @id`,
      { params: { id: req.user!.organizationId } }
    );
    if (!rows?.length) { res.status(404).json({ message: 'Organization not found' }); return; }
    const org = rows[0];
    res.json({ ...org, settings: org.settings ? JSON.parse(org.settings) : null });
  } catch (e) {
    next(e);
  }
});

/** Update current organization settings. OWNER/ADMIN only. */
router.patch('/organization/me', requireAuth, async (req, res, next) => {
  const role = req.user?.role;
  if (role !== 'OWNER' && role !== 'ADMIN') {
    next(forbidden('OWNER or ADMIN required'));
    return;
  }
  try {
    const orgId = req.user!.organizationId;
    // Fetch existing settings first so we do a deep merge
    const existing = await query<Array<{ settings: string | null }>>(
      `SELECT settings FROM Organizations WHERE id = @id`,
      { params: { id: orgId } }
    );
    const current = existing?.[0]?.settings ? JSON.parse(existing[0].settings) : {};
    const merged = { ...current, ...req.body };
    await query(
      `UPDATE Organizations SET settings = @settings, updatedAt = GETUTCDATE() WHERE id = @id`,
      { params: { id: orgId, settings: JSON.stringify(merged) } }
    );
    res.json(merged);
  } catch (e) {
    next(e);
  }
});

export default router;
