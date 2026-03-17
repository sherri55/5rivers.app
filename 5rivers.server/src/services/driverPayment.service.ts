import { v4 as uuid } from 'uuid';
import { query } from '../db/connection';
import { normalizePagination, type Pagination, type ListResult } from '../types';
import { getDriverById } from './driver.service';

export const PAYMENT_METHODS = ['CASH', 'CHECK', 'BANK_TRANSFER', 'E_TRANSFER', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface DriverPayment {
  id: string;
  driverId: string;
  organizationId: string;
  amount: number;
  paidAt: string;
  paymentMethod: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDriverPaymentInput {
  driverId: string;
  amount: number;
  paidAt: string;
  paymentMethod?: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
}

export interface UpdateDriverPaymentInput {
  amount?: number;
  paidAt?: string;
  paymentMethod?: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
}

export async function listDriverPayments(
  organizationId: string,
  pagination: Pagination,
  driverId?: string
): Promise<ListResult<DriverPayment>> {
  const driverClause = driverId ? ' AND driverId = @driverId' : '';
  const params: Record<string, unknown> = {
    organizationId,
    offset: pagination.offset,
    limit: pagination.limit,
  };
  if (driverId) params.driverId = driverId;

  const [rows, countRows] = await Promise.all([
    query<DriverPayment[]>(
      `SELECT id, driverId, organizationId, amount, paidAt, paymentMethod, reference, notes, createdAt, updatedAt
       FROM DriverPayment
       WHERE organizationId = @organizationId${driverClause}
       ORDER BY paidAt DESC, createdAt DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { params }
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM DriverPayment WHERE organizationId = @organizationId${driverClause}`,
      { params: driverId ? { organizationId, driverId } : { organizationId } }
    ),
  ]);
  const total = countRows[0]?.total ?? 0;
  return {
    data: Array.isArray(rows) ? rows.map(normalizePaymentRow) : [],
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit) || 1,
  };
}

export async function getDriverPaymentById(
  id: string,
  organizationId: string
): Promise<DriverPayment | null> {
  const rows = await query<DriverPayment[]>(
    `SELECT id, driverId, organizationId, amount, paidAt, paymentMethod, reference, notes, createdAt, updatedAt
     FROM DriverPayment WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return Array.isArray(rows) && rows.length > 0 ? normalizePaymentRow(rows[0]) : null;
}

function normalizePaymentRow(row: DriverPayment | Record<string, unknown>): DriverPayment {
  const r = row as Record<string, unknown>;
  const paidAt = r.paidAt;
  const paidAtStr =
    typeof paidAt === 'string'
      ? paidAt.slice(0, 10)
      : paidAt instanceof Date
        ? paidAt.toISOString().slice(0, 10)
        : String(paidAt ?? '').slice(0, 10);
  return { ...r, paidAt: paidAtStr } as DriverPayment;
}

export async function createDriverPayment(
  organizationId: string,
  input: CreateDriverPaymentInput
): Promise<DriverPayment> {
  const driver = await getDriverById(input.driverId, organizationId);
  if (!driver) throw new Error('Driver not found');

  const method = input.paymentMethod && PAYMENT_METHODS.includes(input.paymentMethod as PaymentMethod)
    ? input.paymentMethod
    : 'OTHER';
  const id = uuid();
  const now = new Date();
  await query(
    `INSERT INTO DriverPayment (id, driverId, organizationId, amount, paidAt, paymentMethod, reference, notes, createdAt, updatedAt)
     VALUES (@id, @driverId, @organizationId, @amount, @paidAt, @paymentMethod, @reference, @notes, @createdAt, @updatedAt)`,
    {
      params: {
        id,
        driverId: input.driverId,
        organizationId,
        amount: input.amount,
        paidAt: input.paidAt,
        paymentMethod: method,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      },
    }
  );
  const payment = await getDriverPaymentById(id, organizationId);
  if (!payment) throw new Error('Failed to create driver payment');
  return payment;
}

export async function updateDriverPayment(
  id: string,
  organizationId: string,
  input: UpdateDriverPaymentInput
): Promise<DriverPayment | null> {
  const existing = await getDriverPaymentById(id, organizationId);
  if (!existing) return null;

  const updates: string[] = [];
  const params: Record<string, unknown> = { id, organizationId };
  if (input.amount != null) {
    updates.push('amount = @amount');
    params.amount = input.amount;
  }
  if (input.paidAt != null) {
    updates.push('paidAt = @paidAt');
    params.paidAt = input.paidAt.slice(0, 10);
  }
  if (input.paymentMethod != null && PAYMENT_METHODS.includes(input.paymentMethod)) {
    updates.push('paymentMethod = @paymentMethod');
    params.paymentMethod = input.paymentMethod;
  }
  if (input.reference !== undefined) {
    updates.push('reference = @reference');
    params.reference = input.reference;
  }
  if (input.notes !== undefined) {
    updates.push('notes = @notes');
    params.notes = input.notes;
  }
  if (updates.length === 0) return existing;
  updates.push('updatedAt = @updatedAt');
  params.updatedAt = new Date();

  await query(
    `UPDATE DriverPayment SET ${updates.join(', ')}
     WHERE id = @id AND organizationId = @organizationId`,
    { params }
  );
  return getDriverPaymentById(id, organizationId);
}

export async function deleteDriverPayment(
  id: string,
  organizationId: string
): Promise<boolean> {
  const existing = await getDriverPaymentById(id, organizationId);
  if (!existing) return false;
  await query(
    `DELETE FROM DriverPayment WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return true;
}
