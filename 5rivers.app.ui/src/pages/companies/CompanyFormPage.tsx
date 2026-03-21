import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCompany,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
  useCompanyJobTypes,
  useCreateJobType,
  useUpdateJobType,
  useDeleteJobType,
} from '@/hooks/useCompanies';
import { useToast } from '@/context/toast';
import { formatCurrency } from '@/lib/format';
import { PageSpinner, ButtonSpinner } from '@/components/ui/Spinner';
import { ConfirmModal } from '@/components/ui/Modal';
import { Modal } from '@/components/ui/Modal';
import type { JobType } from '@/types';

// ============================================
// Company Form — Create & Edit with nested
// Job Types management
// ============================================

export function CompanyFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Mutations
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load existing company
  const { data: existingCompany, isLoading: companyLoading } = useCompany(id ?? '');

  // Job Types for this company (edit mode only)
  const { data: jobTypesData } = useCompanyJobTypes(id ?? '');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [size, setSize] = useState('');
  const [founded, setFounded] = useState('');
  const [description, setDescription] = useState('');

  // Populate form
  useEffect(() => {
    if (!existingCompany) return;
    setName(existingCompany.name);
    setEmail(existingCompany.email ?? '');
    setPhone(existingCompany.phone ?? '');
    setWebsite(existingCompany.website ?? '');
    setIndustry(existingCompany.industry ?? '');
    setLocation(existingCompany.location ?? '');
    setSize(existingCompany.size ?? '');
    setFounded(existingCompany.founded?.toString() ?? '');
    setDescription(existingCompany.description ?? '');
  }, [existingCompany]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const payload = {
      name,
      email: email || null,
      phone: phone || null,
      website: website || null,
      industry: industry || null,
      location: location || null,
      size: size || null,
      founded: founded ? parseInt(founded, 10) : null,
      description: description || null,
    };

    try {
      if (isEdit) {
        await updateCompany.mutateAsync({ id: id!, data: payload });
        addToast('Company updated successfully', 'success');
      } else {
        await createCompany.mutateAsync(payload);
        addToast('Company created successfully', 'success');
      }
      navigate('/companies');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to save company',
        'error',
      );
    }
  }

  function handleDeleteConfirm() {
    if (!id) return;
    deleteCompany.mutate(id, {
      onSuccess: () => {
        addToast('Company deleted', 'success');
        navigate('/companies');
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }

  if (isEdit && companyLoading) return <PageSpinner />;

  const isSaving = createCompany.isPending || updateCompany.isPending;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          <span>Client Management</span>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <span className="text-primary">
            {isEdit ? 'Edit Company' : 'Create Company'}
          </span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight text-on-surface">
          {isEdit ? 'Edit Company' : 'Create Company'}
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          {isEdit
            ? 'Update company details and manage job types.'
            : 'Add a new company to your client roster.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Company Information */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-primary pl-4">
            <h2 className="text-lg font-semibold text-on-surface">
              Company Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            <FormField label="Company Name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter company name"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@company.com"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Phone">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Website">
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Industry">
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Construction, Agriculture"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Location">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, State"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Company Size">
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all appearance-none"
              >
                <option value="">Select size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="500+">500+ employees</option>
              </select>
            </FormField>

            <FormField label="Founded Year">
              <input
                type="number"
                value={founded}
                onChange={(e) => setFounded(e.target.value)}
                placeholder="e.g. 2015"
                min={1900}
                max={new Date().getFullYear()}
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <div className="lg:col-span-3">
              <FormField label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the company..."
                  rows={3}
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all resize-none"
                />
              </FormField>
            </div>
          </div>
        </div>

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
                Delete Company
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/companies')}
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
                  {isEdit ? 'Update Company' : 'Save Company'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Job Types Section (Edit mode only) */}
      {isEdit && id && (
        <JobTypesSection companyId={id} jobTypes={jobTypesData?.data ?? []} />
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Company"
        message="This will permanently delete this company and all its job types. Jobs referencing these types will not be affected."
        isLoading={deleteCompany.isPending}
      />
    </div>
  );
}

// ============================================
// Job Types sub-section
// ============================================

function JobTypesSection({
  companyId,
  jobTypes,
}: {
  companyId: string;
  jobTypes: JobType[];
}) {
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingJobType, setEditingJobType] = useState<JobType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobType | null>(null);

  const deleteJobType = useDeleteJobType();

  function handleDeleteJobType() {
    if (!deleteTarget) return;
    deleteJobType.mutate(deleteTarget.id, {
      onSuccess: () => {
        addToast('Job type deleted', 'success');
        setDeleteTarget(null);
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }

  return (
    <div className="mt-8">
      <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 border-l-4 border-secondary pl-4">
            <h2 className="text-lg font-semibold text-on-surface">Job Types</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingJobType(null);
              setShowModal(true);
            }}
            className="gradient-primary text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add Type
          </button>
        </div>

        {jobTypes.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2">work</span>
            <p className="text-sm">No job types yet. Add one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobTypes.map((jt) => (
              <div
                key={jt.id}
                className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-on-surface">
                    {jt.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                    {jt.startLocation && (
                      <span>
                        {jt.startLocation} → {jt.endLocation}
                      </span>
                    )}
                    <span className="font-medium text-primary">
                      Rate: {formatCurrency(jt.rateOfJob)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      jt.dispatchType === 'hourly'
                        ? 'bg-blue-50 text-blue-600'
                        : jt.dispatchType === 'load'
                          ? 'bg-emerald-50 text-emerald-600'
                          : jt.dispatchType === 'tonnage'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-slate-100 text-slate-600'
                    }`}>
                      {jt.dispatchType}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => {
                      setEditingJobType(jt);
                      setShowModal(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(jt)}
                    className="p-1.5 text-slate-400 hover:text-error hover:bg-error-container/20 rounded transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">
                      delete
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Type modal */}
      {showModal && (
        <JobTypeModal
          companyId={companyId}
          jobType={editingJobType}
          onClose={() => {
            setShowModal(false);
            setEditingJobType(null);
          }}
        />
      )}

      {/* Delete Job Type confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteJobType}
        title="Delete Job Type"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        isLoading={deleteJobType.isPending}
      />
    </div>
  );
}

// ============================================
// Job Type Modal (Create / Edit)
// ============================================

function JobTypeModal({
  companyId,
  jobType,
  onClose,
}: {
  companyId: string;
  jobType: JobType | null;
  onClose: () => void;
}) {
  const { addToast } = useToast();
  const createJobType = useCreateJobType();
  const updateJobType = useUpdateJobType();
  const isEdit = !!jobType;

  const [title, setTitle] = useState(jobType?.title ?? '');
  const [startLocation, setStartLocation] = useState(
    jobType?.startLocation ?? '',
  );
  const [endLocation, setEndLocation] = useState(jobType?.endLocation ?? '');
  const [dispatchType, setDispatchType] = useState(
    jobType?.dispatchType ?? 'hourly',
  );
  const [rateOfJob, setRateOfJob] = useState(
    jobType?.rateOfJob?.toString() ?? '0',
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const payload = {
      companyId,
      title,
      startLocation: startLocation || null,
      endLocation: endLocation || null,
      dispatchType,
      rateOfJob: parseFloat(rateOfJob) || 0,
    };

    try {
      if (isEdit) {
        await updateJobType.mutateAsync({
          id: jobType!.id,
          data: payload,
        });
        addToast('Job type updated', 'success');
      } else {
        await createJobType.mutateAsync(payload);
        addToast('Job type created', 'success');
      }
      onClose();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to save job type',
        'error',
      );
    }
  }

  const isSaving = createJobType.isPending || updateJobType.isPending;

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Job Type' : 'Add Job Type'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Title" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Full Truckload (FTL)"
            className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Location">
            <input
              type="text"
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
              placeholder="City, State"
              className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
            />
          </FormField>

          <FormField label="End Location">
            <input
              type="text"
              value={endLocation}
              onChange={(e) => setEndLocation(e.target.value)}
              placeholder="City, State"
              className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Dispatch Type" required>
            <select
              value={dispatchType}
              onChange={(e) => setDispatchType(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all appearance-none"
            >
              <option value="hourly">Hourly</option>
              <option value="load">Per Load</option>
              <option value="tonnage">Per Ton (Tonnage)</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </FormField>

          <FormField label={
            dispatchType === 'hourly'
              ? 'Rate ($/hr)'
              : dispatchType === 'load'
                ? 'Rate ($/load)'
                : dispatchType === 'tonnage'
                  ? 'Rate ($/ton)'
                  : 'Fixed Amount ($)'
          }>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={rateOfJob}
                onChange={(e) => setRateOfJob(e.target.value)}
                placeholder="0.00"
                className="w-full bg-surface-container-low border-none rounded-lg pl-8 p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </FormField>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/15">
          <button
            type="button"
            onClick={onClose}
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
                {isEdit ? 'Update' : 'Add Type'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
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
