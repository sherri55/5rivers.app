import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDriver, useCreateDriver, useUpdateDriver, useDeleteDriver } from '@/hooks/useDrivers';
import { useToast } from '@/context/toast';
import { PageSpinner, ButtonSpinner } from '@/components/ui/Spinner';
import { ConfirmModal } from '@/components/ui/Modal';
import type { DriverPayType } from '@/types';

// ============================================
// Driver Form — Create & Edit with pay type
// conditional logic
// ============================================

export function DriverFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Mutations
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const deleteDriver = useDeleteDriver();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load existing driver for edit mode
  const { data: existingDriver, isLoading: driverLoading } = useDriver(id ?? '');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [payType, setPayType] = useState<DriverPayType>('HOURLY');
  const [hourlyRate, setHourlyRate] = useState('0');
  const [percentageRate, setPercentageRate] = useState('0');

  // Populate form when editing
  useEffect(() => {
    if (!existingDriver) return;
    setName(existingDriver.name);
    setEmail(existingDriver.email ?? '');
    setPhone(existingDriver.phone ?? '');
    setDescription(existingDriver.description ?? '');
    setPayType(existingDriver.payType);
    setHourlyRate(existingDriver.hourlyRate?.toString() ?? '0');
    setPercentageRate(existingDriver.percentageRate?.toString() ?? '0');
  }, [existingDriver]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const payload = {
      name,
      email: email || null,
      phone: phone || null,
      description: description || null,
      payType,
      hourlyRate:
        payType === 'HOURLY' || payType === 'CUSTOM'
          ? parseFloat(hourlyRate) || 0
          : 0,
      percentageRate:
        payType === 'PERCENTAGE' || payType === 'CUSTOM'
          ? parseFloat(percentageRate) || 0
          : 0,
    };

    try {
      if (isEdit) {
        await updateDriver.mutateAsync({ id: id!, data: payload });
        addToast('Driver updated successfully', 'success');
      } else {
        await createDriver.mutateAsync(payload);
        addToast('Driver created successfully', 'success');
      }
      navigate('/drivers');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to save driver',
        'error',
      );
    }
  }

  function handleDeleteConfirm() {
    if (!id) return;
    deleteDriver.mutate(id, {
      onSuccess: () => {
        addToast('Driver deleted', 'success');
        navigate('/drivers');
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }

  if (isEdit && driverLoading) return <PageSpinner />;

  const isSaving = createDriver.isPending || updateDriver.isPending;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          <span>Fleet Personnel</span>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <span className="text-primary">
            {isEdit ? 'Edit Driver' : 'Create Driver'}
          </span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight text-on-surface">
          {isEdit ? 'Edit Driver' : 'Create Driver'}
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          {isEdit
            ? 'Update driver information and pay configuration.'
            : 'Add a new driver to your fleet.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Personal Information */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-primary pl-4">
            <h2 className="text-lg font-semibold text-on-surface">
              Personal Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <FormField label="Full Name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter driver name"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Email Address">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@5rivers.com"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Phone Number">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Description / Notes">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details about the driver's history or specialization..."
                  rows={4}
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all resize-none"
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Section 2: Pay Configuration */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-primary pl-4">
            <h2 className="text-lg font-semibold text-on-surface">
              Pay Configuration
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Pay Type Radio Selection */}
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                Select Pay Type
              </label>

              {(['HOURLY', 'PERCENTAGE', 'CUSTOM'] as DriverPayType[]).map(
                (type) => (
                  <label
                    key={type}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      payType === type
                        ? 'border-primary bg-blue-50/30'
                        : 'border-outline-variant/30 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payType"
                      value={type}
                      checked={payType === type}
                      onChange={() => setPayType(type)}
                      className="w-4 h-4 text-primary focus:ring-primary/20 border-slate-300"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-semibold text-on-surface">
                        {type === 'HOURLY'
                          ? 'Hourly'
                          : type === 'PERCENTAGE'
                            ? 'Percentage'
                            : 'Custom'}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {type === 'HOURLY'
                          ? 'Fixed rate per worked hour'
                          : type === 'PERCENTAGE'
                            ? 'Based on gross load revenue'
                            : 'Manual entry per manifest'}
                      </span>
                    </div>
                  </label>
                ),
              )}
            </div>

            {/* Conditional Fields Area */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(payType === 'HOURLY' || payType === 'CUSTOM') && (
                  <FormField label="Hourly Rate ($)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-surface-container-low border-none rounded-lg pl-8 p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                      />
                    </div>
                  </FormField>
                )}

                {(payType === 'PERCENTAGE' || payType === 'CUSTOM') && (
                  <FormField label="Percentage Rate (%)">
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={percentageRate}
                        onChange={(e) => setPercentageRate(e.target.value)}
                        placeholder="0"
                        className="w-full bg-surface-container-low border-none rounded-lg p-3 pr-8 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                        %
                      </span>
                    </div>
                  </FormField>
                )}
              </div>

              {payType === 'CUSTOM' && (
                <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 flex gap-4">
                  <span className="material-symbols-outlined text-blue-600">
                    info
                  </span>
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Custom Configuration Notice
                    </p>
                    <p className="text-xs text-blue-700 leading-relaxed mt-1">
                      Pay is set manually per job. Choosing this option allows
                      dispatchers to override standard calculations during the
                      manifest closing process.
                    </p>
                  </div>
                </div>
              )}

              {payType === 'HOURLY' && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-2">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  Driver will be paid based on hours worked at the specified rate.
                </p>
              )}

              {payType === 'PERCENTAGE' && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-2">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  Driver will receive the specified percentage of each job's gross amount.
                </p>
              )}
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
                <span className="material-symbols-outlined text-[18px]">
                  delete
                </span>
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/drivers')}
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
                  <span className="material-symbols-outlined text-[18px]">
                    save
                  </span>
                  {isEdit ? 'Update Driver' : 'Save Driver'}
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
        title="Delete Driver"
        message="This will permanently delete this driver. Jobs associated with this driver will not be affected."
        isLoading={deleteDriver.isPending}
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
