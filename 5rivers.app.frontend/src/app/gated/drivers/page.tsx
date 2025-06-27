"use client";

import { useState } from "react";
import { DriverList } from "@/src/components/drivers/DriverList";
import { DriverDetails } from "@/src/components/drivers/DriverDetails";
import { DriverForm } from "@/src/components/drivers/DriverForm";
import { DriverRateForm } from "@/src/components/drivers/DriverRateForm";
import { Modal, ConfirmDialog } from "@/src/components/common/Modal";
import { SlideOver } from "@/src/components/common/SlideOver";
import { driverApi } from "@/src/lib/api";
import { toast } from "sonner";

interface Driver {
  driverId: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  hourlyRate?: number;
  activeJobsCount?: number;
}

interface DriverRate {
  driverRateId: string;
  driverId: string;
  jobTypeId: string;
  hourlyRate?: number;
  percentage?: number;
}

export default function DriversPage() {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRateFormOpen, setIsRateFormOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editingRate, setEditingRate] = useState<DriverRate | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Refresh the list when data changes
  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  const handleCreate = () => {
    setEditingDriver(null);
    setIsFormOpen(true);
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setIsFormOpen(true);
  };

  const handleCreateRate = () => {
    setEditingRate(null);
    setIsRateFormOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedDriver) return;

    try {
      await driverApi.delete(selectedDriver.driverId);
      toast.success("Driver deleted successfully");
      setSelectedDriver(null);
      refresh();
    } catch (error) {
      toast.error("Failed to delete driver" + error.message);
    }
    setConfirmDelete(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Drivers</h1>
            <p className="text-green-100 text-lg">
              Manage drivers, hourly rates, and job-specific rates
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-medium">Active Drivers</span>
              <div className="text-2xl font-bold">8</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[80vh]">
        {/* Sidebar/List */}
        <div className="lg:w-2/5 xl:w-1/3">
          <div className="sticky top-6">
            <DriverList
              onSelect={setSelectedDriver}
              onEdit={handleEdit}
              onCreate={handleCreate}
              refresh={refreshTrigger}
            />
          </div>
        </div>
        
        {/* Details Panel */}
        <div className="flex-1">
          {selectedDriver ? (
            <div className="animate-fade-in space-y-4">
              <DriverDetails
                driver={selectedDriver}
                onDelete={() => setConfirmDelete(true)}
                onEdit={() => selectedDriver && handleEdit(selectedDriver)}
              />
              {/* Driver Rate Management Section - can be handled through the details component or separately */}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No Driver Selected</h3>
                <p className="text-sm max-w-sm mx-auto">
                  Select a driver from the list to view their details and manage rates.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit SlideOver */}
      <SlideOver
        title={editingDriver ? "Edit Driver" : "Create New Driver"}
        subtitle={editingDriver ? "Update driver information" : "Add a new driver to your system"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="lg"
      >
        <DriverForm
          driver={editingDriver || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
            if (
              editingDriver &&
              selectedDriver?.driverId === editingDriver.driverId
            ) {
              // Update the selected driver data
              driverApi
                .getById(editingDriver.driverId)
                .then((data) => {
                  setSelectedDriver(data);
                })
                .catch(() => {
                  toast.error("Failed to refresh driver data");
                });
            }
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </SlideOver>

      {/* Create/Edit Driver Rate Modal */}
      <Modal
        title={editingRate ? "Edit Job Type Rate" : "Add Job Type Rate"}
        isOpen={isRateFormOpen && !!selectedDriver}
        onClose={() => setIsRateFormOpen(false)}
        size="fit"
      >
        {selectedDriver && (
          <DriverRateForm
            driverId={selectedDriver.driverId}
            driverRate={editingRate || undefined}
            onSuccess={() => {
              setIsRateFormOpen(false);
              // Reload the driver to refresh the rates
              if (selectedDriver) {
                driverApi
                  .getById(selectedDriver.driverId)
                  .then((data) => {
                    setSelectedDriver(data);
                    refresh();
                  })
                  .catch(() => {
                    toast.error("Failed to refresh driver data");
                  });
              }
            }}
            onCancel={() => setIsRateFormOpen(false)}
          />
        )}
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        title="Delete Driver"
        message="Are you sure you want to delete this driver? This action cannot be undone."
        isOpen={confirmDelete}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
