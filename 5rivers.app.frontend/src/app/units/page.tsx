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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-1">
          <UnitList
            onSelect={setSelectedUnit}
            onEdit={handleEdit}
            onCreate={handleCreate}
            refresh={refreshTrigger}
          />
        </div>
        <div className="md:col-span-1">
          {selectedUnit && (
            <>
              <div className="flex justify-end mb-4">
                <Button onClick={handleCreate} className="gap-1">
                  <Plus className="h-4 w-4" /> Add Unit
                </Button>
              </div>
              <UnitDetails
                unit={selectedUnit}
                onDelete={() => setConfirmDelete(true)}
              />
            </>
          )}
        </div>
      </div>
      {/* Create/Edit Unit Modal */}
      <Modal
        title={editingUnit ? "Edit Unit" : "Create Unit"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
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
      />
    </div>
  );
}
