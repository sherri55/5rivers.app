/// <reference path="../types/express.d.ts" />
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as companyService from '../services/company.service';
import { normalizePagination, parseListOptions } from '../types';
import { requireAuth } from '../middleware/auth.middleware';
import { notFound, badRequest } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/companies',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const pagination = normalizePagination({
      page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const result = await companyService.listCompanies(orgId, pagination, { sortBy, order, filters });
    res.json(result);
  })
);

router.get(
  '/companies/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const company = await companyService.getCompanyById(
      req.params.id,
      req.user!.organizationId
    );
    if (!company) throw notFound('Company not found');
    res.json(company);
  })
);

router.post(
  '/companies',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (!body.name) throw badRequest('name is required');
    const company = await companyService.createCompany(
      req.user!.organizationId,
      body
    );
    res.status(201).json(company);
  })
);

router.patch(
  '/companies/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const company = await companyService.updateCompany(
      req.user!.organizationId,
      { ...req.body, id: req.params.id }
    );
    if (!company) throw notFound('Company not found');
    res.json(company);
  })
);

router.delete(
  '/companies/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await companyService.deleteCompany(
      req.params.id,
      req.user!.organizationId
    );
    if (!deleted) throw notFound('Company not found');
    res.status(204).send();
  })
);

export default router;
