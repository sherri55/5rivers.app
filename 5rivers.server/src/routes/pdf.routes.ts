import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth.middleware';
import { normalizePagination, parseListOptions } from '../types';
import { generateInvoicePDF, generateListPDF, type ListColumn } from '../services/pdf.service';
import * as jobService from '../services/job.service';
import * as invoiceService from '../services/invoice.service';
import * as driverService from '../services/driver.service';
import * as dispatcherService from '../services/dispatcher.service';
import * as companyService from '../services/company.service';
import * as unitService from '../services/unit.service';
import * as jobTypeService from '../services/jobType.service';
import { query as dbQuery } from '../db/connection';

const router = Router();
router.use(requireAuth);

// ============================================
// Helpers
// ============================================

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  const s = String(d).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return String(d);
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'America/Toronto' });
}

function fmtCurrency(v: number | null | undefined): string {
  const n = Number(v ?? 0);
  return `$${n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function sendPdf(res: Response, buffer: Buffer, filename: string) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.end(buffer);
}

/** Parse list params for export — use large limit to get all filtered data. */
function exportPagination() {
  return normalizePagination({ page: 1, limit: 500 });
}

function buildSubtitle(filters: Record<string, string>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(filters)) {
    if (v) parts.push(`${k}: ${v}`);
  }
  if (parts.length === 0) return `All records · ${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}`;
  return `Filtered by ${parts.join(', ')} · ${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}`;
}

// ============================================
// Invoice PDF (full invoice with jobs + images)
// ============================================

router.get(
  '/invoices/:id/pdf',
  asyncHandler(async (req: Request, res: Response) => {
    const { buffer, filename } = await generateInvoicePDF(
      req.params.id,
      req.user!.organizationId,
    );
    sendPdf(res, buffer, filename);
  }),
);

// ============================================
// List exports — same filters as list endpoints
// ============================================

// --- Jobs ---
router.get(
  '/export/jobs',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const result = await jobService.listJobs(orgId, exportPagination(), { sortBy, order, filters });

    // We need lookup maps for driver/dispatcher/jobType names
    const driverResult = await driverService.listDrivers(orgId, normalizePagination({ limit: 500 }));
    const dispatcherResult = await dispatcherService.listDispatchers(orgId, normalizePagination({ limit: 500 }));
    const jobTypeResult = await jobTypeService.listJobTypes(orgId, normalizePagination({ limit: 500 }));
    const companyResult = await companyService.listCompanies(orgId, normalizePagination({ limit: 500 }));
    const unitResult = await unitService.listUnits(orgId, normalizePagination({ limit: 500 }));

    const driverMap = new Map(driverResult.data.map((d: any) => [d.id, d.name]));
    const dispatcherMap = new Map(dispatcherResult.data.map((d: any) => [d.id, d.name]));
    const jobTypeMap = new Map(jobTypeResult.data.map((jt: any) => [jt.id, jt]));
    const companyMap = new Map(companyResult.data.map((c: any) => [c.id, c.name]));
    const unitMap = new Map(unitResult.data.map((u: any) => [u.id, u.name]));

    const columns: ListColumn[] = [
      { label: 'Date' },
      { label: 'Job Type' },
      { label: 'Company' },
      { label: 'Driver' },
      { label: 'Dispatcher' },
      { label: 'Unit' },
      { label: 'Source' },
      { label: 'Amount', align: 'right' },
      { label: 'Paid', align: 'center' },
    ];

    const rows = result.data.map((j: any) => {
      const jt = jobTypeMap.get(j.jobTypeId) as any;
      return [
        fmtDate(j.jobDate),
        jt?.title ?? '',
        jt?.companyId ? companyMap.get(jt.companyId) ?? '' : '',
        driverMap.get(j.driverId) ?? '',
        dispatcherMap.get(j.dispatcherId) ?? '',
        unitMap.get(j.unitId) ?? '',
        j.sourceType ?? '',
        fmtCurrency(j.amount),
        j.driverPaid ? 'Yes' : 'No',
      ];
    });

    const buffer = await generateListPDF('Jobs Report', buildSubtitle(filters), columns, rows);
    sendPdf(res, buffer, 'jobs-report.pdf');
  }),
);

// --- Invoices ---
router.get(
  '/export/invoices',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const result = await invoiceService.listInvoices(orgId, exportPagination(), { sortBy, order, filters });

    const dispatcherResult = await dispatcherService.listDispatchers(orgId, normalizePagination({ limit: 500 }));
    const dispatcherMap = new Map(dispatcherResult.data.map((d: any) => [d.id, d.name]));

    const columns: ListColumn[] = [
      { label: 'Invoice #' },
      { label: 'Date' },
      { label: 'Status' },
      { label: 'Dispatcher' },
      { label: 'Billed To' },
      { label: 'Billed Email' },
    ];

    const rows = result.data.map((inv: any) => [
      inv.invoiceNumber ?? '',
      fmtDate(inv.invoiceDate),
      inv.status ?? '',
      dispatcherMap.get(inv.dispatcherId) ?? '',
      inv.billedTo ?? '',
      inv.billedEmail ?? '',
    ]);

    const buffer = await generateListPDF('Invoices Report', buildSubtitle(filters), columns, rows);
    sendPdf(res, buffer, 'invoices-report.pdf');
  }),
);

// --- Drivers ---
router.get(
  '/export/drivers',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const result = await driverService.listDrivers(orgId, exportPagination(), { sortBy, order, filters });

    const columns: ListColumn[] = [
      { label: 'Name' },
      { label: 'Email' },
      { label: 'Phone' },
      { label: 'Pay Type' },
      { label: 'Description', width: '*' },
    ];

    const rows = result.data.map((d: any) => [
      d.name ?? '',
      d.email ?? '',
      d.phone ?? '',
      d.payType ?? '',
      d.description ?? '',
    ]);

    const buffer = await generateListPDF('Drivers Report', buildSubtitle(filters), columns, rows, 'landscape');
    sendPdf(res, buffer, 'drivers-report.pdf');
  }),
);

// --- Dispatchers ---
router.get(
  '/export/dispatchers',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const result = await dispatcherService.listDispatchers(orgId, exportPagination(), { sortBy, order, filters });

    const columns: ListColumn[] = [
      { label: 'Name' },
      { label: 'Email' },
      { label: 'Phone' },
      { label: 'Commission %', align: 'right' },
      { label: 'Description', width: '*' },
    ];

    const rows = result.data.map((d: any) => [
      d.name ?? '',
      d.email ?? '',
      d.phone ?? '',
      d.commissionPercent != null ? `${d.commissionPercent}%` : '',
      d.description ?? '',
    ]);

    const buffer = await generateListPDF('Dispatchers Report', buildSubtitle(filters), columns, rows, 'landscape');
    sendPdf(res, buffer, 'dispatchers-report.pdf');
  }),
);

// --- Companies ---
router.get(
  '/export/companies',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const result = await companyService.listCompanies(orgId, exportPagination(), { sortBy, order, filters });

    const columns: ListColumn[] = [
      { label: 'Name' },
      { label: 'Industry' },
      { label: 'Email' },
      { label: 'Phone' },
      { label: 'Location' },
    ];

    const rows = result.data.map((c: any) => [
      c.name ?? '',
      c.industry ?? '',
      c.email ?? '',
      c.phone ?? '',
      c.location ?? '',
    ]);

    const buffer = await generateListPDF('Companies Report', buildSubtitle(filters), columns, rows, 'landscape');
    sendPdf(res, buffer, 'companies-report.pdf');
  }),
);

// --- Units ---
router.get(
  '/export/units',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const result = await unitService.listUnits(orgId, exportPagination(), { sortBy, order, filters });

    const columns: ListColumn[] = [
      { label: 'Name' },
      { label: 'Plate #' },
      { label: 'Status' },
      { label: 'Year' },
      { label: 'Make' },
      { label: 'Model' },
      { label: 'VIN' },
      { label: 'Color' },
    ];

    const rows = result.data.map((u: any) => [
      u.name ?? '',
      u.plateNumber ?? '',
      u.status ?? '',
      u.year != null ? String(u.year) : '',
      u.make ?? '',
      u.model ?? '',
      u.vin ?? '',
      u.color ?? '',
    ]);

    const buffer = await generateListPDF('Units Report', buildSubtitle(filters), columns, rows);
    sendPdf(res, buffer, 'units-report.pdf');
  }),
);

// --- Carriers (no dedicated service — query directly) ---
router.get(
  '/export/carriers',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const rows = await dbQuery<any[]>(
      `SELECT name, contactPerson, email, phone FROM Carriers WHERE organizationId = @orgId ORDER BY name`,
      { params: { orgId } },
    );

    const columns: ListColumn[] = [
      { label: 'Name' },
      { label: 'Contact Person' },
      { label: 'Email' },
      { label: 'Phone' },
    ];

    const data = (Array.isArray(rows) ? rows : []).map((c: any) => [
      c.name ?? '',
      c.contactPerson ?? '',
      c.email ?? '',
      c.phone ?? '',
    ]);

    const buffer = await generateListPDF('Carriers Report', `All records · ${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}`, columns, data, 'portrait');
    sendPdf(res, buffer, 'carriers-report.pdf');
  }),
);

export default router;
