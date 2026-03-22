/// <reference path="../types/express.d.ts" />
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as service from '../services/expenseCategory.service';
import { normalizePagination, parseListOptions } from '../types';
import { requireAuth } from '../middleware/auth.middleware';
import { notFound, badRequest } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/expense-categories',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const pagination = normalizePagination({
      page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const result = await service.listExpenseCategories(orgId, pagination, { sortBy, order, filters });
    res.json(result);
  })
);

router.get(
  '/expense-categories/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const category = await service.getExpenseCategoryById(
      req.params.id,
      req.user!.organizationId
    );
    if (!category) throw notFound('Expense category not found');
    res.json(category);
  })
);

router.post(
  '/expense-categories',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (!body.name) throw badRequest('name is required');
    const category = await service.createExpenseCategory(
      req.user!.organizationId,
      body
    );
    res.status(201).json(category);
  })
);

router.patch(
  '/expense-categories/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const category = await service.updateExpenseCategory(
      req.user!.organizationId,
      { ...req.body, id: req.params.id }
    );
    if (!category) throw notFound('Expense category not found');
    res.json(category);
  })
);

router.delete(
  '/expense-categories/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await service.deleteExpenseCategory(
      req.params.id,
      req.user!.organizationId
    );
    if (!deleted) throw notFound('Expense category not found');
    res.status(204).send();
  })
);

export default router;
