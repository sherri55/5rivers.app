import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as invoiceService from '../services/invoice.service';
import * as jobInvoiceService from '../services/jobInvoice.service';
import { normalizePagination, parseListOptions } from '../types';
import { requireAuth } from '../middleware/auth.middleware';
import { notFound, badRequest } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/invoices',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const pagination = normalizePagination({
      page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const result = await invoiceService.listInvoices(orgId, pagination, { sortBy, order, filters });
    res.json(result);
  })
);

router.get(
  '/invoices/:id/jobs',
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await invoiceService.getInvoiceById(req.params.id, req.user!.organizationId);
    if (!invoice) throw notFound('Invoice not found');
    const lines = await jobInvoiceService.listJobsOnInvoice(req.params.id, req.user!.organizationId);
    res.json(lines);
  })
);

router.post(
  '/invoices/:id/jobs',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (body.jobId == null || body.amount == null) throw badRequest('jobId and amount are required');
    const invoice = await invoiceService.getInvoiceById(req.params.id, req.user!.organizationId);
    if (!invoice) throw notFound('Invoice not found');
    try {
      const line = await jobInvoiceService.addJobToInvoice(
        req.user!.organizationId,
        req.params.id,
        body.jobId,
        Number(body.amount)
      );
      res.status(201).json(line);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) throw notFound(msg);
      if (msg.includes('already on')) throw badRequest(msg);
      throw e;
    }
  })
);

router.patch(
  '/invoices/:id/jobs/:jobId',
  asyncHandler(async (req: Request, res: Response) => {
    const amount = req.body?.amount;
    if (amount == null || Number.isNaN(Number(amount))) throw badRequest('amount (number) is required');
    const invoice = await invoiceService.getInvoiceById(req.params.id, req.user!.organizationId);
    if (!invoice) throw notFound('Invoice not found');
    const line = await jobInvoiceService.updateJobInvoiceAmount(
      req.user!.organizationId,
      req.params.id,
      req.params.jobId,
      Number(amount)
    );
    if (!line) throw notFound('Job not found on this invoice');
    res.json(line);
  })
);

router.delete(
  '/invoices/:id/jobs/:jobId',
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await invoiceService.getInvoiceById(req.params.id, req.user!.organizationId);
    if (!invoice) throw notFound('Invoice not found');
    const removed = await jobInvoiceService.removeJobFromInvoice(
      req.user!.organizationId,
      req.params.id,
      req.params.jobId
    );
    if (!removed) throw notFound('Job not found on this invoice');
    res.status(204).send();
  })
);

router.get(
  '/invoices/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await invoiceService.getInvoiceById(
      req.params.id,
      req.user!.organizationId
    );
    if (!invoice) throw notFound('Invoice not found');
    res.json(invoice);
  })
);

router.post(
  '/invoices',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (!body.invoiceNumber || !body.invoiceDate || !body.dispatcherId) throw badRequest('invoiceNumber, invoiceDate and dispatcherId are required');
    const invoice = await invoiceService.createInvoice(
      req.user!.organizationId,
      body
    );
    res.status(201).json(invoice);
  })
);

router.patch(
  '/invoices/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await invoiceService.updateInvoice(
      req.user!.organizationId,
      { ...req.body, id: req.params.id }
    );
    if (!invoice) throw notFound('Invoice not found');
    res.json(invoice);
  })
);

router.delete(
  '/invoices/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await invoiceService.deleteInvoice(
      req.params.id,
      req.user!.organizationId
    );
    if (!deleted) throw notFound('Invoice not found');
    res.status(204).send();
  })
);

export default router;
