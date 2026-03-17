import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as driverService from '../services/driver.service';
import { normalizePagination, parseListOptions } from '../types';
import { requireAuth } from '../middleware/auth.middleware';
import { notFound, badRequest } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/drivers',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const pagination = normalizePagination({
      page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const result = await driverService.listDrivers(orgId, pagination, { sortBy, order, filters });
    res.json(result);
  })
);

router.get(
  '/drivers/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const driver = await driverService.getDriverById(
      req.params.id,
      req.user!.organizationId
    );
    if (!driver) throw notFound('Driver not found');
    res.json(driver);
  })
);

router.post(
  '/drivers',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (!body.name) throw badRequest('name is required');
    const driver = await driverService.createDriver(
      req.user!.organizationId,
      body
    );
    res.status(201).json(driver);
  })
);

router.patch(
  '/drivers/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const driver = await driverService.updateDriver(
      req.user!.organizationId,
      { ...req.body, id: req.params.id }
    );
    if (!driver) throw notFound('Driver not found');
    res.json(driver);
  })
);

router.delete(
  '/drivers/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await driverService.deleteDriver(
      req.params.id,
      req.user!.organizationId
    );
    if (!deleted) throw notFound('Driver not found');
    res.status(204).send();
  })
);

export default router;
