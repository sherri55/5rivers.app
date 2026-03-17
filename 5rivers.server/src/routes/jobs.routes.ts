import multer from 'multer';
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as jobService from '../services/job.service';
import * as imageService from '../services/image.service';
import * as jobDriverPayService from '../services/jobDriverPay.service';
import { normalizePagination, parseListOptions } from '../types';
import { requireAuth } from '../middleware/auth.middleware';
import { notFound, badRequest } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.get(
  '/jobs',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const pagination = normalizePagination({
      page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const result = await jobService.listJobs(orgId, pagination, { sortBy, order, filters });
    res.json(result);
  })
);

router.get(
  '/jobs/:id/images',
  asyncHandler(async (req: Request, res: Response) => {
    const job = await jobService.getJobById(req.params.id, req.user!.organizationId);
    if (!job) throw notFound('Job not found');
    const list = await imageService.listImagesByJob(req.params.id, req.user!.organizationId);
    res.json(list);
  })
);

router.post(
  '/jobs/:id/images',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file || !file.buffer) throw badRequest('file is required (multipart/form-data field: file)');
    const job = await jobService.getJobById(req.params.id, req.user!.organizationId);
    if (!job) throw notFound('Job not found');
    const meta = await imageService.createImage(
      req.user!.organizationId,
      req.params.id,
      file.buffer,
      file.mimetype || 'application/octet-stream',
      file.originalname || null
    );
    res.status(201).json(meta);
  })
);

router.get(
  '/jobs/:id/images/:imageId',
  asyncHandler(async (req: Request, res: Response) => {
    const job = await jobService.getJobById(req.params.id, req.user!.organizationId);
    if (!job) throw notFound('Job not found');
    const image = await imageService.getImageById(
      req.params.imageId,
      req.params.id,
      req.user!.organizationId
    );
    if (!image) throw notFound('Image not found');
    res.setHeader('Content-Type', image.contentType);
    if (image.fileName) res.setHeader('Content-Disposition', `inline; filename="${image.fileName}"`);
    res.send(image.content);
  })
);

router.delete(
  '/jobs/:id/images/:imageId',
  asyncHandler(async (req: Request, res: Response) => {
    const job = await jobService.getJobById(req.params.id, req.user!.organizationId);
    if (!job) throw notFound('Job not found');
    const removed = await imageService.deleteImage(
      req.params.imageId,
      req.params.id,
      req.user!.organizationId
    );
    if (!removed) throw notFound('Image not found');
    res.status(204).send();
  })
);

router.get(
  '/jobs/:id/driver-pay',
  asyncHandler(async (req: Request, res: Response) => {
    const job = await jobService.getJobById(req.params.id, req.user!.organizationId);
    if (!job) throw notFound('Job not found');
    const row = await jobDriverPayService.getJobDriverPay(req.params.id, req.user!.organizationId);
    if (!row) throw notFound('Job driver pay not found');
    res.json(row);
  })
);

router.put(
  '/jobs/:id/driver-pay',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (body.driverId == null || body.amount == null) throw badRequest('driverId and amount are required');
    try {
      const row = await jobDriverPayService.setJobDriverPay(
        req.user!.organizationId,
        req.params.id,
        body.driverId,
        Number(body.amount)
      );
      res.json(row);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) throw notFound(msg);
      throw e;
    }
  })
);

router.patch(
  '/jobs/:id/driver-pay',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (body.paymentId == null) throw badRequest('paymentId is required to mark as paid');
    const job = await jobService.getJobById(req.params.id, req.user!.organizationId);
    if (!job) throw notFound('Job not found');
    const row = await jobDriverPayService.markJobDriverPayPaid(
      req.user!.organizationId,
      req.params.id,
      body.paymentId
    );
    if (!row) throw notFound('Job driver pay not found or payment invalid');
    res.json(row);
  })
);

router.delete(
  '/jobs/:id/driver-pay',
  asyncHandler(async (req: Request, res: Response) => {
    const job = await jobService.getJobById(req.params.id, req.user!.organizationId);
    if (!job) throw notFound('Job not found');
    const removed = await jobDriverPayService.clearJobDriverPay(req.params.id, req.user!.organizationId);
    if (!removed) return res.status(204).send();
    res.status(204).send();
  })
);

router.get(
  '/jobs/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const job = await jobService.getJobById(
      req.params.id,
      req.user!.organizationId
    );
    if (!job) throw notFound('Job not found');
    res.json(job);
  })
);

router.post(
  '/jobs',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (!body.jobDate || !body.jobTypeId) throw badRequest('jobDate and jobTypeId are required');
    const job = await jobService.createJob(
      req.user!.organizationId,
      body
    );
    res.status(201).json(job);
  })
);

router.patch(
  '/jobs/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const job = await jobService.updateJob(
      req.user!.organizationId,
      { ...req.body, id: req.params.id }
    );
    if (!job) throw notFound('Job not found');
    res.json(job);
  })
);

router.delete(
  '/jobs/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await jobService.deleteJob(
      req.params.id,
      req.user!.organizationId
    );
    if (!deleted) throw notFound('Job not found');
    res.status(204).send();
  })
);

export default router;
