import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUnit, useCreateUnit, useUpdateUnit, useDeleteUnit } from '@/hooks/useUnits';
import { useToast } from '@/context/toast';
import { PageSpinner, ButtonSpinner } from '@/components/ui/Spinner';
import { ConfirmModal } from '@/components/ui/Modal';
import type { UnitStatus } from '@/types';

// ============================================
// Unit Form — Create & Edit with three sections:
// Identification, Vehicle Details, Maintenance
// ============================================

export function UnitFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Mutations
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load existing unit for edit mode
  const { data: existingUnit, isLoading: unitLoading } = useUnit(id ?? '');

  // Form state
  const [name, setName] = useState('');
  const [status, setStatus] = useState<UnitStatus>('ACTIVE');
  const [color, setColor] = useState('');
  const [description, setDescription] = useState('');
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vin, setVin] = useState('');
  const [mileage, setMileage] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [lastMaintenanceDate, setLastMaintenanceDate] = useState('');
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (!existingUnit) return;
    setName(existingUnit.name);
    setStatus(existingUnit.status);
    setColor(existingUnit.color ?? '');
    setDescription(existingUnit.description ?? '');
    setYear(existingUnit.year?.toString() ?? '');
    setMake(existingUnit.make ?? '');
    setModel(existingUnit.model ?? '');
    setPlateNumber(existingUnit.plateNumber ?? '');
    setVin(existingUnit.vin ?? '');
    setMileage(existingUnit.mileage?.toString() ?? '');
    setInsuranceExpiry(existingUnit.insuranceExpiry ?? '');
    setLastMaintenanceDate(existingUnit.lastMaintenanceDate ?? '');
    setNextMaintenanceDate(existingUnit.nextMaintenanceDate ?? '');
  }, [existingUnit]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const payload = {
      name,
      status,
      color: color || null,
      description: description || null,
      year: year ? parseInt(year, 10) : null,
      make: make || null,
      model: model || null,
      plateNumber: plateNumber || null,
      vin: vin || null,
      mileage: mileage ? parseInt(mileage, 10) : null,
      insuranceExpiry: insuranceExpiry || null,
      lastMaintenanceDate: lastMaintenanceDate || null,
      nextMaintenanceDate: nextMaintenanceDate || null,
    };

    try {
      if (isEdit) {
        await updateUnit.mutateAsync({ id: id!, data: payload });
        addToast('Unit updated successfully', 'success');
      } else {
        await createUnit.mutateAsync(payload);
        addToast('Unit created successfully', 'success');
      }
      navigate('/units');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to save unit',
        'error',
      );
    }
  }

  function handleDeleteConfirm() {
    if (!id) return;
    deleteUnit.mutate(id, {
      onSuccess: () => {
        addToast('Unit deleted', 'success');
        navigate('/units');
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }

  if (isEdit && unitLoading) return <PageSpinner />;

  const isSaving = createUnit.isPending || updateUnit.isPending;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          <span>Fleet Management</span>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <span className="text-primary">
            {isEdit ? 'Edit Unit' : 'Create Unit'}
          </span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight text-on-surface">
          {isEdit ? 'Edit Unit' : 'Create Unit'}
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          {isEdit
            ? 'Update unit details, vehicle information, and maintenance schedule.'
            : 'Add a new unit to your fleet.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Unit Identification */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-primary pl-4">
            <h2 className="text-lg font-semibold text-on-surface">
              Unit Identification
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <FormField label="Unit Name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Truck #101"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UnitStatus)}
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all appearance-none"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="RETIRED">Retired</option>
              </select>
            </FormField>

            <FormField label="Color">
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. White, Red"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Description / Notes">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details about the unit..."
                  rows={3}
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all resize-none"
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Section 2: Vehicle Details */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-primary pl-4">
            <h2 className="text-lg font-semibold text-on-surface">
              Vehicle Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            <FormField label="Year">
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2024"
                min={1900}
                max={new Date().getFullYear() + 1}
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Make">
              <input
                type="text"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="e.g. Peterbilt"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Model">
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. 579"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Plate Number">
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="e.g. ABC-1234"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="VIN">
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="Vehicle Identification Number"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Mileage">
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="Current mileage"
                min={0}
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>
          </div>
        </div>

        {/* Section 3: Maintenance & Insurance */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-primary pl-4">
            <h2 className="text-lg font-semibold text-on-surface">
              Maintenance & Insurance
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
            <FormField label="Insurance Expiry">
              <input
                type="date"
                value={insuranceExpiry}
                onChange={(e) => setInsuranceExpiry(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Last Maintenance Date">
              <input
                type="date"
                value={lastMaintenanceDate}
                onChange={(e) => setLastMaintenanceDate(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Next Maintenance Date">
              <input
                type="date"
                value={nextMaintenanceDate}
                onChange={(e) => setNextMaintenanceDate(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
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
                Delete Unit
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/units')}
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
                  {isEdit ? 'Update Unit' : 'Save Unit'}
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
        title="Delete Unit"
        message="This will permanently delete this unit. Jobs associated with this unit will not be affected."
        isLoading={deleteUnit.isPending}
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
