import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as analytics from '../services/analytics.service';

const router = Router();

// GET /analytics/dashboard — aggregated dashboard stats
router.get('/analytics/dashboard', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const stats = await analytics.getDashboardStats(orgId);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /analytics/revenue/daily?days=30 — revenue by day
router.get('/analytics/revenue/daily', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const days = parseInt(req.query.days as string) || 30;
    const data = await analytics.getRevenueByDay(orgId, days);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /analytics/revenue/monthly?months=12 — monthly revenue trend
router.get('/analytics/revenue/monthly', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const months = parseInt(req.query.months as string) || 12;
    const data = await analytics.getMonthlyRevenue(orgId, months);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /analytics/revenue/by-company?startDate=&endDate= — revenue by company
router.get('/analytics/revenue/by-company', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const { startDate, endDate } = req.query;
    const data = await analytics.getRevenueByCompany(orgId, startDate as string, endDate as string);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /analytics/revenue/by-driver?startDate=&endDate= — revenue by driver
router.get('/analytics/revenue/by-driver', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const { startDate, endDate } = req.query;
    const data = await analytics.getRevenueByDriver(orgId, startDate as string, endDate as string);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /analytics/revenue/by-dispatcher?startDate=&endDate= — revenue by dispatcher
router.get('/analytics/revenue/by-dispatcher', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const { startDate, endDate } = req.query;
    const data = await analytics.getRevenueByDispatcher(orgId, startDate as string, endDate as string);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /analytics/source-breakdown?startDate=&endDate= — dispatched vs direct
router.get('/analytics/source-breakdown', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const { startDate, endDate } = req.query;
    const data = await analytics.getSourceTypeBreakdown(orgId, startDate as string, endDate as string);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /analytics/payment-status?startDate=&endDate= — paid vs unpaid
router.get('/analytics/payment-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const { startDate, endDate } = req.query;
    const data = await analytics.getPaymentStatus(orgId, startDate as string, endDate as string);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /analytics/top-job-types?startDate=&endDate=&limit=10 — top job types
router.get('/analytics/top-job-types', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const { startDate, endDate } = req.query;
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await analytics.getTopJobTypes(orgId, startDate as string, endDate as string, limit);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
