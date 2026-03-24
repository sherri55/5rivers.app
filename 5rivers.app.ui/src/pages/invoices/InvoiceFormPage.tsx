import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useInvoice,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useInvoiceJobs,
  useAddJobToInvoice,
  useRemoveJobFromInvoice,
} from '@/hooks/useInvoices';
import { useQuery } from '@tanstack/react-query';
import { useJobs } from '@/hooks/useJobs';
import { useDispatchers, useCompanies, useDrivers, useJobTypes } from '@/hooks/useLookups';
import { useToast } from '@/context/toast';
import { formatCurrency, formatDate } from '@/lib/format';
import { invoicesApi, pdfApi } from '@/api/endpoints';
import { SourceTypeBadge } from '@/components/ui/Badge';
import { PageSpinner, ButtonSpinner } from '@/components/ui/Spinner';
import { ExportPdfButton } from '@/components/ui/ExportPdfButton';
import { Select } from '@/components/ui/Select';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import type { InvoiceStatus, Job, JobInvoiceLine } from '@/types';

// ============================================
// Invoice Form — Create & Edit with sections:
// Invoice Details, Billing Information,
// Jobs on this Invoice, Invoice Totals
// ============================================

type BillingType = 'dispatcher' | 'company';

export function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Mutations
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const addJobToInvoice = useAddJobToInvoice();
  const removeJobFromInvoice = useRemoveJobFromInvoice();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [showAddJobsModal, setShowAddJobsModal] = useState(false);

  // Load existing invoice for edit mode
  const { data: existingInvoice, isLoading: invoiceLoading } = useInvoice(id ?? '');

  // Invoice jobs (edit mode only)
  const { data: invoiceJobs } = useInvoiceJobs(id ?? '');

  // Lookup data
  const { data: dispatchersData } = useDispatchers();
  const { data: companiesData } = useCompanies();
  const { data: driversData } = useDrivers();
  const { data: jobTypesData } = useJobTypes();
  const { data: allJobsData } = useJobs({ limit: 500 });

  // Auto-generate invoice number for new invoices
  const { data: nextNumberData } = useQuery({
    queryKey: ['invoices', 'next-number'],
    queryFn: () => invoicesApi.nextNumber(),
    enabled: !isEdit,
  });

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }),
  );
  const [status, setStatus] = useState<InvoiceStatus>('CREATED');
  const [billingType, setBillingType] = useState<BillingType>('dispatcher');
  const [dispatcherId, setDispatcherId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [billedTo, setBilledTo] = useState('');
  const [billedEmail, setBilledEmail] = useState('');

  // Add jobs modal state
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [jobSearchTerm, setJobSearchTerm] = useState('');

  // Set next invoice number for new invoices
  useEffect(() => {
    if (!isEdit && nextNumberData?.nextNumber) {
      setInvoiceNumber(nextNumberData.nextNumber);
    }
  }, [isEdit, nextNumberData]);

  // Populate form when editing
  useEffect(() => {
    if (!existingInvoice) return;
    setInvoiceNumber(existingInvoice.invoiceNumber);
    setInvoiceDate(String(existingInvoice.invoiceDate ?? '').slice(0, 10));
    setStatus(existingInvoice.status);
    setBilledTo(existingInvoice.billedTo ?? '');
    setBilledEmail(existingInvoice.billedEmail ?? '');

    if (existingInvoice.dispatcherId) {
      setBillingType('dispatcher');
      setDispatcherId(existingInvoice.dispatcherId);
      setCompanyId('');
    } else if (existingInvoice.companyId) {
      setBillingType('company');
      setCompanyId(existingInvoice.companyId);
      setDispatcherId('');
    }
  }, [existingInvoice]);

  // Lookup maps
  const driverMap = useMemo(
    () => new Map(driversData?.data.map((d) => [d.id, d.name]) ?? []),
    [driversData],
  );
  const jobTypeMap = useMemo(
    () => new Map(jobTypesData?.data.map((jt) => [jt.id, jt.title]) ?? []),
    [jobTypesData],
  );
  const dispatcherMap = useMemo(
    () => new Map(dispatchersData?.data.map((d) => [d.id, d]) ?? []),
    [dispatchersData],
  );
  const companyMap = useMemo(
    () => new Map(companiesData?.data.map((c) => [c.id, c.name]) ?? []),
    [companiesData],
  );
  const jobTypeDetailMap = useMemo(
    () => new Map(jobTypesData?.data.map((jt) => [jt.id, jt]) ?? []),
    [jobTypesData],
  );

  // Jobs already on any invoice (for filtering available jobs)
  const invoicedJobIds = useMemo(() => {
    const set = new Set<string>();
    if (invoiceJobs) {
      for (const line of invoiceJobs) set.add(line.jobId);
    }
    return set;
  }, [invoiceJobs]);

  // All jobs map for resolving details
  const allJobsMap = useMemo(
    () => new Map((allJobsData?.data ?? []).map((j) => [j.id, j])),
    [allJobsData],
  );

  // Available jobs for the "Add Jobs" modal
  const availableJobs = useMemo(() => {
    const jobs = allJobsData?.data ?? [];
    return jobs.filter((j) => {
      // Exclude jobs already on this invoice
      if (invoicedJobIds.has(j.id)) return false;
      // Match dispatcher if invoice is dispatcher-type
      if (existingInvoice?.dispatcherId) {
        return j.dispatcherId === existingInvoice.dispatcherId;
      }
      // Match company invoices: only DIRECT source jobs
      if (existingInvoice?.companyId) {
        return j.sourceType === 'DIRECT';
      }
      return false;
    });
  }, [allJobsData, invoicedJobIds, existingInvoice]);

  // Filtered available jobs (for search within modal)
  const filteredAvailableJobs = useMemo(() => {
    if (!jobSearchTerm.trim()) return availableJobs;
    const term = jobSearchTerm.toLowerCase();
    return availableJobs.filter((job) => {
      const jt = jobTypeDetailMap.get(job.jobTypeId);
      const driverName = job.driverId ? driverMap.get(job.driverId) : '';
      const companyName = jt?.companyId ? companyMap.get(jt.companyId) : '';
      const searchable = [
        job.jobDate,
        jt?.title,
        jt?.startLocation,
        jt?.endLocation,
        driverName,
        companyName,
        job.sourceType,
        job.ticketIds,
        job.amount?.toString(),
      ].filter(Boolean).join(' ').toLowerCase();
      return searchable.includes(term);
    });
  }, [availableJobs, jobSearchTerm, jobTypeDetailMap, driverMap, companyMap]);

  // Select-all for visible filtered jobs
  const allFilteredSelected = filteredAvailableJobs.length > 0 &&
    filteredAvailableJobs.every((j) => selectedJobIds.has(j.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedJobIds((prev) => {
        const next = new Set(prev);
        for (const j of filteredAvailableJobs) next.delete(j.id);
        return next;
      });
    } else {
      setSelectedJobIds((prev) => {
        const next = new Set(prev);
        for (const j of filteredAvailableJobs) next.add(j.id);
        return next;
      });
    }
  }

  // Selected jobs total amount
  const selectedTotal = useMemo(() => {
    let sum = 0;
    for (const jobId of selectedJobIds) {
      const job = allJobsMap.get(jobId);
      if (job) sum += job.amount ?? 0;
    }
    return sum;
  }, [selectedJobIds, allJobsMap]);

  // Invoice totals
  const subtotal = useMemo(
    () => (invoiceJobs ?? []).reduce((sum, line) => sum + (line.amount ?? 0), 0),
    [invoiceJobs],
  );
  const selectedDispatcher = existingInvoice?.dispatcherId
    ? dispatcherMap.get(existingInvoice.dispatcherId)
    : null;
  const commissionPercent = selectedDispatcher?.commissionPercent ?? 0;
  const commission = commissionPercent > 0 ? subtotal * (commissionPercent / 100) : 0;
  const hst = (subtotal - commission) * 0.13;
  const total = subtotal - commission + hst;

  function handleStatusChange(newStatus: InvoiceStatus) {
    // Warn when changing to RECEIVED
    if (
      newStatus === 'RECEIVED' &&
      existingInvoice &&
      existingInvoice.status !== 'RECEIVED'
    ) {
      setStatus(newStatus);
      setShowReceivedModal(true);
    } else {
      setStatus(newStatus);
    }
  }

  function handleReceivedCancel() {
    // Revert status back to what it was
    setStatus(existingInvoice?.status ?? 'CREATED');
    setShowReceivedModal(false);
  }

  function handleReceivedConfirm() {
    setShowReceivedModal(false);
    // Status is already set to RECEIVED, user confirmed
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const payload = {
      invoiceDate: invoiceDate || null,
      status,
      dispatcherId: billingType === 'dispatcher' && dispatcherId ? dispatcherId : null,
      companyId: billingType === 'company' && companyId ? companyId : null,
      billedTo: billedTo || null,
      billedEmail: billedEmail || null,
    };

    try {
      if (isEdit) {
        await updateInvoice.mutateAsync({ id: id!, data: payload });
        addToast('Invoice updated successfully', 'success');
      } else {
        await createInvoice.mutateAsync(payload);
        addToast('Invoice created successfully', 'success');
      }
      navigate('/invoices');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to save invoice',
        'error',
      );
    }
  }

  function handleDeleteConfirm() {
    if (!id) return;
    deleteInvoice.mutate(id, {
      onSuccess: () => {
        addToast('Invoice deleted', 'success');
        navigate('/invoices');
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }

  async function handleRemoveJob(jobId: string) {
    if (!id) return;
    try {
      await removeJobFromInvoice.mutateAsync({ invoiceId: id, jobId });
      addToast('Job removed from invoice', 'success');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to remove job',
        'error',
      );
    }
  }

  async function handleAddSelectedJobs() {
    if (!id || selectedJobIds.size === 0) return;
    let added = 0;
    for (const jobId of selectedJobIds) {
      const job = allJobsMap.get(jobId);
      const amount = job?.amount ?? 0;
      try {
        await addJobToInvoice.mutateAsync({ invoiceId: id, jobId, amount });
        added++;
      } catch (err) {
        addToast(
          err instanceof Error ? err.message : `Failed to add job ${jobId}`,
          'error',
        );
      }
    }
    if (added > 0) {
      addToast(`${added} job(s) added to invoice`, 'success');
    }
    setSelectedJobIds(new Set());
    setShowAddJobsModal(false);
  }

  function toggleJobSelection(jobId: string) {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  if (isEdit && invoiceLoading) return <PageSpinner />;

  const isSaving = createInvoice.isPending || updateInvoice.isPending;
  const dispatchers = dispatchersData?.data ?? [];
  const companies = companiesData?.data ?? [];
  const jobLines: JobInvoiceLine[] = invoiceJobs ?? [];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          <span>Billing</span>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <span className="text-primary">
            {isEdit ? 'Edit Invoice' : 'Create Invoice'}
          </span>
        </nav>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-on-surface">
            {isEdit ? 'Edit Invoice' : 'Create Invoice'}
          </h1>
          {isEdit && id && (
            <ExportPdfButton
              onExport={() => pdfApi.downloadInvoice(id)}
              label="Download PDF"
            />
          )}
        </div>
        <p className="text-on-surface-variant text-sm mt-1">
          {isEdit
            ? 'Update invoice details and billing information.'
            : 'Create a new invoice for billing.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Invoice Details */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-primary pl-4">
            <h2 className="text-lg font-semibold text-on-surface">
              Invoice Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
            <FormField label="Invoice Number">
              <input
                type="text"
                value={invoiceNumber}
                readOnly
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm text-slate-500 font-mono cursor-default"
              />
            </FormField>

            <FormField label="Invoice Date">
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Status">
              <Select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as InvoiceStatus)}
                icon="flag"
              >
                <option value="CREATED">Created</option>
                <option value="RAISED">Raised</option>
                <option value="RECEIVED">Received</option>
              </Select>
            </FormField>
          </div>
        </div>

        {/* Section 2: Billing Information */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-primary pl-4">
            <h2 className="text-lg font-semibold text-on-surface">
              Billing Information
            </h2>
          </div>

          <div className="space-y-6">
            {/* Billing type toggle */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                Bill To
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBillingType('dispatcher');
                    setCompanyId('');
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    billingType === 'dispatcher'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container-low text-slate-600 hover:bg-surface-container'
                  }`}
                >
                  Dispatcher
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBillingType('company');
                    setDispatcherId('');
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    billingType === 'company'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container-low text-slate-600 hover:bg-surface-container'
                  }`}
                >
                  Company
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {billingType === 'dispatcher' ? (
                <FormField label="Dispatcher">
                  <Select
                    value={dispatcherId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setDispatcherId(id);
                      // Auto-populate billing fields from dispatcher
                      const dispatcher = dispatchers.find((d) => d.id === id);
                      if (dispatcher) {
                        setBilledTo(dispatcher.name);
                        if (dispatcher.email) setBilledEmail(dispatcher.email);
                      }
                    }}
                    icon="support_agent"
                  >
                    <option value="">Select dispatcher</option>
                    {dispatchers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                        {d.commissionPercent ? ` (${d.commissionPercent}%)` : ''}
                      </option>
                    ))}
                  </Select>
                </FormField>
              ) : (
                <FormField label="Company">
                  <Select
                    value={companyId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setCompanyId(id);
                      // Auto-populate billing fields from company
                      const company = companies.find((c) => c.id === id);
                      if (company) {
                        setBilledTo(company.name);
                        if (company.email) setBilledEmail(company.email);
                      }
                    }}
                    icon="business"
                  >
                    <option value="">Select company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              <FormField label="Billed To (Name)">
                <input
                  type="text"
                  value={billedTo}
                  onChange={(e) => setBilledTo(e.target.value)}
                  placeholder="Recipient name"
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                />
              </FormField>

              <FormField label="Billed Email">
                <input
                  type="email"
                  value={billedEmail}
                  onChange={(e) => setBilledEmail(e.target.value)}
                  placeholder="billing@example.com"
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Section 3: Jobs on this Invoice (edit mode only) */}
        {isEdit && (
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
                <h2 className="text-lg font-semibold text-on-surface">
                  Jobs on this Invoice
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedJobIds(new Set());
                  setJobSearchTerm('');
                  setShowAddJobsModal(true);
                }}
                className="gradient-primary text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add Jobs
              </button>
            </div>

            {jobLines.length === 0 ? (
              <p className="text-on-surface-variant text-sm text-center py-8">
                No jobs added to this invoice yet. Click "Add Jobs" to get started.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/15">
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-400">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-400">Job Type</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-400">Driver</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-400">Source</th>
                      <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-400">Amount</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobLines.map((line) => {
                      const jt = line.jobTypeId ? jobTypeDetailMap.get(line.jobTypeId) : undefined;
                      return (
                        <tr key={line.jobId} className="border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors">
                          <td className="py-3 px-4 text-sm text-on-surface">{formatDate(line.jobDate)}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-blue-700">{jt?.title ?? '—'}</span>
                              {jt?.companyId && (
                                <span className="text-[11px] text-slate-500">{companyMap.get(jt.companyId)}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-on-surface">{line.driverId ? driverMap.get(line.driverId) ?? '—' : '—'}</td>
                          <td className="py-3 px-4">{line.sourceType ? <SourceTypeBadge sourceType={line.sourceType} /> : '—'}</td>
                          <td className="py-3 px-4 text-right text-sm font-semibold text-on-surface">{formatCurrency(line.amount)}</td>
                          <td className="py-3 px-2">
                            <button
                              type="button"
                              onClick={() => handleRemoveJob(line.jobId)}
                              disabled={removeJobFromInvoice.isPending}
                              className="text-slate-400 hover:text-error hover:bg-error-container/20 p-1 rounded-lg transition-colors"
                              title="Remove job from invoice"
                            >
                              <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Section 4: Invoice Totals (edit mode only, when there are jobs) */}
        {isEdit && jobLines.length > 0 && (
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
            <div className="flex items-center gap-3 mb-8 border-l-4 border-primary pl-4">
              <h2 className="text-lg font-semibold text-on-surface">
                Invoice Totals
              </h2>
            </div>

            <div className="max-w-sm ml-auto space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Subtotal</span>
                <span className="text-on-surface font-medium">${subtotal.toFixed(2)}</span>
              </div>
              {commissionPercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Commission ({commissionPercent}%)</span>
                  <span className="text-error font-medium">-${commission.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">HST (13%)</span>
                <span className="text-on-surface font-medium">${hst.toFixed(2)}</span>
              </div>
              <div className="border-t border-outline-variant/15 pt-3 flex justify-between">
                <span className="text-on-surface font-semibold">Total</span>
                <span className="text-on-surface font-bold text-lg">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-6 border-t border-outline-variant/15">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-error hover:bg-error-container/20 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete Invoice
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="bg-surface-container-low text-on-surface-variant px-5 py-2.5 rounded-lg font-medium text-sm border border-outline-variant/20 hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="gradient-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-70"
            >
              {isSaving ? (
                <ButtonSpinner />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  {isEdit ? 'Update Invoice' : 'Save Invoice'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${existingInvoice?.invoiceNumber}? This action cannot be undone.`}
        isLoading={deleteInvoice.isPending}
      />

      {/* Received status confirmation modal */}
      <ConfirmModal
        open={showReceivedModal}
        onClose={handleReceivedCancel}
        onConfirm={handleReceivedConfirm}
        title="Mark Invoice as Received"
        message="Changing the status to RECEIVED will mark all jobs linked to this invoice as paid (driverPaid). This action cannot be undone. Are you sure you want to proceed?"
        confirmLabel="Confirm"
      />

      {/* Add Jobs modal — revamped with search, select-all, rich info */}
      <Modal
        open={showAddJobsModal}
        onClose={() => setShowAddJobsModal(false)}
        title="Add Jobs to Invoice"
        size="xl"
        actions={
          <>
            {selectedJobIds.size > 0 && (
              <div className="mr-auto flex items-center gap-3 text-sm">
                <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full">
                  {selectedJobIds.size} selected
                </span>
                <span className="text-slate-500">
                  Total: <span className="font-semibold text-on-surface">{formatCurrency(selectedTotal)}</span>
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowAddJobsModal(false)}
              className="bg-surface-container-low text-on-surface-variant px-5 py-2.5 rounded-lg font-medium text-sm border border-outline-variant/20 hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddSelectedJobs}
              disabled={selectedJobIds.size === 0 || addJobToInvoice.isPending}
              className="gradient-primary text-white px-5 py-2.5 rounded-lg font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-70"
            >
              {addJobToInvoice.isPending ? (
                <ButtonSpinner />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add {selectedJobIds.size > 0 ? `${selectedJobIds.size} Job${selectedJobIds.size > 1 ? 's' : ''}` : 'Jobs'}
                </>
              )}
            </button>
          </>
        }
      >
        {availableJobs.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-[48px] text-slate-300 mb-3 block">search_off</span>
            <p className="text-on-surface-variant text-sm">
              No available jobs to add. All matching jobs may already be on this invoice.
            </p>
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div className="relative mb-4">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                search
              </span>
              <input
                type="text"
                value={jobSearchTerm}
                onChange={(e) => setJobSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border-none rounded-lg text-sm focus:ring-1 focus:ring-primary"
                placeholder="Search by date, job type, driver, company, location..."
                autoFocus
              />
              {jobSearchTerm && (
                <button
                  type="button"
                  onClick={() => setJobSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between mb-2 text-xs text-slate-500">
              <span>
                {filteredAvailableJobs.length} job{filteredAvailableJobs.length !== 1 ? 's' : ''} available
                {jobSearchTerm && ` (filtered from ${availableJobs.length})`}
              </span>
            </div>

            {filteredAvailableJobs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-on-surface-variant text-sm">No jobs match your search.</p>
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-outline-variant/15">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr className="border-b border-outline-variant/15">
                      <th className="py-2.5 px-3 w-10">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAll}
                          className="rounded border-outline-variant"
                          title="Select all"
                        />
                      </th>
                      <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
                      <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Job Type / Company</th>
                      <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Driver</th>
                      <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Source</th>
                      <th className="text-right py-2.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAvailableJobs.map((job) => {
                      const jt = jobTypeDetailMap.get(job.jobTypeId);
                      const isSelected = selectedJobIds.has(job.id);
                      return (
                        <tr
                          key={job.id}
                          onClick={() => toggleJobSelection(job.id)}
                          className={`border-b border-outline-variant/10 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-primary/8'
                              : 'hover:bg-surface-container-low/50'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleJobSelection(job.id)}
                              className="rounded border-outline-variant"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-[13px] font-medium text-on-surface">
                              {formatDate(job.jobDate)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col">
                              <span className="text-[13px] font-medium text-blue-700">
                                {jt?.title ?? '—'}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {jt?.companyId ? companyMap.get(jt.companyId) : ''}
                                {jt?.startLocation && ` · ${jt.startLocation}`}
                                {jt?.endLocation && ` → ${jt.endLocation}`}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-[13px] text-slate-700">
                            {job.driverId ? driverMap.get(job.driverId) ?? '—' : '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <SourceTypeBadge sourceType={job.sourceType} />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-[13px] font-bold text-on-surface">
                              {formatCurrency(job.amount)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

// --- Reusable form field wrapper ---

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
