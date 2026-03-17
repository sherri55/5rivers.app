import { InvoiceStatus, type Invoice } from '../types';

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const date = new Date(d);
    return isNaN(date.getTime()) ? String(d) : date.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return String(d);
  }
}

function statusToUi(s: string | null | undefined): InvoiceStatus {
  if (!s) return InvoiceStatus.SENT;
  const lower = s.toLowerCase();
  if (lower === 'paid') return InvoiceStatus.PAID;
  if (lower === 'overdue' || lower === 'pending') return InvoiceStatus.OVERDUE;
  return InvoiceStatus.SENT;
}

export interface InvoiceNode {
  id: string;
  invoiceNumber: string;
  invoiceDate?: string | null;
  status?: string | null;
  billedTo?: string | null;
  calculations?: { total?: number | null } | null;
  jobs?: Array<{ job?: { id?: string } | null; amount?: number | null }> | null;
}

export function mapInvoiceNodeToUi(node: InvoiceNode): Invoice {
  const total = node.calculations?.total ?? node.jobs?.reduce((sum, r) => sum + (r.amount ?? 0), 0) ?? 0;
  const firstJobId = node.jobs?.[0]?.job?.id ?? '—';
  const issueDate = node.invoiceDate ? new Date(node.invoiceDate) : null;
  const dueDate = issueDate ? new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000) : null;
  return {
    id: node.invoiceNumber ?? node?.id ?? '—',
    jobId: firstJobId,
    customer: node.billedTo ?? '—',
    amount: Number(total) || 0,
    date: formatDate(node.invoiceDate),
    dueDate: dueDate ? formatDate(dueDate.toISOString()) : '—',
    status: statusToUi(node.status),
  };
}
