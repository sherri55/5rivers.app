"use client";

import { useState, useEffect } from "react";
import { UnitList } from "@/src/components/units/UnitList";
import { UnitForm } from "@/src/components/units/UnitForm";
import { ConfirmDialog } from "@/src/components/common/Modal";
import { SlideOver } from "@/src/components/common/SlideOver";
import { unitApi } from "@/src/lib/api";
import { toast } from "sonner";
import { Unit } from "@/src/types/entities";

export default function UnitsPage() {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [unitCount, setUnitCount] = useState<number>(0);

  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  // Fetch unit count
  useEffect(() => {
    const fetchUnitCount = async () => {
      try {
        const response = await unitApi.fetchAll({ pageSize: 1 });
        setUnitCount(response.total || 0);
      } catch (error) {
        console.error("Failed to fetch unit count:", error);
      }
    };
    fetchUnitCount();
  }, [refreshTrigger]);

  const handleCreate = () => {
    setEditingUnit(null);
    setIsFormOpen(true);
  };

  const handleView = (unit: Unit) => {
    setSelectedUnit(unit);
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setIsFormOpen(true);
  };

  const handleDelete = async (unit: Unit) => {
    setSelectedUnit(unit);
    setConfirmDelete(true);
  };

  const confirmDeleteAction = async () => {
    if (!selectedUnit) return;

    try {
      await unitApi.delete(selectedUnit.unitId);
      toast.success("Unit deleted successfully");
      setSelectedUnit(null);
      refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to delete unit: " + message);
    }
    setConfirmDelete(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Units</h1>
            <p className="text-orange-100 text-lg">
              Manage fleet vehicles, track status, and assign to jobs
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-medium">Total Units</span>
              <div className="text-2xl font-bold">{unitCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <div className="w-full">
        <UnitList
          onView={handleView}
          onEdit={handleEdit}
          onCreate={handleCreate}
          refresh={refreshTrigger}
        />
      </div>

      {/* Create/Edit SlideOver */}
      <SlideOver
        title={editingUnit ? "Edit Unit" : "Create New Unit"}
        subtitle={
          editingUnit
            ? "Update unit information and status"
            : "Add a new unit to the fleet"
        }
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="lg"
      >
        <UnitForm
          unit={editingUnit || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </SlideOver>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        title="Delete Unit"
        message="Are you sure you want to delete this unit? This action cannot be undone."
        isOpen={confirmDelete}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
