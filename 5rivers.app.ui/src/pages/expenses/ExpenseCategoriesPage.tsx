import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  useExpenseCategoriesList,
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
  useDeleteExpenseCategory,
} from '@/hooks/useExpenses';
import { useToast } from '@/context/toast';
import { ConfirmModal } from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import type { ExpenseCategory } from '@/types';

// ============================================
// Expense Categories — Inline management
// ============================================

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
];

export function ExpenseCategoriesPage() {
  const { addToast } = useToast();
  const { data, isLoading } = useExpenseCategoriesList({ limit: 100 });
  const createCategory = useCreateExpenseCategory();
  const updateCategory = useUpdateExpenseCategory();
  const deleteCategory = useDeleteExpenseCategory();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null);

  function resetForm() {
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0]);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(cat: ExpenseCategory) {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description ?? '');
    setColor(cat.color ?? PRESET_COLORS[0]);
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      addToast('Name is required', 'error');
      return;
    }
    try {
      if (editingId) {
        await updateCategory.mutateAsync({
          id: editingId,
          data: { name, description: description || null, color },
        });
        addToast('Category updated', 'success');
      } else {
        await createCategory.mutateAsync({ name, description: description || null, color });
        addToast('Category created', 'success');
      }
      resetForm();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    }
  }

  const handleToggleActive = useCallback(
    async (cat: ExpenseCategory) => {
      try {
        await updateCategory.mutateAsync({
          id: cat.id,
          data: { isActive: !cat.isActive },
        });
        addToast(`Category ${cat.isActive ? 'deactivated' : 'activated'}`, 'success');
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Failed to update', 'error');
      }
    },
    [updateCategory, addToast],
  );

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteCategory.mutate(deleteTarget.id, {
      onSuccess: () => {
        addToast('Category deleted', 'success');
        setDeleteTarget(null);
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }, [deleteTarget, deleteCategory, addToast]);

  if (isLoading) return <PageSpinner />;

  const categories = data?.data ?? [];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          <Link to="/expenses" className="hover:text-primary transition-colors">
            Expenses
          </Link>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <span className="text-primary">Categories</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-on-surface">
              Expense Categories
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Organize your expenses by category for better tracking.
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="gradient-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Category
            </button>
          )}
        </div>
      </header>

      {/* Inline Form */}
      {showForm && (
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/15 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            {editingId ? 'Edit Category' : 'New Category'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fuel, Insurance, Maintenance"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={createCategory.isPending || updateCategory.isPending}
              className="gradient-primary text-white px-5 py-2 rounded-lg font-semibold text-sm shadow-sm"
            >
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-3">
        {categories.length === 0 && !showForm && (
          <div className="text-center py-16 text-slate-400">
            <span className="material-symbols-outlined text-5xl mb-3 block">category</span>
            <p className="text-lg font-medium">No categories yet</p>
            <p className="text-sm mt-1">Create categories to organize your expenses.</p>
          </div>
        )}
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={`bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4 flex items-center gap-4 transition-all ${
              !cat.isActive ? 'opacity-50' : ''
            }`}
          >
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: cat.color ?? '#94a3b8' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{cat.name}</p>
              {cat.description && (
                <p className="text-xs text-slate-400 truncate">{cat.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleToggleActive(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  cat.isActive
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {cat.isActive ? 'Active' : 'Inactive'}
              </button>
              <button
                onClick={() => startEdit(cat)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
              <button
                onClick={() => setDeleteTarget(cat)}
                className="p-1.5 text-slate-400 hover:text-error hover:bg-error-container/20 rounded transition-all"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Delete "${deleteTarget?.name}"? Expenses in this category will become uncategorized.`}
        isLoading={deleteCategory.isPending}
      />
    </div>
  );
}
