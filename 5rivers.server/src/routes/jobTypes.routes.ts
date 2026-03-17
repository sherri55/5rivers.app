import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as jobTypeService from '../services/jobType.service';
import { normalizePagination, parseListOptions } from '../types';
import { requireAuth } from '../middleware/auth.middleware';
import { notFound, badRequest } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/job-types',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const companyId = typeof req.query.companyId === 'string' ? req.query.companyId : undefined;
    const pagination = normalizePagination({
      page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const result = await jobTypeService.listJobTypes(orgId, pagination, companyId, { sortBy, order, filters });
    res.json(result);
  })
);

router.get(
  '/job-types/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const jobType = await jobTypeService.getJobTypeById(req.params.id, req.user!.organizationId);
    if (!jobType) throw notFound('Job type not found');
    res.json(jobType);
  })
);

router.post(
  '/job-types',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (!body.companyId) throw badRequest('companyId is required');
    if (!body.title) throw badRequest('title is required');
    const jobType = await jobTypeService.createJobType(req.user!.organizationId, body);
    res.status(201).json(jobType);
  })
);

router.patch(
  '/job-types/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const jobType = await jobTypeService.updateJobType(req.user!.organizationId, { ...req.body, id: req.params.id });
    if (!jobType) throw notFound('Job type not found');
    res.json(jobType);
  })
);

router.delete(
  '/job-types/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await jobTypeService.deleteJobType(req.params.id, req.user!.organizationId);
    if (!deleted) throw notFound('Job type not found');
    res.status(204).send();
  })
);

export default router;
