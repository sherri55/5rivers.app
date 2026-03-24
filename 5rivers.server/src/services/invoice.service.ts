import { v4 as uuid } from 'uuid';
import { query } from '../db/connection';
import { type Pagination, type ListResult, type SortOrder } from '../types';
import { nowEastern } from '../utils/timezone';

const SORT_COLUMNS = ['invoiceNumber', 'invoiceDate', 'status', 'billedTo', 'billedEmail', 'createdAt'] as const;
const FILTER_COLUMNS = ['invoiceNumber', 'status', 'billedTo', 'billedEmail', 'dispatcherId'] as const;

const ALL_COLUMNS = 'id, organizationId, invoiceNumber, invoiceDate, status, dispatcherId, companyId, billedTo, billedEmail, createdAt, updatedAt';

export interface Invoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: string;
  dispatcherId: string | null;
  companyId: string | null;
  billedTo: string | null;
  billedEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvoiceInput {
  invoiceDate: string;
  dispatcherId?: string | null;
  companyId?: string | null;
  status?: string;
  billedTo?: string | null;
  billedEmail?: string | null;
}

export interface UpdateInvoiceInput extends Partial<Omit<CreateInvoiceInput, 'invoiceNumber'>> {
  id: string;
}

export interface ListInvoicesOptions {
  sortBy?: string;
  order?: SortOrder;
  filters?: Record<string, string>;
}

export async function listInvoices(
  organizationId: string,
  pagination: Pagination,
  options?: ListInvoicesOptions
): Promise<ListResult<Invoice>> {
  const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy as typeof SORT_COLUMNS[number]) ? options.sortBy : 'invoiceDate';
  const order = options?.order === 'asc' ? 'ASC' : 'DESC';
  const filterClauses: string[] = [];
  const params: Record<string, unknown> = { organizationId, offset: pagination.offset, limit: pagination.limit };
  if (options?.filters) {
    const searchTerm = options.filters['search'];
    if (searchTerm) {
      const escaped = String(searchTerm).replace(/[%_\\]/g, (c) => `\\${c}`);
      params['filter_search'] = `%${escaped}%`;
      filterClauses.push(`(
        (invoiceNumber LIKE @filter_search ESCAPE '\\')
        OR (status LIKE @filter_search ESCAPE '\\')
        OR (billedTo IS NOT NULL AND billedTo LIKE @filter_search ESCAPE '\\')
        OR (billedEmail IS NOT NULL AND billedEmail LIKE @filter_search ESCAPE '\\')
        OR (CAST(invoiceDate AS VARCHAR(30)) LIKE @filter_search ESCAPE '\\')
      )`);
    }
    for (const col of FILTER_COLUMNS) {
      const v = options.filters[col];
      if (v) {
        if (col === 'dispatcherId') {
          filterClauses.push(`(${col} = @filter_${col})`);
          params[`filter_${col}`] = v;
        } else {
          filterClauses.push(`(${col} IS NOT NULL AND ${col} LIKE @filter_${col} ESCAPE '\\')`);
          params[`filter_${col}`] = `%${String(v).replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
        }
      }
    }
  }
  const whereExtra = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : '';
  const countParams: Record<string, unknown> = { organizationId };
  if (params['filter_search'] != null) countParams['filter_search'] = params['filter_search'];
  FILTER_COLUMNS.forEach((col) => { if (params[`filter_${col}`] != null) countParams[`filter_${col}`] = params[`filter_${col}`]; });
  const [rows, countRows] = await Promise.all([
    query<Invoice[]>(
      `SELECT ${ALL_COLUMNS}
       FROM Invoices WHERE organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order}, invoiceNumber DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { params }
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM Invoices WHERE organizationId = @organizationId${whereExtra}`,
      { params: countParams }
    ),
  ]);
  const total = countRows[0]?.total ?? 0;
  return {
    data: Array.isArray(rows) ? rows : [],
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit) || 1,
  };
}

export async function getInvoiceById(
  id: string,
  organizationId: string
): Promise<Invoice | null> {
  const rows = await query<Invoice[]>(
    `SELECT ${ALL_COLUMNS}
     FROM Invoices WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

const INVOICE_PREFIX = '5RT';

export async function generateNextInvoiceNumber(organizationId: string): Promise<string> {
  const year = nowEastern().getFullYear();
  const prefix = `${INVOICE_PREFIX}-${year}-`;
  const rows = await query<Array<{ maxNum: string | null }>>(
    `SELECT MAX(invoiceNumber) AS maxNum FROM Invoices
     WHERE organizationId = @organizationId AND invoiceNumber LIKE @prefix`,
    { params: { organizationId, prefix: `${prefix}%` } },
  );
  let seq = 1;
  const maxNum = rows?.[0]?.maxNum;
  if (maxNum) {
    const lastSeq = parseInt(maxNum.replace(prefix, ''), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

export async function createInvoice(
  organizationId: string,
  input: CreateInvoiceInput
): Promise<Invoice> {
  const id = uuid();
  const now = nowEastern();
  const invoiceNumber = await generateNextInvoiceNumber(organizationId);
  const status = input.status && ['CREATED', 'RAISED', 'RECEIVED'].includes(input.status) ? input.status : 'CREATED';
  await query(
    `INSERT INTO Invoices (id, organizationId, invoiceNumber, invoiceDate, status, dispatcherId, companyId, billedTo, billedEmail, createdAt, updatedAt)
     VALUES (@id, @organizationId, @invoiceNumber, @invoiceDate, @status, @dispatcherId, @companyId, @billedTo, @billedEmail, @createdAt, @updatedAt)`,
    {
      params: {
        id,
        organizationId,
        invoiceNumber,
        invoiceDate: input.invoiceDate,
        status,
        dispatcherId: input.dispatcherId ?? null,
        companyId: input.companyId ?? null,
        billedTo: input.billedTo ?? null,
        billedEmail: input.billedEmail ?? null,
        createdAt: now,
        updatedAt: now,
      },
    }
  );
  const invoice = await getInvoiceById(id, organizationId);
  if (!invoice) throw new Error('Failed to create invoice');
  return invoice;
}

export async function updateInvoice(
  organizationId: string,
  input: UpdateInvoiceInput
): Promise<Invoice | null> {
  const existing = await getInvoiceById(input.id, organizationId);
  if (!existing) return null;

  const params: Record<string, unknown> = {
    id: input.id,
    organizationId,
    invoiceDate: input.invoiceDate ?? existing.invoiceDate,
    status: input.status && ['CREATED', 'RAISED', 'RECEIVED'].includes(input.status) ? input.status : existing.status,
    dispatcherId: input.dispatcherId !== undefined ? input.dispatcherId : existing.dispatcherId,
    companyId: input.companyId !== undefined ? input.companyId : existing.companyId,
    billedTo: input.billedTo !== undefined ? input.billedTo : existing.billedTo,
    billedEmail: input.billedEmail !== undefined ? input.billedEmail : existing.billedEmail,
    updatedAt: nowEastern(),
  };

  await query(
    `UPDATE Invoices SET invoiceDate = @invoiceDate, status = @status, dispatcherId = @dispatcherId, companyId = @companyId, billedTo = @billedTo, billedEmail = @billedEmail, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`,
    { params }
  );

  // Cascade: when status changes to RECEIVED, mark all linked jobs as jobPaid (payment received from client)
  const newStatus = params.status as string;
  const oldStatus = existing.status;
  if (newStatus === 'RECEIVED' && oldStatus !== 'RECEIVED') {
    await query(
      `UPDATE Jobs SET jobPaid = 1, updatedAt = CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATETIME2)
       WHERE id IN (SELECT jobId FROM JobInvoice WHERE invoiceId = @invoiceId)
       AND organizationId = @organizationId`,
      { params: { invoiceId: input.id, organizationId } }
    );
  }
  // If status reverts from RECEIVED, unmark jobPaid
  if (oldStatus === 'RECEIVED' && newStatus !== 'RECEIVED') {
    await query(
      `UPDATE Jobs SET jobPaid = 0, updatedAt = CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATETIME2)
       WHERE id IN (SELECT jobId FROM JobInvoice WHERE invoiceId = @invoiceId)
       AND organizationId = @organizationId`,
      { params: { invoiceId: input.id, organizationId } }
    );
  }

  return getInvoiceById(input.id, organizationId);
}

export async function deleteInvoice(
  id: string,
  organizationId: string
): Promise<boolean> {
  const existing = await getInvoiceById(id, organizationId);
  if (!existing) return false;
  await query(
    `DELETE FROM Invoices WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return true;
}
