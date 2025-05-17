"use client";

import { useState } from "react";
import { DispatcherList } from "@/src/components/dispatchers/DispatcherList";
import { DispatcherDetails } from "@/src/components/dispatchers/DispatcherDetails";
import { DispatcherForm } from "@/src/components/dispatchers/DispatcherForm";
import { Modal } from "@/src/components/common/Modal";
import { ConfirmDialog } from "@/src/components/common/Modal";
import { dispatcherApi } from "@/src/lib/api";
import { toast } from "sonner";

interface Dispatcher {
  dispatcherId: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  commissionPercentage?: number;
  jobsCount?: number;
  invoicesCount?: number;
}

export default function DispatchersPage() {
  const [selectedDispatcher, setSelectedDispatcher] =
    useState<Dispatcher | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDispatcher, setEditingDispatcher] = useState<Dispatcher | null>(
    null
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Refresh the list when data changes
  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  const handleCreate = () => {
    setEditingDispatcher(null);
    setIsFormOpen(true);
  };

  const handleEdit = (dispatcher: Dispatcher) => {
    setEditingDispatcher(dispatcher);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedDispatcher) return;

    try {
      await dispatcherApi.delete(selectedDispatcher.dispatcherId);
      toast.success("Dispatcher deleted successfully");
      setSelectedDispatcher(null);
      refresh();
    } catch (error) {
      toast.error("Failed to delete dispatcher" + error.message);
    }
    setConfirmDelete(false);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Dispatchers</h1>
        <p className="text-muted-foreground">
          Manage dispatchers and their commission rates.
        </p>
      </div>

      <div className="flex flex-col min-h-[80vh] w-full max-w-screen-2xl mx-auto px-4 md:flex-row md:gap-8">
        {/* Sidebar/List */}
        <div className="lg:w-full md:w-2/5 md:pr-6">
          <DispatcherList
            onSelect={setSelectedDispatcher}
            onEdit={handleEdit}
            onCreate={handleCreate}
            refresh={refreshTrigger}
          />
        </div>
        {/* Details Panel */}
        <div className="flex-1">
          {selectedDispatcher && (
            <DispatcherDetails
              dispatcher={selectedDispatcher}
              onDelete={() => setConfirmDelete(true)}
              onEdit={() =>
                selectedDispatcher && handleEdit(selectedDispatcher)
              }
            />
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        title={editingDispatcher ? "Edit Dispatcher" : "Create Dispatcher"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="fit"
      >
        <DispatcherForm
          dispatcher={editingDispatcher || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
            if (editingDispatcher) {
              setSelectedDispatcher(null);
            }
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        title="Delete Dispatcher"
        message="Are you sure you want to delete this dispatcher? This action cannot be undone."
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
