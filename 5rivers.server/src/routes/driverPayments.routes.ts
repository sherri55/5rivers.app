import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as driverPaymentService from '../services/driverPayment.service';
import { normalizePagination } from '../types';
import { requireAuth } from '../middleware/auth.middleware';
import { notFound, badRequest } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/driver-payments',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const driverId = typeof req.query.driverId === 'string' ? req.query.driverId : undefined;
    const pagination = normalizePagination({
      page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const result = await driverPaymentService.listDriverPayments(orgId, pagination, driverId);
    res.json(result);
  })
);

router.get(
  '/driver-payments/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const payment = await driverPaymentService.getDriverPaymentById(
      req.params.id,
      req.user!.organizationId
    );
    if (!payment) throw notFound('Driver payment not found');
    res.json(payment);
  })
);

router.post(
  '/driver-payments',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (body.driverId == null || body.amount == null || body.paidAt == null) {
      throw badRequest('driverId, amount and paidAt are required');
    }
    const payment = await driverPaymentService.createDriverPayment(
      req.user!.organizationId,
      {
        driverId: body.driverId,
        amount: Number(body.amount),
        paidAt: String(body.paidAt).slice(0, 10),
        paymentMethod: body.paymentMethod ?? 'OTHER',
        reference: body.reference ?? null,
        notes: body.notes ?? null,
      }
    );
    res.status(201).json(payment);
  })
);

router.patch(
  '/driver-payments/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const payment = await driverPaymentService.updateDriverPayment(
      req.params.id,
      req.user!.organizationId,
      {
        amount: body.amount != null ? Number(body.amount) : undefined,
        paidAt: body.paidAt != null ? String(body.paidAt).slice(0, 10) : undefined,
        paymentMethod: body.paymentMethod,
        reference: body.reference !== undefined ? body.reference : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      }
    );
    if (!payment) throw notFound('Driver payment not found');
    res.json(payment);
  })
);

router.delete(
  '/driver-payments/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await driverPaymentService.deleteDriverPayment(
      req.params.id,
      req.user!.organizationId
    );
    if (!deleted) throw notFound('Driver payment not found');
    res.status(204).send();
  })
);

export default router;
