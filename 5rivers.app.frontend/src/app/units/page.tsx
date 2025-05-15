"use client";

import { useState } from "react";
import { UnitList } from "../../components/units/UnitList";
import { UnitForm } from "../../components/units/UnitForm";
import { UnitDetails } from "../../components/units/UnitDetails";
import { Modal, ConfirmDialog } from "../../components/common/Modal";
import { unitApi } from "../../lib/api";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Plus } from "lucide-react";

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
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Units</h1>
        <p className="text-muted-foreground">
          Manage units, view details, and add or edit unit information.
        </p>
      </div>
      <div className="flex flex-col min-h-[80vh] w-full max-w-screen-2xl mx-auto px-4 md:flex-row md:gap-8">
        {/* Sidebar/List */}
        <div className="lg:w-full md:w-2/5 md:pr-6">
          <UnitList
            onSelect={setSelectedUnit}
            onEdit={handleEdit}
            onCreate={handleCreate}
            refresh={refreshTrigger}
          />
        </div>
        {/* Details Panel */}
        <div className="flex-1">
          {selectedUnit && (
            <UnitDetails
              unit={selectedUnit}
              onDelete={() => setConfirmDelete(true)}
              onEdit={() => selectedUnit && handleEdit(selectedUnit)}
            />
          )}
        </div>
      </div>
      {/* Create/Edit Unit Modal */}
      <Modal
        title={editingUnit ? "Edit Unit" : "Create Unit"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="fit"
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
      </Modal>
      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        title="Delete Unit"
        message="Are you sure you want to delete this unit? This action cannot be undone."
        isOpen={confirmDelete}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Delete"
        variant="destructive"
        size="fit"
      />
    </div>
  );
}
