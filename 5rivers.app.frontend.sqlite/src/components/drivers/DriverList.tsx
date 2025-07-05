"use client";

import { useState, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import { Eye, Pencil, Trash2, Plus, Search, Loader2 } from "lucide-react";
import { driverApi } from "@/src/lib/api";
import { toast } from "sonner";
import { ConfirmDialog } from "@/src/components/common/Modal";

interface Driver {
  driverId: string;
  name: string;
  email: string;
  phone?: string;
  hourlyRate?: number;
  description?: string;
  activeJobsCount?: number;
}

interface DriverListProps {
  onView: (driver: Driver) => void;
  onEdit: (driver: Driver) => void;
  onCreate: () => void;
  refresh: number;
}

export function DriverList({
  onView,
  onEdit,
  onCreate,
  refresh,
}: DriverListProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]); // For search
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
  const loadDrivers = async (page = 1, isLoadMore = false) => {
    try {
      if (!isLoadMore) setLoading(true);
      else setLoadingMore(true);

      const driversResponse = await driverApi.fetchAll({
        page,
        pageSize: PAGE_SIZE,
      });

      if (page === 1) {
        setDrivers(driversResponse.data);
      } else {
        setDrivers((prev) => [...prev, ...driversResponse.data]);
      }

      setCurrentPage(driversResponse.page);
      setTotalPages(driversResponse.totalPages);
      setHasMore(driversResponse.page < driversResponse.totalPages);

      // Load all drivers for search if we don't have them yet
      if (allDrivers.length === 0 && !searchQuery) {
        const allDriversResponse = await driverApi.fetchAll({
          pageSize: 10000, // Large number to get all
        });
        setAllDrivers(allDriversResponse.data);
      }
    } catch (err) {
      setError("Failed to load drivers");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadDrivers(1, false);
  }, [refresh]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        // Filter from all drivers for immediate search results
        const filtered = allDrivers.filter((driver) =>
          driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          driver.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          driver.phone?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setDrivers(filtered);
        setHasMore(false);
      } else {
        // Reset to paginated results
        loadDrivers(1, false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, allDrivers]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !searchQuery) {
      loadDrivers(currentPage + 1, true);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await driverApi.delete(id);
      setDrivers(drivers.filter((d) => d.driverId !== id));
      toast.success("Driver deleted successfully");
    } catch {
      setError("Failed to delete driver");
      toast.error("Failed to delete driver");
    }
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return "—";
    return `$${value.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading drivers...</div>
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
              placeholder="Search drivers..."
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
            <Plus className="h-4 w-4" /> Add Driver
          </Button>
        </div>
      </div>

      {drivers.length === 0 && (
        <div className="text-muted-foreground py-8 text-center">
          {searchQuery ? "No drivers found matching your search." : "No drivers found."}
        </div>
      )}

      <div className="space-y-1">
        {drivers.map((driver) => (
          <div
            key={driver.driverId}
            className="py-3 px-4 rounded-lg flex items-center justify-between hover:bg-muted cursor-pointer border border-border"
            onClick={() => onView(driver)}
          >
            <div className="flex items-center gap-3 flex-1">
              {/* Driver info */}
              <div className="flex-1">
                <div className="font-medium">
                  {driver.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {driver.email} • {formatCurrency(driver.hourlyRate)}/hr
                  {driver.phone && ` • ${driver.phone}`}
                </div>
              </div>

              {/* Stats */}
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Active Jobs</div>
                <div className="font-medium">{driver.activeJobsCount || 0}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 ml-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(driver);
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
                  onEdit(driver);
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
                  setConfirmDelete(driver.driverId);
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
          {drivers.length} result{drivers.length !== 1 ? 's' : ''} found
        </div>
      )}

      <ConfirmDialog
        title="Delete Driver"
        message="Are you sure you want to delete this driver? This action cannot be undone."
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
