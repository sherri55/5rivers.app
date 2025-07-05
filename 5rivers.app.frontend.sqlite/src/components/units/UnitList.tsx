"use client";

import { useEffect, useState } from "react";
import { unitApi } from "@/src/lib/api";
import { Unit } from "@/src/types/entities";
import { Button } from "../ui/button";
import { Pencil, Trash2, Plus, Truck } from "lucide-react";
import { ConfirmDialog } from "../common/Modal";
import { toast } from "sonner";

interface UnitListProps {
  onView: (unit: Unit) => void;
  onEdit: (unit: Unit) => void;
  onCreate: () => void;
  refresh: number;
}

export function UnitList({
  onView,
  onEdit,
  onCreate,
  refresh,
}: UnitListProps) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    unitApi
      .fetchAll({ pageSize: 10000 })
      .then((response) => {
        // Handle paginated response format
        const units = response.data || response; // Support both old and new format
        setUnits(
          units.slice().sort((a, b) => a.name.localeCompare(b.name))
        );
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load units");
        setLoading(false);
      });
  }, [refresh]);

  // Filtering
  const filtered = units.filter((unit: Unit) => {
    if (
      search &&
      !unit.name.toLowerCase().includes(search.toLowerCase()) &&
      !unit.plateNumber?.toLowerCase().includes(search.toLowerCase()) &&
      !unit.vin?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Group by first letter and sort alphabetically
  function groupUnitsByLetter(units: Unit[]) {
    const letterGroups: Record<string, Unit[]> = {};

    units.forEach((unit) => {
      const firstLetter = unit.name.charAt(0).toUpperCase();

      if (!letterGroups[firstLetter]) letterGroups[firstLetter] = [];
      letterGroups[firstLetter].push(unit);
    });

    // Sort letters alphabetically
    const sortedLetters = Object.keys(letterGroups).sort();

    return sortedLetters.map((letter) => ({
      letter,
      units: letterGroups[letter].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }

  const groupedUnits = groupUnitsByLetter(filtered);

  const handleDelete = async (id: string) => {
    try {
      setUnits(units.filter((unit) => unit.unitId !== id));
      await unitApi.delete(id);
      toast.success("Unit deleted successfully");
    } catch {
      toast.error("Failed to delete unit");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading units...</div>
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
          <input
            className="border rounded px-2 py-1 min-w-[200px]"
            type="text"
            placeholder="Search units, plates, or VINs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex-1" />
          <Button
            onClick={onCreate}
            className="gap-1 whitespace-nowrap self-stretch"
          >
            <Plus className="h-4 w-4" /> Add Unit
          </Button>
        </div>
      </div>

      {groupedUnits.length === 0 && (
        <div className="text-muted-foreground py-8 text-center">
          No units found.
        </div>
      )}

      {groupedUnits.map(({ letter, units }) => (
        <div key={letter} className="mb-6">
          <div className="font-semibold text-lg mb-3 text-foreground border-b pb-1">
            {letter}
          </div>
          <div className="space-y-1">
            {units.map((unit) => (
              <div
                key={unit.unitId}
                className="py-3 px-4 rounded-lg flex items-center justify-between hover:bg-muted cursor-pointer border border-border"
                onClick={() => onView(unit)}
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* Unit icon */}
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-purple-600" />
                  </div>

                  {/* Unit info */}
                  <div className="flex-1">
                    <div className="font-medium">{unit.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {unit.plateNumber && <span>Plate: {unit.plateNumber}</span>}
                      {unit.plateNumber && unit.color && " • "}
                      {unit.color && <span>Color: {unit.color}</span>}
                      {(unit.plateNumber || unit.color) && unit.vin && " • "}
                      {unit.vin && <span>VIN: {unit.vin.slice(-8)}</span>}
                    </div>
                  </div>

                  {/* Status or additional info */}
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {unit.description ? "With Notes" : "Active"}
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
                      onEdit(unit);
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
                      setConfirmDelete(unit.unitId!);
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

      <ConfirmDialog
        title="Delete Unit"
        message="Are you sure you want to delete this unit? This action cannot be undone."
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
