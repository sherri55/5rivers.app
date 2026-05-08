/**
 * InquiriesListPage — admin view of public-website contact-form submissions.
 *
 * Displays all rows from the Inquiries table with a status filter and inline
 * status update. Kept intentionally lightweight (no DataTable / column toggle
 * / PDF export) — this is a low-traffic triage view, not a primary workspace.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inquiriesApi, type Inquiry, type InquiryStatus } from '@/api/endpoints';
import { useToast } from '@/context/toast';
import { formatDate } from '@/lib/format';

const STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  CLOSED_WON: 'Closed (Won)',
  CLOSED_LOST: 'Closed (Lost)',
};

const STATUS_BADGE_CLASSES: Record<InquiryStatus, string> = {
  NEW:         'bg-blue-100 text-blue-800',
  CONTACTED:   'bg-amber-100 text-amber-800',
  QUALIFIED:   'bg-purple-100 text-purple-800',
  CLOSED_WON:  'bg-green-100 text-green-800',
  CLOSED_LOST: 'bg-gray-200 text-gray-700',
};

const STATUS_OPTIONS: InquiryStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED_WON', 'CLOSED_LOST'];

export function InquiriesListPage() {
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'ALL'>('ALL');
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inquiries', statusFilter],
    queryFn: () =>
      inquiriesApi.list({
        page: 1,
        limit: 100,
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InquiryStatus }) =>
      inquiriesApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
      addToast('Status updated', 'success');
    },
    onError: () => {
      addToast('Failed to update status', 'error');
    },
  });

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">Inquiries</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Leads submitted via the public website contact form.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-on-surface-variant">Status:</label>
          <select
            className="bg-surface-container-low border-none rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InquiryStatus | 'ALL')}
          >
            <option value="ALL">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </header>

      {isLoading && <p className="text-sm text-on-surface-variant">Loading…</p>}
      {isError && <p className="text-sm text-error">Could not load inquiries.</p>}

      {data && (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden ghost-border">
          {data.data.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">
              No inquiries{statusFilter !== 'ALL' ? ` with status "${STATUS_LABELS[statusFilter]}"` : ''} yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low">
                <tr>
                  <Th>Submitted</Th>
                  <Th>Name</Th>
                  <Th>Contact</Th>
                  <Th>Service</Th>
                  <Th>Details</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((inq) => (
                  <InquiryRow
                    key={inq.id}
                    inquiry={inq}
                    onStatusChange={(status) => updateStatus.mutate({ id: inq.id, status })}
                    pending={updateStatus.isPending && updateStatus.variables?.id === inq.id}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-[10px] font-semibold tracking-wider uppercase text-on-surface-variant px-4 py-3">
      {children}
    </th>
  );
}

interface InquiryRowProps {
  inquiry: Inquiry;
  onStatusChange: (status: InquiryStatus) => void;
  pending: boolean;
}

function InquiryRow({ inquiry, onStatusChange, pending }: InquiryRowProps) {
  return (
    <tr className="border-t border-outline-variant/40 align-top">
      <td className="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">
        {formatDate(inquiry.createdAt)}
      </td>
      <td className="px-4 py-3 font-medium">{inquiry.fullName}</td>
      <td className="px-4 py-3">
        <a href={`mailto:${inquiry.email}`} className="text-primary hover:underline">{inquiry.email}</a>
        {inquiry.phone && (
          <div className="text-xs text-on-surface-variant mt-0.5">{inquiry.phone}</div>
        )}
      </td>
      <td className="px-4 py-3 capitalize">{inquiry.serviceType}</td>
      <td className="px-4 py-3 text-on-surface-variant max-w-md">
        {inquiry.projectDetails ? (
          <p className="line-clamp-3">{inquiry.projectDetails}</p>
        ) : (
          <span className="text-on-surface-variant/60 italic">none</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${STATUS_BADGE_CLASSES[inquiry.status]}`}>
            {STATUS_LABELS[inquiry.status]}
          </span>
          <select
            className="bg-surface-container-low border-none rounded text-xs px-2 py-1 focus:ring-1 focus:ring-primary disabled:opacity-50"
            value={inquiry.status}
            onChange={(e) => onStatusChange(e.target.value as InquiryStatus)}
            disabled={pending}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </td>
    </tr>
  );
}
