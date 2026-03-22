/// <reference path="../types/express.d.ts" />
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as service from '../services/expense.service';
import { normalizePagination, parseListOptions } from '../types';
import { requireAuth } from '../middleware/auth.middleware';
import { notFound, badRequest } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/expenses',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const pagination = normalizePagination({
      page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const result = await service.listExpenses(orgId, pagination, { sortBy, order, filters });
    res.json(result);
  })
);

router.get(
  '/expenses/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const expense = await service.getExpenseById(
      req.params.id,
      req.user!.organizationId
    );
    if (!expense) throw notFound('Expense not found');
    res.json(expense);
  })
);

router.post(
  '/expenses',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (!body.description) throw badRequest('description is required');
    if (body.amount == null) throw badRequest('amount is required');
    if (!body.expenseDate) throw badRequest('expenseDate is required');
    const expense = await service.createExpense(
      req.user!.organizationId,
      body
    );
    res.status(201).json(expense);
  })
);

router.patch(
  '/expenses/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const expense = await service.updateExpense(
      req.user!.organizationId,
      { ...req.body, id: req.params.id }
    );
    if (!expense) throw notFound('Expense not found');
    res.json(expense);
  })
);

router.delete(
  '/expenses/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await service.deleteExpense(
      req.params.id,
      req.user!.organizationId
    );
    if (!deleted) throw notFound('Expense not found');
    res.status(204).send();
  })
);

export default router;
