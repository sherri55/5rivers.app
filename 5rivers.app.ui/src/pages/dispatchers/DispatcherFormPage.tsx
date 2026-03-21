import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useDispatcher,
  useCreateDispatcher,
  useUpdateDispatcher,
  useDeleteDispatcher,
} from '@/hooks/useDispatchers';
import { useToast } from '@/context/toast';
import { PageSpinner, ButtonSpinner } from '@/components/ui/Spinner';
import { ConfirmModal } from '@/components/ui/Modal';

// ============================================
// Dispatcher Form — Create & Edit
// ============================================

export function DispatcherFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Mutations
  const createDispatcher = useCreateDispatcher();
  const updateDispatcher = useUpdateDispatcher();
  const deleteDispatcher = useDeleteDispatcher();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load existing dispatcher
  const { data: existingDispatcher, isLoading: dispatcherLoading } = useDispatcher(
    id ?? '',
  );

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('0');
  const [description, setDescription] = useState('');

  // Populate form
  useEffect(() => {
    if (!existingDispatcher) return;
    setName(existingDispatcher.name);
    setEmail(existingDispatcher.email ?? '');
    setPhone(existingDispatcher.phone ?? '');
    setCommissionPercent(existingDispatcher.commissionPercent?.toString() ?? '0');
    setDescription(existingDispatcher.description ?? '');
  }, [existingDispatcher]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const payload = {
      name,
      email: email || null,
      phone: phone || null,
      commissionPercent: parseFloat(commissionPercent) || 0,
      description: description || null,
    };

    try {
      if (isEdit) {
        await updateDispatcher.mutateAsync({ id: id!, data: payload });
        addToast('Dispatcher updated successfully', 'success');
      } else {
        await createDispatcher.mutateAsync(payload);
        addToast('Dispatcher created successfully', 'success');
      }
      navigate('/dispatchers');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to save dispatcher',
        'error',
      );
    }
  }

  function handleDeleteConfirm() {
    if (!id) return;
    deleteDispatcher.mutate(id, {
      onSuccess: () => {
        addToast('Dispatcher deleted', 'success');
        navigate('/dispatchers');
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }

  if (isEdit && dispatcherLoading) return <PageSpinner />;

  const isSaving = createDispatcher.isPending || updateDispatcher.isPending;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          <span>Dispatch Network</span>
          <span className="material-symbols-outlined text-[12px]">
            chevron_right
          </span>
          <span className="text-primary">
            {isEdit ? 'Edit Dispatcher' : 'Create Dispatcher'}
          </span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight text-on-surface">
          {isEdit ? 'Edit Dispatcher' : 'Create Dispatcher'}
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          {isEdit
            ? 'Update dispatcher information and commission settings.'
            : 'Add a new dispatcher to your network.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Dispatcher Information */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-primary pl-4">
            <h2 className="text-lg font-semibold text-on-surface">
              Dispatcher Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <FormField label="Name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter dispatcher name"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dispatcher@company.com"
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

            <FormField label="Commission (%)">
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  placeholder="0"
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 pr-8 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  %
                </span>
              </div>
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Description / Notes">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional notes about this dispatcher..."
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
              onClick={() => navigate('/dispatchers')}
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
                  {isEdit ? 'Update Dispatcher' : 'Save Dispatcher'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Delete confirmation */}
      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Dispatcher"
        message="This will permanently delete this dispatcher. Jobs assigned to this dispatcher will not be affected."
        isLoading={deleteDispatcher.isPending}
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
