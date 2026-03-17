import { JobStatus, type Job } from '../types';

export interface JobNode {
  id: string;
  jobDate?: string | null;
  invoiceStatus?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  calculatedAmount?: number | null;
  amount?: number | null;
  jobType?: {
    id?: string;
    title?: string;
    startLocation?: string | null;
    endLocation?: string | null;
    company?: { id?: string; name?: string } | null;
  } | null;
  driver?: { id?: string; name?: string } | null;
  unit?: { id?: string; name?: string } | null;
}

/** Map invoiceStatus to UI JobStatus for filter/pill */
function invoiceStatusToJobStatus(invoiceStatus: string | null | undefined): JobStatus {
  if (!invoiceStatus) return JobStatus.PENDING;
  const s = invoiceStatus.toLowerCase();
  if (s === 'invoiced' || s === 'sent' || s === 'paid') return JobStatus.COMPLETED;
  if (s === 'pending') return JobStatus.PENDING;
  return JobStatus.RAISED;
}

/** Format jobDate (ISO or YYYY-MM-DD) to short date for list */
function formatJobDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso) : d.toISOString().slice(0, 10);
  } catch {
    return String(iso);
  }
}

/** Map GraphQL job node to UI Job shape for JobsHub */
export function mapJobNodeToUi(node: JobNode): Job {
  const jobType = node.jobType;
  const companyName = jobType?.company?.name ?? '—';
  const origin = jobType?.startLocation ?? '—';
  const destination = jobType?.endLocation ?? '—';
  const driverName = node.driver?.name ?? 'Unassigned';
  const unitName = node.unit?.name ?? '';
  const rate = node.calculatedAmount ?? node.amount ?? 0;
  const date = formatJobDate(node.jobDate);
  const time = node.startTime ?? '—';
  const status = invoiceStatusToJobStatus(node.invoiceStatus);

  return {
    id: node?.id != null ? String(node.id) : '—',
    customer: companyName,
    origin,
    destination,
    status,
    driverId: node.driver?.id != null ? String(node.driver.id) : '',
    driverName,
    unitId: unitName,
    rate: Number.isFinite(Number(rate)) ? Number(rate) : 0,
    date,
    time,
  };
}
