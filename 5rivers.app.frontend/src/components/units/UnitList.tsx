"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";
import { unitApi } from "@/src/lib/api";
import { toast } from "sonner";
import { DataTable, Column } from "../../components/common/DataTable";
import { ConfirmDialog } from "../../components/common/Modal";

interface Unit {
  unitId: string;
  name: string;
  plateNumber?: string;
  vin?: string;
  color?: string;
  description?: string;
  jobsCount?: number;
}

interface UnitListProps {
  onSelect: (unit: Unit) => void;
  onEdit: (unit: Unit) => void;
  onCreate: () => void;
  refresh: number;
}

export function UnitList({
  onSelect,
  onEdit,
  onCreate,
  refresh,
}: UnitListProps) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    unitApi
      .fetchAll()
      .then((data) => {
        setUnits(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load units");
        setLoading(false);
      });
  }, [refresh]);

  const handleDelete = async (id: string) => {
    try {
      await unitApi.delete(id);
      setUnits(units.filter((unit) => unit.unitId !== id));
      toast.success("Unit deleted successfully");
    } catch {
      setError("Failed to delete unit");
      toast.error("Failed to delete unit");
    }
  };

  const columns: Column<Unit>[] = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Plate",
      accessorKey: "plateNumber",
      cell: (row) => row.plateNumber || "—",
    },
    {
      header: "VIN",
      accessorKey: "vin",
      cell: (row) => (
        <span className="font-mono text-xs">{row.vin || "—"}</span>
      ),
    },
    {
      header: "Color",
      accessorKey: "color",
      cell: (row) => row.color || "—",
    },
    {
      header: "Jobs Count",
      accessorKey: "jobsCount",
      cell: (row) => row.jobsCount || 0,
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
            onClick={() => setConfirmDelete(row.unitId)}
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
        <h2 className="text-lg font-medium">All Units</h2>
        <Button onClick={onCreate} className="gap-1">
          <Plus className="h-4 w-4" /> Add Unit
        </Button>
      </div>

      <DataTable
        data={units}
        columns={columns}
        loading={loading}
        error={error}
        searchField="name"
        searchPlaceholder="Search by name, plate, or VIN..."
        emptyTitle="No Units"
        emptyDescription="There are no units to display. Add a new unit to get started."
      />

      <ConfirmDialog
        title="Delete Unit"
        message="Are you sure you want to delete this unit? This action cannot be undone."
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
