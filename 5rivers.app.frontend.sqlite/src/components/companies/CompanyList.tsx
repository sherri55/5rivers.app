"use client";

import { useState, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import { Pencil, Trash2, Plus, Search, Loader2, Eye } from "lucide-react";
import { companyApi } from "@/src/lib/api";
import { toast } from "sonner";
import { ConfirmDialog } from "@/src/components/common/Modal";

interface Company {
  companyId: string;
  name: string;
  email: string;
  phone: string;
  description?: string;
  jobTypesCount: number;
}

interface CompanyListProps {
  onView: (company: Company) => void;
  onEdit: (company: Company) => void;
  onCreate: () => void;
  refresh: number;
}

export function CompanyList({
  onView,
  onEdit,
  onCreate,
  refresh,
}: CompanyListProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]); // For search
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 20;

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Load initial data
  const loadCompanies = async (page = 1, isLoadMore = false) => {
    try {
      if (!isLoadMore) setLoading(true);
      else setLoadingMore(true);

      const companiesResponse = await companyApi.fetchAll({
        page,
        pageSize: PAGE_SIZE,
      });

      if (page === 1) {
        setCompanies(companiesResponse.data);
      } else {
        setCompanies((prev) => [...prev, ...companiesResponse.data]);
      }

      setCurrentPage(companiesResponse.page);
      setTotalPages(companiesResponse.totalPages);
      setHasMore(companiesResponse.page < companiesResponse.totalPages);

      // Load all companies for search if we don't have them yet
      if (allCompanies.length === 0 && !searchQuery) {
        const allCompaniesResponse = await companyApi.fetchAll({
          pageSize: 10000, // Large number to get all
        });
        setAllCompanies(allCompaniesResponse.data);
      }
    } catch (err) {
      setError("Failed to load companies");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadCompanies(1, false);
  }, [refresh]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        // Filter from all companies for immediate search results
        const filtered = allCompanies.filter((company) =>
          company.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          company.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setCompanies(filtered);
        setHasMore(false);
      } else {
        // Reset to paginated results
        loadCompanies(1, false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, allCompanies]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !searchQuery) {
      loadCompanies(currentPage + 1, true);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await companyApi.delete(id);
      setCompanies(companies.filter((c) => c.companyId !== id));
      toast.success("Company deleted successfully");
    } catch {
      setError("Failed to delete company");
      toast.error("Failed to delete company");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading companies...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-wrap gap-2 items-end">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search companies..."
              className="pl-8 border rounded px-2 py-1 min-w-[200px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1" />
          <Button
            onClick={onCreate}
            className="gap-1 whitespace-nowrap self-stretch"
          >
            <Plus className="h-4 w-4" /> Add Company
          </Button>
        </div>
      </div>

      {companies.length === 0 && (
        <div className="text-muted-foreground py-8 text-center">
          {searchQuery ? "No companies found matching your search." : "No companies found."}
        </div>
      )}

      <div className="space-y-1">
        {companies.map((company) => (
          <div
            key={company.companyId}
            className="py-3 px-4 rounded-lg flex items-center justify-between hover:bg-muted cursor-pointer border border-border"
            onClick={() => onView(company)}
          >
            <div className="flex items-center gap-3 flex-1">
              {/* Company info */}
              <div className="flex-1">
                <div className="font-medium">{company.name}</div>
                <div className="text-sm text-muted-foreground">
                  {company.email} {company.phone && ` • ${company.phone}`}
                  {company.description && ` • ${company.description}`}
                </div>
              </div>

              {/* Stats */}
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Job Types</div>
                <div className="font-medium">{company.jobTypesCount || 0}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 ml-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(company);
                }}
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(company);
                }}
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(company.companyId);
                }}
                className="text-destructive hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && !searchQuery && (
        <div className="flex justify-center mt-6">
          <Button
            onClick={handleLoadMore}
            disabled={loadingMore}
            variant="outline"
            className="gap-2"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>Load More ({(totalPages - currentPage) * PAGE_SIZE}+ remaining)</>
            )}
          </Button>
        </div>
      )}

      {/* Search result count */}
      {searchQuery && (
        <div className="text-center text-sm text-muted-foreground mt-4">
          {companies.length} result{companies.length !== 1 ? "s" : ""} found
        </div>
      )}

      <ConfirmDialog
        title="Delete Company"
        message="Are you sure you want to delete this company? This action cannot be undone."
        isOpen={!!confirmDelete}
        onConfirm={() => {
          if (confirmDelete) handleDelete(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
