"use client";

import { useState, useEffect } from "react";
import { DispatcherList } from "@/src/components/dispatchers/DispatcherList";
import { DispatcherForm } from "@/src/components/dispatchers/DispatcherForm";
import { DispatcherView } from "@/src/components/dispatchers/DispatcherView";
import { ConfirmDialog } from "@/src/components/common/Modal";
import { SlideOver } from "@/src/components/common/SlideOver";
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
  const [selectedDispatcher, setSelectedDispatcher] = useState<Dispatcher | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingDispatcher, setEditingDispatcher] = useState<Dispatcher | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dispatcherCount, setDispatcherCount] = useState<number>(0);

  // Refresh the list when data changes
  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  // Fetch dispatcher count
  useEffect(() => {
    const fetchDispatcherCount = async () => {
      try {
        const response = await dispatcherApi.fetchAll({ pageSize: 1 });
        setDispatcherCount(response.total || 0);
      } catch (error) {
        console.error("Failed to fetch dispatcher count:", error);
      }
    };
    fetchDispatcherCount();
  }, [refreshTrigger]);

  const handleCreate = () => {
    setEditingDispatcher(null);
    setIsFormOpen(true);
  };

  const handleEdit = (dispatcher: Dispatcher) => {
    setEditingDispatcher(dispatcher);
    setIsViewOpen(false);
    setIsFormOpen(true);
  };

  const handleView = (dispatcher: Dispatcher) => {
    setSelectedDispatcher(dispatcher);
    setIsViewOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedDispatcher) return;

    try {
      await dispatcherApi.delete(selectedDispatcher.dispatcherId);
      toast.success("Dispatcher deleted successfully");
      setSelectedDispatcher(null);
      setIsViewOpen(false);
      refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to delete dispatcher: " + message);
    }
    setConfirmDelete(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dispatchers</h1>
            <p className="text-orange-100 text-lg">
              Manage dispatchers and their commission rates
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-medium">Total Dispatchers</span>
              <div className="text-2xl font-bold">{dispatcherCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <div className="w-full">
        <DispatcherList
          onView={handleView}
          onEdit={handleEdit}
          onCreate={handleCreate}
          refresh={refreshTrigger}
        />
      </div>

      {/* View SlideOver */}
      <SlideOver
        title="Dispatcher Details"
        subtitle="View dispatcher information"
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        size="lg"
      >
        {selectedDispatcher && (
          <DispatcherView
            dispatcher={selectedDispatcher}
            onEdit={() => handleEdit(selectedDispatcher)}
            onDelete={() => setConfirmDelete(true)}
            onClose={() => setIsViewOpen(false)}
          />
        )}
      </SlideOver>

      {/* Create/Edit SlideOver */}
      <SlideOver
        title={editingDispatcher ? "Edit Dispatcher" : "Create New Dispatcher"}
        subtitle={editingDispatcher ? "Update dispatcher information" : "Add a new dispatcher to your team"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="lg"
      >
        <DispatcherForm
          dispatcher={editingDispatcher || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
            if (editingDispatcher) {
              setSelectedDispatcher(null);
              setIsViewOpen(false);
            }
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </SlideOver>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        title="Delete Dispatcher"
        message="Are you sure you want to delete this dispatcher? This action cannot be undone."
        isOpen={confirmDelete}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
