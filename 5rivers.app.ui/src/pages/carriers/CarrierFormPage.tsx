import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCarrier,
  useCreateCarrier,
  useUpdateCarrier,
  useDeleteCarrier,
} from '@/hooks/useCarriers';
import { useToast } from '@/context/toast';
import { PageSpinner, ButtonSpinner } from '@/components/ui/Spinner';
import { ConfirmModal } from '@/components/ui/Modal';
import type { CarrierRateType, CarrierStatus } from '@/types';

// ============================================
// Carrier Form — Create & Edit with two
// sections: Info and Rate Configuration
// ============================================

function getRateLabel(rateType: CarrierRateType): string {
  switch (rateType) {
    case 'PERCENTAGE':
      return 'Rate (%)';
    case 'HOURLY':
      return 'Rate ($/hr)';
    case 'FLAT_PER_JOB':
      return 'Rate ($ per Job)';
    case 'FLAT_PER_LOAD':
      return 'Rate ($ per Load)';
    case 'FLAT_PER_TON':
      return 'Rate ($ per Ton)';
    default:
      return 'Rate';
  }
}

function getRateSuffix(rateType: CarrierRateType): string {
  switch (rateType) {
    case 'PERCENTAGE':
      return '%';
    case 'HOURLY':
      return '/hr';
    default:
      return '';
  }
}

function getRatePrefix(rateType: CarrierRateType): string {
  switch (rateType) {
    case 'PERCENTAGE':
      return '';
    default:
      return '$';
  }
}

export function CarrierFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Mutations
  const createCarrier = useCreateCarrier();
  const updateCarrier = useUpdateCarrier();
  const deleteCarrier = useDeleteCarrier();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load existing carrier for edit mode
  const { data: existingCarrier, isLoading: carrierLoading } = useCarrier(id ?? '');

  // Form state
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<CarrierStatus>('ACTIVE');
  const [description, setDescription] = useState('');
  const [rateType, setRateType] = useState<CarrierRateType>('PERCENTAGE');
  const [rate, setRate] = useState('0');

  // Populate form when editing
  useEffect(() => {
    if (!existingCarrier) return;
    setName(existingCarrier.name);
    setContactPerson(existingCarrier.contactPerson ?? '');
    setEmail(existingCarrier.email ?? '');
    setPhone(existingCarrier.phone ?? '');
    setStatus(existingCarrier.status);
    setDescription(existingCarrier.description ?? '');
    setRateType(existingCarrier.rateType);
    setRate(existingCarrier.rate?.toString() ?? '0');
  }, [existingCarrier]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const payload = {
      name,
      contactPerson: contactPerson || null,
      email: email || null,
      phone: phone || null,
      status,
      description: description || null,
      rateType,
      rate: parseFloat(rate) || 0,
    };

    try {
      if (isEdit) {
        await updateCarrier.mutateAsync({ id: id!, data: payload });
        addToast('Carrier updated successfully', 'success');
      } else {
        await createCarrier.mutateAsync(payload);
        addToast('Carrier created successfully', 'success');
      }
      navigate('/carriers');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to save carrier',
        'error',
      );
    }
  }

  function handleDeleteConfirm() {
    if (!id) return;
    deleteCarrier.mutate(id, {
      onSuccess: () => {
        addToast('Carrier deleted', 'success');
        navigate('/carriers');
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }

  if (isEdit && carrierLoading) return <PageSpinner />;

  const isSaving = createCarrier.isPending || updateCarrier.isPending;
  const prefix = getRatePrefix(rateType);
  const suffix = getRateSuffix(rateType);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          <span>Partner Management</span>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <span className="text-primary">
            {isEdit ? 'Edit Carrier' : 'Create Carrier'}
          </span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight text-on-surface">
          {isEdit ? 'Edit Carrier' : 'Create Carrier'}
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          {isEdit
            ? 'Update carrier details and rate configuration.'
            : 'Add a new carrier partner.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Carrier Information */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-primary pl-4">
            <h2 className="text-lg font-semibold text-on-surface">
              Carrier Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <FormField label="Carrier Name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter carrier name"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Contact Person">
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Primary contact name"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carrier@example.com"
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

            <FormField label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CarrierStatus)}
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all appearance-none"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Description / Notes">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details about the carrier..."
                  rows={3}
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all resize-none"
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Section 2: Rate Configuration */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-primary pl-4">
            <h2 className="text-lg font-semibold text-on-surface">
              Rate Configuration
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <FormField label="Rate Type" required>
              <select
                value={rateType}
                onChange={(e) => setRateType(e.target.value as CarrierRateType)}
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all appearance-none"
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FLAT_PER_JOB">Flat per Job</option>
                <option value="FLAT_PER_LOAD">Flat per Load</option>
                <option value="FLAT_PER_TON">Flat per Ton</option>
                <option value="HOURLY">Hourly</option>
              </select>
            </FormField>

            <FormField label={getRateLabel(rateType)}>
              <div className="relative">
                {prefix && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    {prefix}
                  </span>
                )}
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={rateType === 'PERCENTAGE' ? 100 : undefined}
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="0.00"
                  className={`w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all ${
                    prefix ? 'pl-8' : ''
                  } ${suffix ? 'pr-12' : ''}`}
                />
                {suffix && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    {suffix}
                  </span>
                )}
              </div>
            </FormField>
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
                Delete Carrier
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/carriers')}
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
                  {isEdit ? 'Update Carrier' : 'Save Carrier'}
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
        title="Delete Carrier"
        message="This will permanently delete this carrier. Jobs associated with this carrier will not be affected."
        isLoading={deleteCarrier.isPending}
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
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
