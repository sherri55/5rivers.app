import { v4 as uuid } from 'uuid';
import { query } from '../db/connection';
import {
  type Pagination,
  type ListResult,
  type SortOrder,
} from '../types';

const SORT_COLUMNS = ['fullName', 'email', 'serviceType', 'status', 'createdAt'] as const;

export type InquiryStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export interface Inquiry {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  serviceType: string;
  projectDetails: string | null;
  status: InquiryStatus;
  source: string;
  notes: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInquiryInput {
  fullName: string;
  email: string;
  phone?: string | null;
  serviceType: string;
  projectDetails?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface UpdateInquiryInput {
  id: string;
  status?: InquiryStatus;
  notes?: string | null;
}

const ALL_COLUMNS = 'id, fullName, email, phone, serviceType, projectDetails, status, source, notes, userAgent, ipAddress, createdAt, updatedAt';

export async function createInquiry(input: CreateInquiryInput): Promise<Inquiry> {
  const id = uuid();
  await query(
    `INSERT INTO Inquiries
       (id, fullName, email, phone, serviceType, projectDetails, userAgent, ipAddress)
     VALUES
       (@id, @fullName, @email, @phone, @serviceType, @projectDetails, @userAgent, @ipAddress)`,
    {
      params: {
        id,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone ?? null,
        serviceType: input.serviceType,
        projectDetails: input.projectDetails ?? null,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null,
      },
    },
  );
  const created = await getInquiryById(id);
  if (!created) throw new Error('Inquiry insert succeeded but row not found');
  return created;
}

export async function getInquiryById(id: string): Promise<Inquiry | null> {
  const rows = await query<Inquiry[]>(
    `SELECT ${ALL_COLUMNS} FROM Inquiries WHERE id = @id`,
    { params: { id } },
  );
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

export interface ListInquiriesOptions {
  sortBy?: string;
  order?: SortOrder;
  status?: InquiryStatus;
}

export async function listInquiries(
  pagination: Pagination,
  options?: ListInquiriesOptions,
): Promise<ListResult<Inquiry>> {
  const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy as typeof SORT_COLUMNS[number])
    ? options.sortBy
    : 'createdAt';
  const order = options?.order === 'asc' ? 'ASC' : 'DESC';

  const params: Record<string, unknown> = {
    offset: pagination.offset,
    limit: pagination.limit,
  };
  const whereClauses: string[] = [];
  if (options?.status) {
    whereClauses.push('status = @status');
    params.status = options.status;
  }
  const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const [rows, countRows] = await Promise.all([
    query<Inquiry[]>(
      `SELECT ${ALL_COLUMNS} FROM Inquiries ${where}
       ORDER BY ${sortBy} ${order}
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { params },
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM Inquiries ${where}`,
      { params: options?.status ? { status: options.status } : {} },
    ),
  ]);

  const total = countRows[0]?.total ?? 0;
  return {
    data: Array.isArray(rows) ? rows : [],
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
  };
}

export async function updateInquiry(input: UpdateInquiryInput): Promise<Inquiry | null> {
  const sets: string[] = [];
  const params: Record<string, unknown> = { id: input.id };
  if (input.status !== undefined) {
    sets.push('status = @status');
    params.status = input.status;
  }
  if (input.notes !== undefined) {
    sets.push('notes = @notes');
    params.notes = input.notes;
  }
  if (sets.length === 0) return getInquiryById(input.id);
  sets.push('updatedAt = GETUTCDATE()');
  await query(
    `UPDATE Inquiries SET ${sets.join(', ')} WHERE id = @id`,
    { params },
  );
  return getInquiryById(input.id);
}
