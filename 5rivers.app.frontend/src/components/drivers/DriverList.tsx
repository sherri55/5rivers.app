"use client";

import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";
import { driverApi } from "@/src/lib/api";
import { toast } from "sonner";
import { DataTable, Column } from "../../components/common/DataTable";
import { ConfirmDialog } from "../../components/common/Modal";

interface Driver {
  driverId: string;
  name: string;
  email: string;
  phone?: string;
  hourlyRate?: number;
  activeJobsCount?: number;
}

interface DriverListProps {
  onSelect: (driver: Driver) => void;
  onEdit: (driver: Driver) => void;
  onCreate: () => void;
  refresh: number;
}

export function DriverList({
  onSelect,
  onEdit,
  onCreate,
  refresh,
}: DriverListProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    driverApi
      .fetchAll()
      .then((data) => {
        setDrivers(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load drivers");
        setLoading(false);
      });
  }, [refresh]);

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

  const columns: Column<Driver>[] = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Email",
      accessorKey: "email",
    },
    {
      header: "Phone",
      accessorKey: "phone",
      cell: (row) => row.phone || "—",
    },
    {
      header: "Hourly Rate",
      accessorKey: "hourlyRate",
      cell: (row) => formatCurrency(row.hourlyRate),
    },
    {
      header: "Active Jobs",
      accessorKey: "activeJobsCount",
      cell: (row) => row.activeJobsCount || 0,
    },
    {
      header: "Actions",
      accessorKey: (row) => row,
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onSelect(row)}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit(row)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setConfirmDelete(row.driverId)}
            className="text-destructive hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-medium">All Drivers</h2>
        <Button onClick={onCreate} className="gap-1">
          <Plus className="h-4 w-4" /> Add Driver
        </Button>
      </div>

      <DataTable
        data={drivers}
        columns={columns}
        loading={loading}
        error={error}
        searchField="name"
        searchPlaceholder="Search by name..."
        emptyTitle="No Drivers"
        emptyDescription="There are no drivers to display. Add a new driver to get started."
      />

      <ConfirmDialog
        title="Delete Driver"
        message="Are you sure you want to delete this driver? This action cannot be undone."
        isOpen={!!confirmDelete}
        onConfirm={() => {
          if (confirmDelete) handleDelete(confirmDelete);
        }}
        onCancel={() => setConfirmDelete(null)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
