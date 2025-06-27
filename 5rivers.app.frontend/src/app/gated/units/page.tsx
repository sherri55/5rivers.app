"use client";

import { useState } from "react";
import { UnitList } from "@/src/components/units/UnitList";
import { UnitForm } from "@/src/components/units/UnitForm";
import { UnitDetails } from "@/src/components/units/UnitDetails";
import { Modal, ConfirmDialog } from "@/src/components/common/Modal";
import { SlideOver } from "@/src/components/common/SlideOver";
import { unitApi } from "@/src/lib/api";
import { toast } from "sonner";

export default function UnitsPage() {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = () => setRefreshTrigger((r) => r + 1);

  const handleCreate = () => {
    setEditingUnit(null);
    setIsFormOpen(true);
  };

  const handleEdit = (unit) => {
    setEditingUnit(unit);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedUnit) return;
    try {
      await unitApi.delete(selectedUnit.unitId);
      toast.success("Unit deleted successfully");
      setSelectedUnit(null);
      refresh();
    } catch (error) {
      toast.error("Failed to delete unit" + error.message);
    }
    setConfirmDelete(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Units</h1>
            <p className="text-purple-100 text-lg">
              Manage units, view details, and track unit information
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-medium">Total Units</span>
              <div className="text-2xl font-bold">15</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[80vh]">
        {/* Sidebar/List */}
        <div className="lg:w-2/5 xl:w-1/3">
          <div className="sticky top-6">
            <UnitList
              onSelect={setSelectedUnit}
              onEdit={handleEdit}
              onCreate={handleCreate}
              refresh={refreshTrigger}
            />
          </div>
        </div>
        
        {/* Details Panel */}
        <div className="flex-1">
          {selectedUnit ? (
            <div className="animate-fade-in">
              <UnitDetails
                unit={selectedUnit}
                onDelete={() => setConfirmDelete(true)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No Unit Selected</h3>
                <p className="text-sm max-w-sm mx-auto">
                  Select a unit from the list to view its details and manage information.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Create/Edit SlideOver */}
      <SlideOver
        title={editingUnit ? "Edit Unit" : "Create New Unit"}
        subtitle={editingUnit ? "Update unit information" : "Add a new unit to your fleet"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="lg"
      >
        <UnitForm
          unit={editingUnit || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
            if (editingUnit && selectedUnit?.unitId === editingUnit.unitId) {
              setSelectedUnit(editingUnit); // Optionally refresh details
            }
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </SlideOver>
      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        title="Delete Unit"
        message="Are you sure you want to delete this unit? This action cannot be undone."
        isOpen={confirmDelete}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
