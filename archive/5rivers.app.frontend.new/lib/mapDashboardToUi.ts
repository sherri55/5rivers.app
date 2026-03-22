import type { Action } from '../types';

export interface RecentJobNode {
  id: string;
  jobDate?: string | null;
  invoiceStatus?: string | null;
  startTime?: string | null;
  calculatedAmount?: number | null;
  jobType?: { id?: string; title?: string; startLocation?: string; endLocation?: string; company?: { id?: string; name?: string } } | null;
  driver?: { id?: string; name?: string } | null;
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const now = Date.now();
    const diff = now - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  } catch {
    return '—';
  }
}

/** Build "Latest Actions" from recent jobs (max 5) */
export function recentJobsToActions(recentJobs: RecentJobNode[]): Action[] {
  return recentJobs.slice(0, 5).map((j, i) => {
    const type: Action['type'] = 'Job Created';
    const company = j.jobType?.company?.name ?? 'Job';
    return {
      id: String(i + 1),
      type,
      description: `${company} – ${j.jobType?.title ?? j.id}`,
      time: relativeTime(j.jobDate ?? undefined),
      refId: j.id,
      color: 'emerald',
    };
  });
}
