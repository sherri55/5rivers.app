"use client";

import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";
import { dispatcherApi } from "@/src/lib/api";
import { toast } from "sonner";
import { DataTable, Column } from "../../components/common/DataTable";
import { ConfirmDialog } from "../../components/common/Modal";

interface Dispatcher {
  dispatcherId: string;
  name: string;
  email: string;
  phone?: string;
  commissionPercentage?: number;
  jobsCount?: number;
  invoicesCount?: number;
}

interface DispatcherListProps {
  onSelect: (dispatcher: Dispatcher) => void;
  onEdit: (dispatcher: Dispatcher) => void;
  onCreate: () => void;
  refresh: number;
}

export function DispatcherList({
  onSelect,
  onEdit,
  onCreate,
  refresh,
}: DispatcherListProps) {
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    dispatcherApi
      .fetchAll()
      .then((data) => {
        setDispatchers(
          data.slice().sort((a, b) => a.name.localeCompare(b.name))
        );
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load dispatchers");
        setLoading(false);
      });
  }, [refresh]);

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

  const columns: Column<Dispatcher>[] = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Email",
      accessorKey: "email",
    },
    {
      header: "Commission %",
      accessorKey: "commissionPercentage",
      cell: (row) => formatCommission(row.commissionPercentage),
    },
    {
      header: "Jobs Count",
      accessorKey: "jobsCount",
      cell: (row) => row.jobsCount || 0,
    },
    {
      header: "Invoices",
      accessorKey: "invoicesCount",
      cell: (row) => row.invoicesCount || 0,
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
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row);
            }}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setConfirmDelete(row.dispatcherId)}
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
        <h2 className="text-lg font-medium">All Dispatchers</h2>
        <Button onClick={onCreate} className="gap-1">
          <Plus className="h-4 w-4" /> Add Dispatcher
        </Button>
      </div>

      <DataTable
        data={dispatchers}
        columns={columns}
        loading={loading}
        error={error}
        searchField="name"
        searchPlaceholder="Search by name..."
        emptyTitle="No Dispatchers"
        emptyDescription="There are no dispatchers to display. Add a new dispatcher to get started."
      />

      <ConfirmDialog
        title="Delete Dispatcher"
        message="Are you sure you want to delete this dispatcher? This action cannot be undone."
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
