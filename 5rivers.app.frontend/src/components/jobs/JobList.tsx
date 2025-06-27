import { useEffect, useState } from "react";
import { jobApi, dispatcherApi, unitApi } from "@/src/lib/api";
import { parseLocalDate } from "@/src/lib/utils";
import { Button } from "../ui/button";
import {
  Pencil,
  Trash2,
  Plus,
  CheckCircle,
  Book,
  Search,
  Loader2,
  Eye,
} from "lucide-react";
import { ConfirmDialog } from "../common/Modal";
import { toast } from "sonner";
import { DateRangePicker } from "../common/DateRangePicker";
import { Job as EntityJob } from "@/src/types/entities";

interface Job extends Omit<EntityJob, 'jobTypeId'> {
  jobTypeId?: string;
  jobType?: { title: string };
  driver?: { name: string };
  unit?: { name: string; unitId: string };
  dispatcher?: { name: string; dispatcherId: string };
  paymentReceived?: boolean;
}

interface Dispatcher {
  dispatcherId: string;
  name: string;
}

interface Unit {
  unitId: string;
  name: string;
}

interface JobListProps {
  onView: (job: Job) => void;
  onEdit: (job: Job) => void;
  onCreate: () => void;
  refresh: number;
}

export function JobList({
  onView,
  onEdit,
  onCreate,
  refresh,
}: JobListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]); // For search
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
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
  const [dispatcherId, setDispatcherId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({ startDate: null, endDate: null });

  // Load initial data
  const loadJobs = async (page = 1, isLoadMore = false) => {
    try {
      if (!isLoadMore) setLoading(true);
      else setLoadingMore(true);

      const [jobsResponse, dispatchersData, unitsData] = await Promise.all([
        jobApi.fetchAll({
          page,
          pageSize: PAGE_SIZE,
          dispatcherId: dispatcherId || undefined,
          unitId: unitId || undefined,
        }),
        page === 1 ? dispatcherApi.fetchAll() : Promise.resolve(dispatchers),
        page === 1 ? unitApi.fetchAll() : Promise.resolve(units),
      ]);

      if (page === 1) {
        setJobs(jobsResponse.data);
        if (dispatchersData) {
          const dispatchersArray = dispatchersData.data || dispatchersData;
          setDispatchers(dispatchersArray);
        }
        if (unitsData) {
          const unitsArray = unitsData.data || unitsData;
          setUnits(unitsArray);
        }
      } else {
        setJobs((prev) => [...prev, ...jobsResponse.data]);
      }

      setCurrentPage(jobsResponse.page);
      setTotalPages(jobsResponse.totalPages);
      setHasMore(jobsResponse.page < jobsResponse.totalPages);

      // Load all jobs for search if we don't have them yet
      if (allJobs.length === 0 && !searchQuery) {
        const allJobsResponse = await jobApi.fetchAll({
          pageSize: 10000, // Large number to get all
        });
        setAllJobs(allJobsResponse.data);
      }
    } catch (err) {
      setError("Failed to load jobs");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadJobs(1, false);
  }, [refresh, dispatcherId, unitId]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        // Filter from all jobs for immediate search results
        let filtered = allJobs.filter((job) =>
          job.jobType?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.driver?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.unit?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.dispatcher?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Apply additional filters
        if (dispatcherId) {
          filtered = filtered.filter((job) => job.dispatcher?.dispatcherId === dispatcherId);
        }
        if (unitId) {
          filtered = filtered.filter((job) => job.unit?.unitId === unitId);
        }
        if (dateRange.startDate || dateRange.endDate) {
          filtered = filtered.filter((job) => {
            if (dateRange.startDate && parseLocalDate(job.jobDate) < dateRange.startDate)
              return false;
            if (dateRange.endDate && parseLocalDate(job.jobDate) > dateRange.endDate)
              return false;
            return true;
          });
        }

        setJobs(filtered);
        setHasMore(false);
      } else {
        // Reset to paginated results
        loadJobs(1, false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, allJobs, dispatcherId, unitId, dateRange]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !searchQuery) {
      loadJobs(currentPage + 1, true);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await jobApi.delete(id);
      setJobs(jobs.filter((job) => job.jobId !== id));
      toast.success("Job deleted successfully");
    } catch {
      setError("Failed to delete job");
      toast.error("Failed to delete job");
    }
  };

  const handleTogglePayment = async (job: Job) => {
    try {
      const updated = await jobApi.togglePaymentReceived(job.jobId);
      setJobs((prev) =>
        prev.map((j) => (j.jobId === job.jobId ? { ...j, ...updated } : j))
      );
      toast.success(
        updated.paymentReceived ? "Marked as paid" : "Marked as unpaid"
      );
    } catch {
      toast.error("Failed to toggle payment status");
    }
  };

  // Filtering logic
  const filteredJobs = jobs.filter((job) => {
    if (dispatcherId && job.dispatcher?.dispatcherId !== dispatcherId)
      return false;
    if (unitId && job.unit?.unitId !== unitId) return false;
    if (dateRange.startDate && parseLocalDate(job.jobDate) < dateRange.startDate)
      return false;
    if (dateRange.endDate && parseLocalDate(job.jobDate) > dateRange.endDate)
      return false;
    return true;
  });

  // Grouping logic: by month in reverse chronological order
  function groupJobsByMonth(jobs: Job[]) {
    const monthGroups: Record<string, Job[]> = {};
    
    jobs.forEach((job) => {
      const date = job.jobDate ? parseLocalDate(job.jobDate) : null;
      if (!date) return;
      
      // Format as "Month YYYY" (e.g., "July 2025")
      const monthYear = date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      if (!monthGroups[monthYear]) monthGroups[monthYear] = [];
      monthGroups[monthYear].push(job);
    });

    // Sort months in reverse chronological order
    const sortedMonths = Object.keys(monthGroups).sort((a, b) => {
      const dateA = new Date(a + " 1");
      const dateB = new Date(b + " 1");
      return dateB.getTime() - dateA.getTime();
    });

    return sortedMonths.map((month) => ({
      month,
      jobs: monthGroups[month].sort((a, b) => {
        // Sort jobs within month by date (newest first)
        const dateA = parseLocalDate(a.jobDate);
        const dateB = parseLocalDate(b.jobDate);
        return dateB.getTime() - dateA.getTime();
      }),
    }));
  }

  const groupedJobs = groupJobsByMonth(filteredJobs);

  const formatCurrency = (value?: number | string) => {
    if (value === undefined || value === null) return "—";
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return "—";
    return `$${numValue.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading jobs...</div>
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
            value={dispatcherId}
            onChange={(e) => setDispatcherId(e.target.value)}
          >
            <option value="">All Dispatchers</option>
            {dispatchers.map((d) => (
              <option key={d.dispatcherId} value={d.dispatcherId}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            className="border rounded px-2 py-1 min-w-[120px]"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
          >
            <option value="">All Units</option>
            {units.map((u) => (
              <option key={u.unitId} value={u.unitId}>
                {u.name}
              </option>
            ))}
          </select>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <div className="flex-1" />
          <Button
            onClick={onCreate}
            className="gap-1 whitespace-nowrap self-stretch"
          >
            <Plus className="h-4 w-4" /> Add Job
          </Button>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job type, driver, unit, or dispatcher"
              className="border rounded px-3 py-2 w-full pr-10"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {groupedJobs.length === 0 && (
        <div className="text-muted-foreground py-8 text-center">
          No jobs found.
        </div>
      )}

      {groupedJobs.map(({ month, jobs }) => (
        <div key={month} className="mb-6">
          <div className="font-semibold text-lg mb-3 text-foreground border-b pb-1">
            {month}
          </div>
          <div className="space-y-1">
            {jobs.map((job) => (
              <div
                key={job.jobId}
                className="py-3 px-4 rounded-lg flex items-center justify-between hover:bg-muted cursor-pointer border border-border"
                onClick={() => onView(job)}
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* Status indicator */}
                  <div className="flex items-center gap-2">
                    {job.invoiceId ? (
                      <Book className="h-5 w-5 text-green-500" title="Invoiced" />
                    ) : (
                      <Book className="h-5 w-5 text-gray-400" title="Not Invoiced" />
                    )}
                    {job.paymentReceived && (
                      <CheckCircle className="h-5 w-5 text-green-600" title="Payment Received" />
                    )}
                  </div>
                  
                  {/* Job info */}
                  <div className="flex-1">
                    <div className="font-medium">
                      {parseLocalDate(job.jobDate).toLocaleDateString()} - {job.dispatcher?.name || "No Dispatcher"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {job.jobType?.title || "No Job Type"} • {job.unit?.name || "No Unit"} • {job.driver?.name || "No Driver"}
                    </div>
                  </div>
                  
                  {/* Amount */}
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(job.jobGrossAmount)}</div>
                    <div className="text-sm text-muted-foreground">{job.status || "Pending"}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  <Button
                    size="icon"
                    variant={job.paymentReceived ? "default" : "ghost"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePayment(job);
                    }}
                    title={job.paymentReceived ? "Payment received" : "Mark as paid"}
                    className={job.paymentReceived ? "text-green-600 bg-green-50 hover:bg-green-100" : ""}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(job);
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
                      setConfirmDelete(job.jobId);
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
          {jobs.length} result{jobs.length !== 1 ? "s" : ""} found
        </div>
      )}

      <ConfirmDialog
        title="Delete Job"
        message="Are you sure you want to delete this job? This action cannot be undone."
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
