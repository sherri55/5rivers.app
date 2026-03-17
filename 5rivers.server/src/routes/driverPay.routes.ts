import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as driverPayService from '../services/driverPay.service';
import { requireAuth } from '../middleware/auth.middleware';

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

export default router;
