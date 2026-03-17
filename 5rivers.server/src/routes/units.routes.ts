import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as unitService from '../services/unit.service';
import { normalizePagination, parseListOptions } from '../types';
import { requireAuth } from '../middleware/auth.middleware';
import { notFound, badRequest } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/units',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const pagination = normalizePagination({
      page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const result = await unitService.listUnits(orgId, pagination, { sortBy, order, filters });
    res.json(result);
  })
);

router.get(
  '/units/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const unit = await unitService.getUnitById(
      req.params.id,
      req.user!.organizationId
    );
    if (!unit) throw notFound('Unit not found');
    res.json(unit);
  })
);

router.post(
  '/units',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (!body.name) throw badRequest('name is required');
    const unit = await unitService.createUnit(
      req.user!.organizationId,
      body
    );
    res.status(201).json(unit);
  })
);

router.patch(
  '/units/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const unit = await unitService.updateUnit(
      req.user!.organizationId,
      { ...req.body, id: req.params.id }
    );
    if (!unit) throw notFound('Unit not found');
    res.json(unit);
  })
);

router.delete(
  '/units/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await unitService.deleteUnit(
      req.params.id,
      req.user!.organizationId
    );
    if (!deleted) throw notFound('Unit not found');
    res.status(204).send();
  })
);

export default router;
