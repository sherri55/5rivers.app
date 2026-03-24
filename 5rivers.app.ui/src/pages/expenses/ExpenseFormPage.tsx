import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useExpense,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useExpenseCategoriesList,
} from '@/hooks/useExpenses';
import { useToast } from '@/context/toast';
import { PageSpinner, ButtonSpinner } from '@/components/ui/Spinner';
import { ConfirmModal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import type { ExpensePaymentMethod, RecurringFrequency } from '@/types';

// ============================================
// Expense Form — Create & Edit
// ============================================

export function ExpenseFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: existingExpense, isLoading: expenseLoading } = useExpense(id ?? '');
  const categories = useExpenseCategoriesList({ limit: 100 });

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }),
  );
  const [categoryId, setCategoryId] = useState('');
  const [vendor, setVendor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('OTHER');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency | ''>('');

  useEffect(() => {
    if (!existingExpense) return;
    setDescription(existingExpense.description);
    setAmount(existingExpense.amount?.toString() ?? '');
    setExpenseDate(existingExpense.expenseDate);
    setCategoryId(existingExpense.categoryId ?? '');
    setVendor(existingExpense.vendor ?? '');
    setPaymentMethod(existingExpense.paymentMethod);
    setReference(existingExpense.reference ?? '');
    setNotes(existingExpense.notes ?? '');
    setRecurring(existingExpense.recurring);
    setRecurringFrequency(existingExpense.recurringFrequency ?? '');
  }, [existingExpense]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const payload = {
      description,
      amount: parseFloat(amount) || 0,
      expenseDate,
      categoryId: categoryId || null,
      vendor: vendor || null,
      paymentMethod,
      reference: reference || null,
      notes: notes || null,
      recurring,
      recurringFrequency: recurring && recurringFrequency ? recurringFrequency : null,
    };

    try {
      if (isEdit) {
        await updateExpense.mutateAsync({ id: id!, data: payload });
        addToast('Expense updated successfully', 'success');
      } else {
        await createExpense.mutateAsync(payload);
        addToast('Expense created successfully', 'success');
      }
      navigate('/expenses');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to save expense',
        'error',
      );
    }
  }

  function handleDeleteConfirm() {
    if (!id) return;
    deleteExpense.mutate(id, {
      onSuccess: () => {
        addToast('Expense deleted', 'success');
        navigate('/expenses');
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }

  if (isEdit && expenseLoading) return <PageSpinner />;

  const isSaving = createExpense.isPending || updateExpense.isPending;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          <span>Financial Management</span>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <span className="text-primary">
            {isEdit ? 'Edit Expense' : 'Add Expense'}
          </span>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight text-on-surface">
          {isEdit ? 'Edit Expense' : 'Add Expense'}
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          {isEdit
            ? 'Update expense details.'
            : 'Record a new business expense.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Expense Details */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-red-500 pl-4">
            <h2 className="text-lg font-semibold text-on-surface">
              Expense Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="md:col-span-2">
              <FormField label="Description" required>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="What was this expense for?"
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                />
              </FormField>
            </div>

            <FormField label="Amount" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 pl-8 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </FormField>

            <FormField label="Date" required>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Category">
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                icon="category"
              >
                <option value="">No Category</option>
                {(categories.data?.data ?? []).filter(c => c.isActive).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Vendor">
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Company or person paid"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <FormField label="Payment Method">
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
                icon="payment"
              >
                <option value="CASH">Cash</option>
                <option value="CHECK">Check</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="E_TRANSFER">e-Transfer</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="OTHER">Other</option>
              </Select>
            </FormField>

            <FormField label="Reference / Receipt #">
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Receipt or transaction reference"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Notes">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional details..."
                  rows={3}
                  className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all resize-none"
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Section 2: Recurring */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline-variant/15">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-violet-500 pl-4">
            <h2 className="text-lg font-semibold text-on-surface">
              Recurring Expense
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={recurring}
                  onChange={() => setRecurring(!recurring)}
                  className="sr-only peer"
                />
                <span className={`material-symbols-outlined text-[22px] transition-colors ${recurring ? 'filled text-violet-500' : 'text-slate-300 group-hover:text-slate-400'}`}>
                  {recurring ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span className={`text-sm font-medium transition-colors ${recurring ? 'text-violet-700' : 'text-slate-500 group-hover:text-slate-700'}`}>
                  This is a recurring expense
                </span>
              </label>
            </div>

            {recurring && (
              <FormField label="Frequency">
                <Select
                  value={recurringFrequency}
                  onChange={(e) => setRecurringFrequency(e.target.value as RecurringFrequency)}
                  icon="repeat"
                >
                  <option value="">Select frequency</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Bi-weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </Select>
              </FormField>
            )}
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
                Delete Expense
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/expenses')}
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
                  {isEdit ? 'Update Expense' : 'Save Expense'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense"
        message="This will permanently delete this expense record."
        isLoading={deleteExpense.isPending}
      />
    </div>
  );
}

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
