import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompaniesList, useDeleteCompany } from '@/hooks/useCompanies';
import { useToast } from '@/context/toast';
import { getInitials } from '@/lib/format';
import { ConfirmModal } from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ColumnToggle } from '@/components/ui/ColumnToggle';
import { useColumnVisibility, type ColumnDef } from '@/hooks/useColumnVisibility';
import { ExportPdfButton } from '@/components/ui/ExportPdfButton';
import { pdfApi } from '@/api/endpoints';
import type { Company, PaginationParams } from '@/types';

// ============================================
// Companies List — card grid layout
// ============================================

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'industry', label: 'Industry' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'location', label: 'Location' },
  { key: 'actions', label: '', alwaysVisible: true },
];

const CARD_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-indigo-100 text-indigo-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
];

function getCardColor(name: string) {
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CARD_COLORS[sum % CARD_COLORS.length];
}

export function CompaniesListPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [page, setPage] = useState(1);
  const [searchFilter, setSearchFilter] = useState('');

  const params = useMemo<PaginationParams>(() => {
    const p: PaginationParams = { page, limit: 20, sortBy: 'name', order: 'asc' };
    if (searchFilter) p.filter_search = searchFilter;
    return p;
  }, [page, searchFilter]);

  const { data, isLoading } = useCompaniesList(params);

  const { visibleKeys, isVisible, toggleColumn, toggleableColumns } =
    useColumnVisibility('companies', COLUMN_DEFS);

  // Delete
  const deleteCompany = useDeleteCompany();
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    deleteCompany.mutate(deleteTarget.id, {
      onSuccess: () => {
        addToast('Company deleted successfully', 'success');
        setDeleteTarget(null);
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }

  const totalPages = data?.totalPages ?? 1;

  return (
    <div>
      {/* Page header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">
            Client Management
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">
            Companies
          </h1>
        </div>
        <Link
          to="/companies/new"
          className="gradient-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Company
        </Link>
      </header>

      {/* Search */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm ghost-border p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[220px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            search
          </span>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-1 focus:ring-primary"
            placeholder="Search companies..."
          />
        </div>

        <ColumnToggle
          columns={toggleableColumns}
          isVisible={isVisible}
          onToggle={toggleColumn}
        />

        <ExportPdfButton onExport={() => pdfApi.exportCompanies(params)} />

        {searchFilter && (
          <button
            onClick={() => {
              setSearchFilter('');
              setPage(1);
            }}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            Clear
          </button>
        )}
      </section>

      {/* Content */}
      {isLoading ? (
        <PageSpinner />
      ) : !data?.data.length ? (
        <EmptyState
          icon="business"
          title="No companies found"
          description="Add your first company to start managing jobs."
        />
      ) : (
        <>
          {/* Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {data.data.map((company) => (
              <div
                key={company.id}
                onClick={() => navigate(`/companies/${company.id}/edit`)}
                className="bg-surface-container-lowest rounded-xl ghost-border p-6 cursor-pointer hover:shadow-lg hover:shadow-on-surface/5 transition-all group"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${getCardColor(company.name)}`}
                  >
                    {getInitials(company.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                      {company.name}
                    </h3>
                    {visibleKeys.has('industry') && company.industry && (
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-tight rounded-full mt-1">
                        {company.industry}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  {visibleKeys.has('email') && company.email && (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-slate-400">
                        mail
                      </span>
                      <span className="truncate">{company.email}</span>
                    </div>
                  )}
                  {visibleKeys.has('phone') && company.phone && (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-slate-400">
                        call
                      </span>
                      <span>{company.phone}</span>
                    </div>
                  )}
                  {visibleKeys.has('location') && company.location && (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-slate-400">
                        location_on
                      </span>
                      <span className="truncate">{company.location}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-base">
                      work
                    </span>
                    <span>Job Types</span>
                  </div>
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      to={`/companies/${company.id}/edit`}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">
                        edit
                      </span>
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(company)}
                      className="p-1.5 text-slate-400 hover:text-error hover:bg-error-container/20 rounded transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-slate-500">
                Showing {data.data.length} of {data.total} companies
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(0, 5)
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded text-xs font-bold ${
                        p === page
                          ? 'bg-primary text-on-primary'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Company"
        message={`Are you sure you want to delete ${deleteTarget?.name}? All job types under this company will also be deleted.`}
        isLoading={deleteCompany.isPending}
      />
    </div>
  );
}
