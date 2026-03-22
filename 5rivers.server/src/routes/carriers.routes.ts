import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as carrierService from '../services/carrier.service';
import { normalizePagination, parseListOptions } from '../types';
import { requireAuth } from '../middleware/auth.middleware';
import { notFound, badRequest } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/carriers',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const pagination = normalizePagination({
      page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const result = await carrierService.listCarriers(orgId, pagination, { sortBy, order, filters });
    res.json(result);
  })
);

router.get(
  '/carriers/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const carrier = await carrierService.getCarrierById(req.params.id, req.user!.organizationId);
    if (!carrier) throw notFound('Carrier not found');
    res.json(carrier);
  })
);

router.post(
  '/carriers',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (!body.name) throw badRequest('name is required');
    const carrier = await carrierService.createCarrier(req.user!.organizationId, body);
    res.status(201).json(carrier);
  })
);

router.patch(
  '/carriers/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const carrier = await carrierService.updateCarrier(
      req.user!.organizationId,
      { ...req.body, id: req.params.id }
    );
    if (!carrier) throw notFound('Carrier not found');
    res.json(carrier);
  })
);

router.delete(
  '/carriers/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await carrierService.deleteCarrier(req.params.id, req.user!.organizationId);
    if (!deleted) throw notFound('Carrier not found');
    res.status(204).send();
  })
);

export default router;
