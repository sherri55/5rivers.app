import { useEffect, useState } from "react";
import { jobTypeApi, companyApi } from "@/src/lib/api";
import { Company, JobType } from "@/src/types/entities";
import { Button } from "../ui/button";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import { ConfirmDialog } from "../common/Modal";
import { toast } from "sonner";

interface JobTypeListProps {
  onView: (jobType: JobType) => void;
  onEdit: (jobType: JobType) => void;
  onCreate: () => void;
  refresh: number;
}

export function JobTypeList({
  onView,
  onEdit,
  onCreate,
  refresh,
}: JobTypeListProps) {
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [allJobTypes, setAllJobTypes] = useState<JobType[]>([]); // For search
  const [companies, setCompanies] = useState<Company[]>([]);
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
  const [companyId, setCompanyId] = useState("");
  const [dispatchType, setDispatchType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Load initial data
  const loadJobTypes = async (page = 1, isLoadMore = false) => {
    try {
      if (!isLoadMore) setLoading(true);
      else setLoadingMore(true);

      const [jobTypesResponse, companiesData] = await Promise.all([
        jobTypeApi.fetchAll({
          page,
          pageSize: PAGE_SIZE,
          companyId: companyId || undefined,
          dispatchType: dispatchType || undefined,
        }),
        page === 1 ? companyApi.fetchAll({ pageSize: 10000 }) : Promise.resolve(companies),
      ]);

      if (page === 1) {
        setJobTypes(jobTypesResponse.data);
        if (companiesData) {
          const companiesArray = companiesData.data || companiesData;
          setCompanies(companiesArray);
        }
      } else {
        setJobTypes((prev) => [...prev, ...jobTypesResponse.data]);
      }

      setCurrentPage(jobTypesResponse.page);
      setTotalPages(jobTypesResponse.totalPages);
      setHasMore(jobTypesResponse.page < jobTypesResponse.totalPages);

      // Load all job types for search if we don't have them yet
      if (allJobTypes.length === 0 && !searchQuery) {
        const allJobTypesResponse = await jobTypeApi.fetchAll({
          pageSize: 10000, // Large number to get all
        });
        setAllJobTypes(allJobTypesResponse.data);
      }
    } catch (err) {
      setError("Failed to load job types");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadJobTypes(1, false);
  }, [refresh, companyId, dispatchType]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        // Filter from all job types for immediate search results
        let filtered = allJobTypes.filter((jobType) =>
          jobType.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          jobType.startLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          jobType.endLocation?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Apply additional filters
        if (companyId) {
          filtered = filtered.filter((jt) => jt.companyId === companyId);
        }
        if (dispatchType) {
          filtered = filtered.filter((jt) => jt.dispatchType === dispatchType);
        }

        setJobTypes(filtered);
        setHasMore(false);
      } else {
        // Reset to paginated results
        loadJobTypes(1, false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, allJobTypes, companyId, dispatchType]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !searchQuery) {
      loadJobTypes(currentPage + 1, true);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setJobTypes(jobTypes.filter((jt) => jt.jobTypeId !== id));
      await jobTypeApi.delete(id);
      toast.success("Job Type deleted successfully");
    } catch {
      toast.error("Failed to delete job type");
    }
  };

  const formatCurrency = (value?: number | string) => {
    if (value === undefined || value === null) return "—";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "—";
    return `$${numValue.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading job types...</div>
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
          <select
            className="border rounded px-2 py-1 min-w-[160px]"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.companyId} value={c.companyId}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="border rounded px-2 py-1 min-w-[160px]"
            value={dispatchType}
            onChange={(e) => setDispatchType(e.target.value)}
          >
            <option value="">All Dispatch Types</option>
            <option value="Hourly">Hourly</option>
            <option value="Tonnage">Tonnage</option>
            <option value="Load">Load</option>
            <option value="Fixed">Fixed</option>
          </select>
          <input
            className="border rounded px-2 py-1 min-w-[160px]"
            type="text"
            placeholder="Search Job Types"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex-1" />
          <Button
            onClick={onCreate}
            className="gap-1 whitespace-nowrap self-stretch"
          >
            <Plus className="h-4 w-4" /> Add Job Type
          </Button>
        </div>
      </div>

      {jobTypes.length === 0 && (
        <div className="text-muted-foreground py-8 text-center">
          No job types found.
        </div>
      )}

      {jobTypes.map((jt) => (
        <div
          key={jt.jobTypeId}
          className="py-3 px-4 rounded-lg flex items-center justify-between hover:bg-muted cursor-pointer border border-border"
          onClick={() => onView(jt)}
        >
          <div className="flex items-center gap-3 flex-1">
            {/* Job Type info */}
            <div className="flex-1">
              <div className="font-medium">{jt.title}</div>
              <div className="text-sm text-muted-foreground">
                {jt.dispatchType || "No Type"} •{" "}
                {jt.startLocation && jt.endLocation
                  ? `${jt.startLocation} to ${jt.endLocation}`
                  : jt.startLocation || jt.endLocation || "No Route"}
              </div>
            </div>

            {/* Rate */}
            <div className="text-right">
              <div className="font-medium">{formatCurrency(jt.rateOfJob)}</div>
              <div className="text-sm text-muted-foreground">
                {jt.dispatchType || "—"}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 ml-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(jt);
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
                setConfirmDelete(jt.jobTypeId!);
              }}
              className="text-destructive hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

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
          {jobTypes.length} result{jobTypes.length !== 1 ? "s" : ""} found
        </div>
      )}

      <ConfirmDialog
        title="Delete Job Type"
        message="Are you sure you want to delete this job type? This action cannot be undone."
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
