"use client";

import { useState, useEffect } from "react";
import { DriverList } from "@/src/components/drivers/DriverList";
import { DriverView } from "@/src/components/drivers/DriverView";
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
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isRateFormOpen, setIsRateFormOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editingRate, setEditingRate] = useState<DriverRate | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [driverCount, setDriverCount] = useState<number>(0);

  // Refresh the list when data changes
  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  // Fetch driver count
  useEffect(() => {
    const fetchDriverCount = async () => {
      try {
        const response = await driverApi.fetchAll({ pageSize: 1 });
        setDriverCount(response.total || 0);
      } catch (error) {
        console.error("Failed to fetch driver count:", error);
      }
    };
    fetchDriverCount();
  }, [refreshTrigger]);

  const handleCreate = () => {
    setEditingDriver(null);
    setIsFormOpen(true);
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setIsViewOpen(false);
    setIsFormOpen(true);
  };

  const handleView = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsViewOpen(true);
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
      setIsViewOpen(false);
      refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to delete driver: " + message);
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
              <span className="text-sm font-medium">Total Drivers</span>
              <div className="text-2xl font-bold">{driverCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <div className="w-full">
        <DriverList
          onView={handleView}
          onEdit={handleEdit}
          onCreate={handleCreate}
          refresh={refreshTrigger}
        />
      </div>

      {/* View SlideOver */}
      <SlideOver
        title="Driver Details"
        subtitle="View driver information and rates"
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        size="lg"
      >
        {selectedDriver && (
          <DriverView
            driver={selectedDriver}
            onEdit={() => handleEdit(selectedDriver)}
            onDelete={() => setConfirmDelete(true)}
            onCreateRate={handleCreateRate}
            onClose={() => setIsViewOpen(false)}
          />
        )}
      </SlideOver>

      {/* Create/Edit SlideOver */}
      <SlideOver
        title={editingDriver ? "Edit Driver" : "Create New Driver"}
        subtitle={
          editingDriver
            ? "Update driver information"
            : "Add a new driver to your system"
        }
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="lg"
      >
        <DriverForm
          driver={editingDriver || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
            if (editingDriver) {
              setSelectedDriver(null);
              setIsViewOpen(false);
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
