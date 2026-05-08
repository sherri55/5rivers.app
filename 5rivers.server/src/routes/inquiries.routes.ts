/// <reference path="../types/express.d.ts" />
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as inquiryService from '../services/inquiry.service';
import { normalizePagination } from '../types';
import { requireAuth } from '../middleware/auth.middleware';
import { badRequest, notFound } from '../middleware/errorHandler';
import { sendMail } from '../utils/mailer';

const router = Router();

// ─── PUBLIC: contact form submission ────────────────────────────────────────
//
// No auth required — this is the endpoint the public homepage posts to. Rate
// limiting / spam prevention is intentionally minimal here; revisit if
// abuse becomes an issue.
router.post(
  '/inquiries',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (!body.fullName || typeof body.fullName !== 'string' || !body.fullName.trim()) {
      throw badRequest('fullName is required');
    }
    if (!body.email || typeof body.email !== 'string' || !body.email.trim()) {
      throw badRequest('email is required');
    }
    if (!body.serviceType || typeof body.serviceType !== 'string') {
      throw badRequest('serviceType is required');
    }

    const inquiry = await inquiryService.createInquiry({
      fullName: body.fullName.trim(),
      email: body.email.trim(),
      phone: body.phone?.toString().trim() || null,
      serviceType: body.serviceType.trim(),
      projectDetails: body.projectDetails?.toString().trim() || null,
      userAgent: req.get('user-agent') ?? null,
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null,
    });

    // Fire-and-forget notification email — don't block the response on SMTP.
    const inquiriesEmail = process.env.INQUIRIES_NOTIFY_EMAIL ?? 'info@5riverstruckinginc.ca';
    void sendMail({
      to: inquiriesEmail,
      replyTo: inquiry.email,
      subject: `New website inquiry from ${inquiry.fullName} — ${inquiry.serviceType}`,
      text:
`A new inquiry has been submitted via the public homepage.

Name:     ${inquiry.fullName}
Email:    ${inquiry.email}
Phone:    ${inquiry.phone ?? '(not provided)'}
Service:  ${inquiry.serviceType}

Project details:
${inquiry.projectDetails ?? '(none)'}

Submitted at: ${inquiry.createdAt.toISOString()}
Inquiry ID:   ${inquiry.id}
`,
    });

    res.status(201).json({
      id: inquiry.id,
      message: 'Thanks — we received your inquiry and will be in touch shortly.',
    });
  }),
);

// ─── AUTH-PROTECTED admin endpoints ─────────────────────────────────────────
//
// Mounted on the same router but gated by requireAuth. Used by the dashboard
// to triage incoming leads.
const protectedRouter = Router();
protectedRouter.use(requireAuth);

protectedRouter.get(
  '/inquiries',
  asyncHandler(async (req: Request, res: Response) => {
    const pagination = normalizePagination({
      page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const status = typeof req.query.status === 'string'
      ? (req.query.status as inquiryService.InquiryStatus)
      : undefined;
    const result = await inquiryService.listInquiries(pagination, {
      sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined,
      order: req.query.order === 'asc' ? 'asc' : 'desc',
      status,
    });
    res.json(result);
  }),
);

protectedRouter.patch(
  '/inquiries/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await inquiryService.updateInquiry({
      id: req.params.id,
      status: req.body?.status,
      notes: req.body?.notes,
    });
    if (!updated) throw notFound('Inquiry not found');
    res.json(updated);
  }),
);

router.use(protectedRouter);

export default router;
