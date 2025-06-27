"use client";

import { useState } from "react";
import { DispatcherList } from "@/src/components/dispatchers/DispatcherList";
import { DispatcherDetails } from "@/src/components/dispatchers/DispatcherDetails";
import { DispatcherForm } from "@/src/components/dispatchers/DispatcherForm";
import { Modal, ConfirmDialog } from "@/src/components/common/Modal";
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
              <span className="text-sm font-medium">Active Dispatchers</span>
              <div className="text-2xl font-bold">6</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[80vh]">
        {/* Sidebar/List */}
        <div className="lg:w-2/5 xl:w-1/3">
          <div className="sticky top-6">
            <DispatcherList
              onSelect={setSelectedDispatcher}
              onEdit={handleEdit}
              onCreate={handleCreate}
              refresh={refreshTrigger}
            />
          </div>
        </div>
        
        {/* Details Panel */}
        <div className="flex-1">
          {selectedDispatcher ? (
            <div className="animate-fade-in">
              <DispatcherDetails
                dispatcher={selectedDispatcher}
                onDelete={() => setConfirmDelete(true)}
                onEdit={() => selectedDispatcher && handleEdit(selectedDispatcher)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No Dispatcher Selected</h3>
                <p className="text-sm max-w-sm mx-auto">
                  Select a dispatcher from the list to view their details and manage commission rates.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

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
