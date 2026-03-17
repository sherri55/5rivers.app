import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as dispatcherService from '../services/dispatcher.service';
import { normalizePagination, parseListOptions } from '../types';
import { requireAuth } from '../middleware/auth.middleware';
import { notFound, badRequest } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/dispatchers',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const pagination = normalizePagination({
      page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const result = await dispatcherService.listDispatchers(orgId, pagination, { sortBy, order, filters });
    res.json(result);
  })
);

router.get(
  '/dispatchers/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const company = await dispatcherService.getDispatcherById(
      req.params.id,
      req.user!.organizationId
    );
    if (!company) throw notFound('Dispatcher not found');
    res.json(company);
  })
);

router.post(
  '/dispatchers',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (!body.name) throw badRequest('name is required');
    const company = await dispatcherService.createDispatcher(
      req.user!.organizationId,
      body
    );
    res.status(201).json(company);
  })
);

router.patch(
  '/dispatchers/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const company = await dispatcherService.updateDispatcher(
      req.user!.organizationId,
      { ...req.body, id: req.params.id }
    );
    if (!company) throw notFound('Dispatcher not found');
    res.json(company);
  })
);

router.delete(
  '/dispatchers/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await dispatcherService.deleteDispatcher(
      req.params.id,
      req.user!.organizationId
    );
    if (!deleted) throw notFound('Dispatcher not found');
    res.status(204).send();
  })
);

export default router;
