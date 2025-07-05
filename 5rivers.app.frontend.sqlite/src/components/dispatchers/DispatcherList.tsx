"use client";

import { useState, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import { Eye, Pencil, Trash2, Plus, Search, Loader2 } from "lucide-react";
import { dispatcherApi } from "@/src/lib/api";
import { toast } from "sonner";
import { ConfirmDialog } from "@/src/components/common/Modal";

interface Dispatcher {
  dispatcherId: string;
  name: string;
  email: string;
  phone?: string;
  commissionPercent?: number;
  jobsCount?: number;
  invoicesCount?: number;
}

interface DispatcherListProps {
  onView: (dispatcher: Dispatcher) => void;
  onEdit: (dispatcher: Dispatcher) => void;
  onCreate: () => void;
  refresh: number;
}

export function DispatcherList({
  onView,
  onEdit,
  onCreate,
  refresh,
}: DispatcherListProps) {
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [allDispatchers, setAllDispatchers] = useState<Dispatcher[]>([]); // For search
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
  const loadDispatchers = async (page = 1, isLoadMore = false) => {
    try {
      if (!isLoadMore) setLoading(true);
      else setLoadingMore(true);

      const dispatchersResponse = await dispatcherApi.fetchAll({
        page,
        pageSize: PAGE_SIZE,
      });

      if (page === 1) {
        setDispatchers(dispatchersResponse.data);
      } else {
        setDispatchers((prev) => [...prev, ...dispatchersResponse.data]);
      }

      setCurrentPage(dispatchersResponse.page);
      setTotalPages(dispatchersResponse.totalPages);
      setHasMore(dispatchersResponse.page < dispatchersResponse.totalPages);

      // Load all dispatchers for search if we don't have them yet
      if (allDispatchers.length === 0 && !searchQuery) {
        const allDispatchersResponse = await dispatcherApi.fetchAll({
          pageSize: 10000, // Large number to get all
        });
        setAllDispatchers(allDispatchersResponse.data);
      }
    } catch (err) {
      setError("Failed to load dispatchers");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadDispatchers(1, false);
  }, [refresh]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        // Filter from all dispatchers for immediate search results
        const filtered = allDispatchers.filter(
          (dispatcher) =>
            dispatcher.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dispatcher.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setDispatchers(filtered);
        setHasMore(false);
      } else {
        // Reset to paginated results
        loadDispatchers(1, false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, allDispatchers]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !searchQuery) {
      loadDispatchers(currentPage + 1, true);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatcherApi.delete(id);
      setDispatchers(dispatchers.filter((d) => d.dispatcherId !== id));
      toast.success("Dispatcher deleted successfully");
    } catch {
      setError("Failed to delete dispatcher");
      toast.error("Failed to delete dispatcher");
    }
  };

  const formatCommission = (value?: number) => {
    if (value === undefined || value === null) return "—";
    return `${value}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dispatchers...</div>
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
              placeholder="Search dispatchers..."
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
            <Plus className="h-4 w-4" /> Add Dispatcher
          </Button>
        </div>
      </div>

      {dispatchers.length === 0 && (
        <div className="text-muted-foreground py-8 text-center">
          {searchQuery
            ? "No dispatchers found matching your search."
            : "No dispatchers found."}
        </div>
      )}

      <div className="space-y-1">
        {dispatchers.map((dispatcher) => (
          <div
            key={dispatcher.dispatcherId}
            className="py-3 px-4 rounded-lg flex items-center justify-between hover:bg-muted cursor-pointer border border-border"
            onClick={() => onView(dispatcher)}
          >
            <div className="flex items-center gap-3 flex-1">
              {/* Dispatcher info */}
              <div className="flex-1">
                <div className="font-medium">{dispatcher.name}</div>
                <div className="text-sm text-muted-foreground">
                  {dispatcher.email} •{" "}
                  {formatCommission(dispatcher.commissionPercent)} commission
                  {dispatcher.phone && ` • ${dispatcher.phone}`}
                </div>
              </div>

              {/* Stats */}
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  Jobs / Invoices
                </div>
                <div className="font-medium">
                  {dispatcher.jobsCount || 0} / {dispatcher.invoicesCount || 0}
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
                  onView(dispatcher);
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
                  onEdit(dispatcher);
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
                  setConfirmDelete(dispatcher.dispatcherId);
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
          {dispatchers.length} result{dispatchers.length !== 1 ? "s" : ""} found
        </div>
      )}

      <ConfirmDialog
        title="Delete Dispatcher"
        message="Are you sure you want to delete this dispatcher? This action cannot be undone."
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
