import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as driverPayService from '../services/driverPay.service';
import { requireAuth } from '../middleware/auth.middleware';
import { badRequest } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/driver-pay',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const drivers = await driverPayService.listDriverPaySummaries(orgId);
    res.json({ drivers });
  })
);

router.post(
  '/driver-pay/mark-jobs-paid',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (!body.driverId || !Array.isArray(body.jobIds) || !body.jobIds.length || body.amount == null || !body.paidAt) {
      throw badRequest('driverId, jobIds, amount and paidAt are required');
    }
    const result = await driverPayService.markJobsAsPaid(req.user!.organizationId, {
      driverId: String(body.driverId),
      jobIds: body.jobIds.map(String),
      amount: Number(body.amount),
      paidAt: String(body.paidAt),
      paymentMethod: body.paymentMethod,
      reference: body.reference ?? null,
      notes: body.notes ?? null,
    });
    res.status(201).json(result);
  })
);

export default router;
