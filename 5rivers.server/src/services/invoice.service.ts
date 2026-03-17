import { v4 as uuid } from 'uuid';
import { query } from '../db/connection';
import { type Pagination, type ListResult, type SortOrder } from '../types';

const SORT_COLUMNS = ['invoiceNumber', 'invoiceDate', 'status', 'billedTo', 'billedEmail', 'createdAt'] as const;
const FILTER_COLUMNS = ['invoiceNumber', 'status', 'billedTo', 'billedEmail'] as const;

export interface Invoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: string;
  dispatcherId: string;
  billedTo: string | null;
  billedEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvoiceInput {
  invoiceNumber: string;
  invoiceDate: string;
  dispatcherId: string;
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
    for (const col of FILTER_COLUMNS) {
      const v = options.filters[col];
      if (v) {
        filterClauses.push(`(${col} IS NOT NULL AND ${col} LIKE @filter_${col} ESCAPE '\\')`);
        params[`filter_${col}`] = `%${String(v).replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
      }
    }
  }
  const whereExtra = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : '';
  const countParams: Record<string, unknown> = { organizationId };
  FILTER_COLUMNS.forEach((col) => { if (params[`filter_${col}`] != null) countParams[`filter_${col}`] = params[`filter_${col}`]; });
  const [rows, countRows] = await Promise.all([
    query<Invoice[]>(
      `SELECT id, organizationId, invoiceNumber, invoiceDate, status, dispatcherId, billedTo, billedEmail, createdAt, updatedAt
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
    `SELECT id, organizationId, invoiceNumber, invoiceDate, status, dispatcherId, billedTo, billedEmail, createdAt, updatedAt
     FROM Invoices WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function createInvoice(
  organizationId: string,
  input: CreateInvoiceInput
): Promise<Invoice> {
  const id = uuid();
  const now = new Date();
  const status = input.status && ['CREATED', 'RAISED', 'RECEIVED'].includes(input.status) ? input.status : 'CREATED';
  await query(
    `INSERT INTO Invoices (id, organizationId, invoiceNumber, invoiceDate, status, dispatcherId, billedTo, billedEmail, createdAt, updatedAt)
     VALUES (@id, @organizationId, @invoiceNumber, @invoiceDate, @status, @dispatcherId, @billedTo, @billedEmail, @createdAt, @updatedAt)`,
    {
      params: {
        id,
        organizationId,
        invoiceNumber: input.invoiceNumber,
        invoiceDate: input.invoiceDate,
        status,
        dispatcherId: input.dispatcherId,
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
    dispatcherId: input.dispatcherId ?? existing.dispatcherId,
    billedTo: input.billedTo !== undefined ? input.billedTo : existing.billedTo,
    billedEmail: input.billedEmail !== undefined ? input.billedEmail : existing.billedEmail,
    updatedAt: new Date(),
  };

  await query(
    `UPDATE Invoices SET invoiceDate = @invoiceDate, status = @status, dispatcherId = @dispatcherId, billedTo = @billedTo, billedEmail = @billedEmail, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`,
    { params }
  );
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
