import { useState, useEffect, useCallback, useRef, useMemo, type FormEvent, type ChangeEvent, type DragEvent, type ClipboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useJob, useCreateJob, useUpdateJob, useDeleteJob, useJobImages, useUploadJobImage, useDeleteJobImage } from '@/hooks/useJobs';
import { jobImagesApi } from '@/api/endpoints';
import {
  useCompanies,
  useJobTypes,
  useDrivers,
  useDispatchers,
  useUnits,
  useCarriers,
} from '@/hooks/useLookups';
import { useToast } from '@/context/toast';
import { formatCurrency } from '@/lib/format';
import { PageSpinner, ButtonSpinner } from '@/components/ui/Spinner';
import { ConfirmModal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { WeightTagsInput } from '@/components/ui/WeightTagsInput';
import { TagsInput } from '@/components/ui/TagsInput';
import type { CreateJobInput, JobSourceType } from '@/types';

// ============================================
// Job Form — Create & Edit with sourceType
// conditional logic
// ============================================

export function JobFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Mutations
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteImageModal, setShowDeleteImageModal] = useState<string | null>(null);

  // Image hooks (edit mode only)
  const { data: images = [] } = useJobImages(id ?? '');
  const uploadImage = useUploadJobImage();
  const deleteImage = useDeleteJobImage();

  // Load existing job for edit mode
  const { data: existingJob, isLoading: jobLoading } = useJob(id ?? '');

  // Form state
  const [sourceType, setSourceType] = useState<JobSourceType>('DISPATCHED');
  const [jobDate, setJobDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [jobTypeId, setJobTypeId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [dispatcherId, setDispatcherId] = useState('');
  const [carrierId, setCarrierId] = useState('');
  const [carrierAmount, setCarrierAmount] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [weight, setWeight] = useState('');
  const [loads, setLoads] = useState('');
  const [amount, setAmount] = useState('');
  const [ticketIds, setTicketIds] = useState('');
  const [jobPaid, setJobPaid] = useState(false);
  const [driverPaid, setDriverPaid] = useState(false);

  // Lookup data
  const { data: companiesData } = useCompanies();
  const { data: jobTypesData } = useJobTypes(selectedCompanyId || undefined);
  const { data: driversData } = useDrivers();
  const { data: dispatchersData } = useDispatchers();
  const { data: unitsData } = useUnits();
  const { data: carriersData } = useCarriers();

  // Filter units to ACTIVE only
  const activeUnits = useMemo(
    () => unitsData?.data.filter((u) => u.status === 'ACTIVE') ?? [],
    [unitsData],
  );

  // Filter carriers to ACTIVE only
  const activeCarriers = useMemo(
    () => carriersData?.data.filter((c) => c.status === 'ACTIVE') ?? [],
    [carriersData],
  );

  // Get selected job type's details for conditional rendering
  const selectedJobType = useMemo(
    () => jobTypesData?.data.find((jt) => jt.id === jobTypeId),
    [jobTypesData, jobTypeId],
  );

  // Determine which operation fields to show based on dispatchType
  const dispatchType = selectedJobType?.dispatchType?.toLowerCase() ?? '';
  const showTimeFields = dispatchType === 'hourly';
  const showLoadField = dispatchType === 'load' || dispatchType === 'loads';
  const showWeightField = dispatchType === 'tonnage';
  const showAmountOverride = true; // Always show, but mark as override for non-fixed

  // Calculate preview amount
  const previewAmount = useMemo(() => {
    if (!selectedJobType) return null;
    const rate = selectedJobType.rateOfJob;
    switch (dispatchType) {
      case 'hourly': {
        if (!startTime || !endTime) return null;
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        let hours = (eh + em / 60) - (sh + sm / 60);
        if (hours < 0) hours += 24; // overnight
        return hours * rate;
      }
      case 'load':
      case 'loads': {
        const l = parseInt(loads, 10);
        if (!l) return null;
        return l * rate;
      }
      case 'tonnage': {
        // weight is stored as JSON array string "[22.5,22.5]" or space-separated
        let weights: number[] = [];
        if (weight.startsWith('[')) {
          try { weights = JSON.parse(weight).filter((n: number) => !isNaN(n) && n > 0); } catch { /* ignore */ }
        }
        if (weights.length === 0) {
          weights = weight.split(/[\s,]+/).map((w) => parseFloat(w)).filter((w) => !isNaN(w) && w > 0);
        }
        if (weights.length === 0) return null;
        const totalWeight = weights.reduce((s, w) => s + w, 0);
        return totalWeight * rate;
      }
      case 'fixed':
        return rate;
      default:
        return null;
    }
  }, [dispatchType, selectedJobType, startTime, endTime, loads, weight]);

  // Populate form when editing
  useEffect(() => {
    if (!existingJob) return;
    setSourceType(existingJob.sourceType);
    setJobDate(String(existingJob.jobDate).slice(0, 10));
    setJobTypeId(existingJob.jobTypeId);
    setDriverId(existingJob.driverId ?? '');
    setUnitId(existingJob.unitId ?? '');
    setDispatcherId(existingJob.dispatcherId ?? '');
    setCarrierId(existingJob.carrierId ?? '');
    setCarrierAmount(existingJob.carrierAmount?.toString() ?? '');
    setStartTime(existingJob.startTime ?? '');
    setEndTime(existingJob.endTime ?? '');
    setWeight(existingJob.weight ?? '');
    setLoads(existingJob.loads?.toString() ?? '');
    setAmount(existingJob.amount?.toString() ?? '');
    setTicketIds(existingJob.ticketIds ?? '');
    setJobPaid(existingJob.jobPaid);
    setDriverPaid(existingJob.driverPaid);

    // We need to figure out which company this job type belongs to
    // This will be resolved when jobTypesData loads
  }, [existingJob]);

  // Resolve company from job type when editing
  useEffect(() => {
    if (existingJob && jobTypesData && !selectedCompanyId) {
      const jt = jobTypesData.data.find((t) => t.id === existingJob.jobTypeId);
      if (jt) setSelectedCompanyId(jt.companyId);
    }
  }, [existingJob, jobTypesData, selectedCompanyId]);

  // Handle form submission
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const payload: CreateJobInput = {
      jobDate,
      jobTypeId,
      driverId: driverId || null,
      dispatcherId: sourceType === 'DISPATCHED' ? dispatcherId || null : null,
      unitId: unitId || null,
      carrierId: sourceType === 'DIRECT' ? carrierId || null : null,
      sourceType,
      weight: weight || null,
      loads: loads ? parseInt(loads, 10) : null,
      startTime: startTime || null,
      endTime: endTime || null,
      amount: amount ? parseFloat(amount) : null,
      carrierAmount:
        sourceType === 'DIRECT' && carrierAmount
          ? parseFloat(carrierAmount)
          : null,
      ticketIds: ticketIds || null,
      jobPaid,
      driverPaid,
    };

    try {
      if (isEdit) {
        await updateJob.mutateAsync({ id: id!, data: payload });
        addToast('Job updated successfully', 'success');
      } else {
        await createJob.mutateAsync(payload);
        addToast('Job created successfully', 'success');
      }
      navigate('/jobs');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to save job',
        'error',
      );
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadFiles = useCallback((files: File[]) => {
    if (!id) return;
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      addToast('No image files found', 'error');
      return;
    }
    for (const file of imageFiles) {
      uploadImage.mutate(
        { jobId: id, file },
        {
          onError: (err) =>
            addToast(err instanceof Error ? err.message : 'Upload failed', 'error'),
        },
      );
    }
  }, [id, uploadImage, addToast]);

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    uploadFiles(Array.from(e.target.files));
    e.target.value = '';
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  // Paste handler for the entire images section
  function handlePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      uploadFiles(files);
    }
  }

  function handleDeleteImage(imageId: string) {
    setShowDeleteImageModal(imageId);
  }

  function handleDeleteImageConfirm() {
    if (!id || !showDeleteImageModal) return;
    deleteImage.mutate(
      { jobId: id, imageId: showDeleteImageModal },
      {
        onSuccess: () => {
          addToast('Image deleted', 'success');
          setShowDeleteImageModal(null);
        },
        onError: (err) => addToast(err instanceof Error ? err.message : 'Delete failed', 'error'),
      },
    );
  }

  function handleDeleteConfirm() {
    if (!id) return;
    deleteJob.mutate(id, {
      onSuccess: () => {
        addToast('Job deleted', 'success');
        navigate('/jobs');
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }

  if (isEdit && jobLoading) return <PageSpinner />;

  const isSaving = createJob.isPending || updateJob.isPending;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            <span>Operations</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-primary">
              {isEdit ? 'Edit Job' : 'Create New Job'}
            </span>
          </nav>
          <h1 className="text-3xl font-semibold text-on-surface tracking-tight">
            {isEdit ? 'Edit Job' : 'Create Dispatch Job'}
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Configure logistics details for freight movement.
          </p>
        </div>

        {/* Source Type Toggle */}
        <div className="bg-surface-container-highest p-1 rounded-xl flex items-center w-fit shadow-inner">
          <button
            type="button"
            onClick={() => setSourceType('DISPATCHED')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              sourceType === 'DISPATCHED'
                ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Dispatched
          </button>
          <button
            type="button"
            onClick={() => setSourceType('DIRECT')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              sourceType === 'DIRECT'
                ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Direct
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Core Logistics */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/15">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-8 w-1 bg-primary rounded-full" />
            <h2 className="text-lg font-bold text-on-surface">Core Logistics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {/* Job Date */}
            <FormField label="Job Date" required>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                  calendar_today
                </span>
                <input
                  type="date"
                  value={jobDate}
                  onChange={(e) => setJobDate(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-surface-container rounded-lg border-none text-sm font-medium focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </FormField>

            {/* Company */}
            <FormField label="Company" required>
              <Select
                value={selectedCompanyId}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  setJobTypeId(''); // Reset job type when company changes
                }}
                required
                icon="business"
              >
                <option value="">Select Company</option>
                {companiesData?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>

            {/* Job Type */}
            <FormField label="Job Type" required>
              <Select
                value={jobTypeId}
                onChange={(e) => setJobTypeId(e.target.value)}
                required
                disabled={!selectedCompanyId}
                icon="work"
              >
                <option value="">
                  {selectedCompanyId ? 'Select Job Type' : 'Select company first'}
                </option>
                {jobTypesData?.data.map((jt) => (
                  <option key={jt.id} value={jt.id}>
                    {jt.title}
                    {jt.startLocation ? ` (${jt.startLocation} → ${jt.endLocation})` : ''}
                    {' — '}
                    {jt.dispatchType}
                  </option>
                ))}
              </Select>
              {selectedJobType && (
                <p className="text-[11px] text-slate-400 mt-1 ml-1">
                  Base rate: {formatCurrency(selectedJobType.rateOfJob)}
                </p>
              )}
            </FormField>

            {/* Driver */}
            <FormField label="Driver">
              <Select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                icon="person"
              >
                <option value="">Select Driver</option>
                {driversData?.data.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </FormField>

            {/* Unit */}
            <FormField label="Unit / Truck">
              <Select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                icon="local_shipping"
              >
                <option value="">Select Unit</option>
                {activeUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.plateNumber ? ` (${u.plateNumber})` : ''}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </div>

        {/* Conditional Section: Dispatcher (DISPATCHED) or Carrier (DIRECT) */}
        <div className="bg-blue-50/30 p-8 rounded-xl border border-blue-100/50">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-blue-700 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">info</span>
            {sourceType === 'DISPATCHED' ? 'Dispatch Details' : 'Direct / Carrier Details'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sourceType === 'DISPATCHED' ? (
              <FormField label="Dispatcher" required>
                <Select
                  value={dispatcherId}
                  onChange={(e) => setDispatcherId(e.target.value)}
                  required
                  icon="support_agent"
                >
                  <option value="">Select Dispatcher</option>
                  {dispatchersData?.data.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            ) : (
              <>
                <FormField label="Carrier (optional)">
                  <Select
                    value={carrierId}
                    onChange={(e) => setCarrierId(e.target.value)}
                    icon="local_shipping"
                  >
                    <option value="">No Carrier (own driver)</option>
                    {activeCarriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </FormField>

                {carrierId && (
                  <FormField label="Carrier Amount ($)">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-primary">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={carrierAmount}
                        onChange={(e) => setCarrierAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-white border border-outline-variant/30 rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary transition-all"
                      />
                    </div>
                  </FormField>
                )}
              </>
            )}
          </div>
        </div>

        {/* Section 2: Job Operations — conditional on dispatchType */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/15">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-1 bg-secondary rounded-full" />
              <h2 className="text-lg font-bold text-on-surface">Job Operations</h2>
            </div>

            {/* Dispatch type hint */}
            {selectedJobType && (
              <div className="ml-4 mb-8">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                  dispatchType === 'hourly'
                    ? 'bg-blue-50 text-blue-700'
                    : dispatchType === 'load' || dispatchType === 'loads'
                      ? 'bg-emerald-50 text-emerald-700'
                      : dispatchType === 'tonnage'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                }`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {dispatchType === 'hourly'
                      ? 'schedule'
                      : dispatchType === 'load' || dispatchType === 'loads'
                        ? 'local_shipping'
                        : dispatchType === 'tonnage'
                          ? 'scale'
                          : 'attach_money'}
                  </span>
                  {dispatchType || 'select a job type'} — {formatCurrency(selectedJobType.rateOfJob)}{dispatchType === 'hourly' ? '/hr' : dispatchType === 'load' || dispatchType === 'loads' ? '/load' : dispatchType === 'tonnage' ? '/ton' : ''}
                </span>
              </div>
            )}

            {!selectedJobType && (
              <p className="ml-4 mb-8 text-xs text-slate-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">info</span>
                Select a job type above to see the relevant input fields.
              </p>
            )}

            <div className="grid grid-cols-2 gap-x-6 gap-y-6">
              {/* Hourly: Start Time + End Time */}
              {showTimeFields && (
                <>
                  <FormField label="Start Time" required>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-surface-container rounded-lg border-none text-sm font-medium focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                    />
                  </FormField>

                  <FormField label="End Time" required>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-surface-container rounded-lg border-none text-sm font-medium focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                    />
                  </FormField>
                </>
              )}

              {/* Tonnage: Weight Tags */}
              {showWeightField && (
                <div className="col-span-2">
                  <FormField label="Weight (tons)" required>
                    <WeightTagsInput
                      value={weight}
                      onChange={setWeight}
                      required
                    />
                  </FormField>
                </div>
              )}

              {/* Load: Total Loads */}
              {showLoadField && (
                <div className="col-span-2">
                  <FormField label="Total Loads" required>
                    <input
                      type="number"
                      value={loads}
                      onChange={(e) => setLoads(e.target.value)}
                      required
                      placeholder="Number of loads"
                      min={1}
                      className="w-full px-4 py-3 bg-surface-container rounded-lg border-none text-sm font-medium focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                    />
                  </FormField>
                </div>
              )}

              {/* Fixed: just a note */}
              {dispatchType === 'fixed' && (
                <div className="col-span-2 p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400">info</span>
                  <p className="text-sm text-slate-600">
                    Fixed-rate job — the amount is set by the job type rate ({formatCurrency(selectedJobType?.rateOfJob ?? 0)}). You can override it in the Amount field.
                  </p>
                </div>
              )}

              {/* No job type selected yet */}
              {!selectedJobType && (
                <div className="col-span-2 p-8 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 text-center">
                  <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">tune</span>
                  <p className="text-sm text-slate-400">
                    Operation fields will appear once you select a job type.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Amount + Tickets sidebar */}
          <div className="bg-surface-container-highest/50 p-8 rounded-xl border border-outline-variant/10 flex flex-col gap-6">
            {/* Calculated amount preview */}
            {previewAmount !== null && (
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">
                  Calculated Amount
                </p>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(previewAmount)}
                </p>
                <p className="text-[10px] text-emerald-500 mt-1">
                  Based on {dispatchType} rate × entered values
                </p>
              </div>
            )}

            <FormField label={dispatchType === 'fixed' ? 'Amount ($)' : 'Amount Override ($)'}>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-primary">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={previewAmount !== null ? previewAmount.toFixed(2) : '0.00'}
                  className="w-full pl-8 pr-4 py-4 bg-white rounded-lg border-none text-xl font-bold text-on-surface shadow-sm focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {dispatchType && dispatchType !== 'fixed' && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Leave blank to use the calculated amount.
                </p>
              )}
            </FormField>

            <FormField label="Ticket IDs">
              <TagsInput
                value={ticketIds}
                onChange={setTicketIds}
                placeholder="Type ticket # and press Enter..."
                color="emerald"
              />
            </FormField>

            {/* Payment status checkboxes */}
            <div className="flex flex-col gap-3 pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={jobPaid}
                  onChange={() => setJobPaid(!jobPaid)}
                  className="sr-only peer"
                />
                <span className={`material-symbols-outlined text-[22px] transition-colors ${
                  jobPaid
                    ? 'filled text-emerald-500'
                    : 'text-slate-300 group-hover:text-slate-400'
                }`}>
                  {jobPaid ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span className={`text-sm font-medium transition-colors ${
                  jobPaid ? 'text-emerald-700' : 'text-slate-500 group-hover:text-slate-700'
                }`}>
                  Payment Received
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={driverPaid}
                  onChange={() => setDriverPaid(!driverPaid)}
                  className="sr-only peer"
                />
                <span className={`material-symbols-outlined text-[22px] transition-colors ${
                  driverPaid
                    ? 'filled text-blue-500'
                    : 'text-slate-300 group-hover:text-slate-400'
                }`}>
                  {driverPaid ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span className={`text-sm font-medium transition-colors ${
                  driverPaid ? 'text-blue-700' : 'text-slate-500 group-hover:text-slate-700'
                }`}>
                  Driver Paid
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Images Section (edit mode only) */}
        {isEdit && id && (
          <div
            className={`bg-surface-container-lowest p-8 rounded-xl shadow-sm border-2 transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-outline-variant/15'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onPaste={handlePaste}
            tabIndex={0}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-tertiary rounded-full" />
                <h2 className="text-lg font-bold text-on-surface">Images & Attachments</h2>
              </div>
              <label className="gradient-primary text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md cursor-pointer active:scale-[0.98] transition-all flex items-center gap-2">
                {uploadImage.isPending ? (
                  <ButtonSpinner />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">upload</span>
                    Upload
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} disabled={uploadImage.isPending} />
              </label>
            </div>

            {images.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`text-center py-12 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/40 hover:bg-primary/5'
                }`}
              >
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">photo_library</span>
                <p className="text-sm text-slate-500 font-medium">Click, paste, or drag images here</p>
                <p className="text-xs text-slate-400 mt-1">Upload ticket photos or delivery receipts</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((img) => (
                  <div key={img.id} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-50">
                    <AuthImage
                      src={jobImagesApi.getUrl(id, img.id)}
                      alt={img.fileName || 'Job image'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-2 rounded-full shadow-md hover:bg-error hover:text-white"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                    {img.fileName && (
                      <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-2 py-1 truncate">
                        {img.fileName}
                      </p>
                    )}
                  </div>
                ))}
                {/* Add more tile */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-2xl text-slate-300">add_photo_alternate</span>
                  <span className="text-[10px] text-slate-400 mt-1">Add more</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-6 border-t border-outline-variant/10">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-error hover:bg-error-container/20 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete Job
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/jobs')}
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
                  {isEdit ? 'Update Job' : 'Save Job'}
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
        title="Delete Job"
        message="This will permanently delete the job and all associated data (images, driver pay). This cannot be undone."
        isLoading={deleteJob.isPending}
      />

      {/* Delete image confirmation modal */}
      <ConfirmModal
        open={!!showDeleteImageModal}
        onClose={() => setShowDeleteImageModal(null)}
        onConfirm={handleDeleteImageConfirm}
        title="Delete Image"
        message="Are you sure you want to delete this image? This cannot be undone."
        isLoading={deleteImage.isPending}
      />
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
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// --- Auth-aware image component ---

function AuthImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [objectUrl, setObjectUrl] = useState<string>('');

  useEffect(() => {
    let revoke = '';
    const token = localStorage.getItem('token');
    fetch(src, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        revoke = url;
        setObjectUrl(url);
      })
      .catch(() => {});
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [src]);

  if (!objectUrl) return <div className={`bg-slate-100 animate-pulse ${className ?? ''}`} />;
  return <img src={objectUrl} alt={alt} className={className} loading="lazy" />;
}
