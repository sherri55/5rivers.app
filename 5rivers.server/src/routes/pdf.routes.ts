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
import { query as dbQuery } from '../db/connection';

const router = Router();
router.use(requireAuth);

// ============================================
// Helpers
// ============================================

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Format a SQL DATE value for list-PDF display.
 * Reads UTC parts directly — no Intl/locale dependency, no timezone shift.
 */
function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  try {
    const dt = d instanceof Date ? d : new Date(String(d));
    if (isNaN(dt.getTime())) return String(d);
    return `${MONTHS_SHORT[dt.getUTCMonth()]} ${String(dt.getUTCDate()).padStart(2, '0')}, ${dt.getUTCFullYear()}`;
  } catch {
    return String(d);
  }
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

/**
 * Filter columns + rows to only the keys the client requested.
 * @param allCols   Full column metadata array
 * @param allRows   Full data rows (each row aligned with allCols)
 * @param selected  Comma-separated key string from ?columns=…, or undefined/empty for all
 * @param colKeys   Parallel array of string keys identifying each column position
 */
function filterColumns(
  allCols: ListColumn[],
  allRows: string[][],
  selected: string | undefined,
  colKeys: string[],
): { columns: ListColumn[]; rows: string[][] } {
  if (!selected) return { columns: allCols, rows: allRows };
  const keep = new Set(selected.split(',').map(s => s.trim()).filter(Boolean));
  if (keep.size === 0) return { columns: allCols, rows: allRows };
  const idx = colKeys.reduce<number[]>((acc, k, i) => { if (keep.has(k)) acc.push(i); return acc; }, []);
  return {
    columns: idx.map(i => allCols[i]),
    rows: allRows.map(row => idx.map(i => row[i] ?? '')),
  };
}

/**
 * Format a job-type label from its constituent fields (server-side mirror of UI formatJobTypeLabel).
 * Produces: "{Company} - {Start} to {End} ({dispatchType})"
 */
function fmtJobType(opts: {
  companyName?: string | null;
  startLocation?: string | null;
  endLocation?: string | null;
  dispatchType?: string | null;
  title?: string | null;
}): string {
  let label = '';
  if (opts.companyName) label = opts.companyName;
  if (opts.startLocation && opts.endLocation) {
    const route = `${opts.startLocation} to ${opts.endLocation}`;
    label = label ? `${label} - ${route}` : route;
  }
  if (opts.dispatchType) {
    label = label ? `${label} (${opts.dispatchType})` : `(${opts.dispatchType})`;
  }
  return label || opts.title || '';
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
    // listJobs already JOINs jobTypeTitle, companyName, driverName, dispatcherName, unitName —
    // no need to fetch separate lookup maps.
    const result = await jobService.listJobs(orgId, exportPagination(), { sortBy, order, filters });

    const allColumns: ListColumn[] = [
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
    const allColumnKeys = ['date', 'jobType', 'company', 'driver', 'dispatcher', 'unit', 'source', 'amount', 'paid'];

    const allRows = result.data.map((j: any) => [
      fmtDate(j.jobDate),
      fmtJobType({
        companyName: j.companyName,
        startLocation: j.jobTypeStartLocation,
        endLocation: j.jobTypeEndLocation,
        dispatchType: j.jobTypeDispatchType,
        title: j.jobTypeTitle,
      }),
      j.companyName ?? '',
      j.driverName ?? '',
      j.dispatcherName ?? '',
      j.unitName ?? '',
      j.sourceType ?? '',
      fmtCurrency(j.amount),
      j.driverPaid ? 'Yes' : 'No',
    ]);

    const { columns, rows } = filterColumns(allColumns, allRows, req.query.columns as string | undefined, allColumnKeys);
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

    const allColumns: ListColumn[] = [
      { label: 'Invoice #' },
      { label: 'Date' },
      { label: 'Status' },
      { label: 'Dispatcher' },
      { label: 'Billed To' },
      { label: 'Billed Email' },
    ];
    const allColumnKeys = ['invoiceNumber', 'date', 'status', 'dispatcher', 'billedTo', 'billedEmail'];

    const allRows = result.data.map((inv: any) => [
      inv.invoiceNumber ?? '',
      fmtDate(inv.invoiceDate),
      inv.status ?? '',
      dispatcherMap.get(inv.dispatcherId) ?? '',
      inv.billedTo ?? '',
      inv.billedEmail ?? '',
    ]);

    const { columns, rows } = filterColumns(allColumns, allRows, req.query.columns as string | undefined, allColumnKeys);
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

    const allColumns: ListColumn[] = [
      { label: 'Name' },
      { label: 'Email' },
      { label: 'Phone' },
      { label: 'Pay Type' },
      { label: 'Description', width: '*' },
    ];
    const allColumnKeys = ['name', 'email', 'phone', 'payType', 'description'];

    const allRows = result.data.map((d: any) => [
      d.name ?? '',
      d.email ?? '',
      d.phone ?? '',
      d.payType ?? '',
      d.description ?? '',
    ]);

    const { columns, rows } = filterColumns(allColumns, allRows, req.query.columns as string | undefined, allColumnKeys);
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

    const allColumns: ListColumn[] = [
      { label: 'Name' },
      { label: 'Email' },
      { label: 'Phone' },
      { label: 'Commission %', align: 'right' },
      { label: 'Description', width: '*' },
    ];
    const allColumnKeys = ['name', 'email', 'phone', 'commission', 'description'];

    const allRows = result.data.map((d: any) => [
      d.name ?? '',
      d.email ?? '',
      d.phone ?? '',
      d.commissionPercent != null ? `${d.commissionPercent}%` : '',
      d.description ?? '',
    ]);

    const { columns, rows } = filterColumns(allColumns, allRows, req.query.columns as string | undefined, allColumnKeys);
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

    const allColumns: ListColumn[] = [
      { label: 'Name' },
      { label: 'Industry' },
      { label: 'Email' },
      { label: 'Phone' },
      { label: 'Location' },
    ];
    const allColumnKeys = ['name', 'industry', 'email', 'phone', 'location'];

    const allRows = result.data.map((c: any) => [
      c.name ?? '',
      c.industry ?? '',
      c.email ?? '',
      c.phone ?? '',
      c.location ?? '',
    ]);

    const { columns, rows } = filterColumns(allColumns, allRows, req.query.columns as string | undefined, allColumnKeys);
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

    const allColumns: ListColumn[] = [
      { label: 'Name' },
      { label: 'Plate #' },
      { label: 'Status' },
      { label: 'Year' },
      { label: 'Make' },
      { label: 'Model' },
      { label: 'VIN' },
      { label: 'Color' },
    ];
    const allColumnKeys = ['name', 'plate', 'status', 'year', 'make', 'model', 'vin', 'color'];

    const allRows = result.data.map((u: any) => [
      u.name ?? '',
      u.plateNumber ?? '',
      u.status ?? '',
      u.year != null ? String(u.year) : '',
      u.make ?? '',
      u.model ?? '',
      u.vin ?? '',
      u.color ?? '',
    ]);

    const { columns, rows } = filterColumns(allColumns, allRows, req.query.columns as string | undefined, allColumnKeys);
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

    const allColumns: ListColumn[] = [
      { label: 'Name' },
      { label: 'Contact Person' },
      { label: 'Email' },
      { label: 'Phone' },
    ];
    const allColumnKeys = ['name', 'contactPerson', 'email', 'phone'];

    const allRows = (Array.isArray(rows) ? rows : []).map((c: any) => [
      c.name ?? '',
      c.contactPerson ?? '',
      c.email ?? '',
      c.phone ?? '',
    ]);

    const { columns: filteredCols, rows: filteredRows } = filterColumns(allColumns, allRows, req.query.columns as string | undefined, allColumnKeys);
    const buffer = await generateListPDF('Carriers Report', `All records · ${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}`, filteredCols, filteredRows, 'portrait');
    sendPdf(res, buffer, 'carriers-report.pdf');
  }),
);

export default router;
