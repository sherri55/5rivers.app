"use client";

import { useState } from "react";
import { DriverList } from "../../components/drivers/DriverList";
import { DriverDetails } from "../../components/drivers/DriverDetails";
import { DriverForm } from "../../components/drivers/DriverForm";
import { DriverRateForm } from "../../components/drivers/DriverRateForm";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/Modal";
import { driverApi } from "@/src/lib/api";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Plus } from "lucide-react";

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
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Drivers</h1>
        <p className="text-muted-foreground">
          Manage drivers, hourly rates, and job-specific rates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-1">
          <DriverList
            onSelect={setSelectedDriver}
            onEdit={handleEdit}
            onCreate={handleCreate}
            refresh={refreshTrigger}
          />
        </div>

        <div className="md:col-span-1">
          {selectedDriver && (
            <>
              <DriverDetails
                driver={selectedDriver}
                onDelete={() => setConfirmDelete(true)}
                onEdit={() => selectedDriver && handleEdit(selectedDriver)}
              />
              <div className="mt-4 flex justify-end">
                <Button onClick={handleCreateRate} className="gap-1">
                  <Plus className="h-4 w-4" /> Add Job Type Rate
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Driver Modal */}
      <Modal
        title={editingDriver ? "Edit Driver" : "Create Driver"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
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
      </Modal>

      {/* Create/Edit Driver Rate Modal */}
      <Modal
        title={editingRate ? "Edit Job Type Rate" : "Add Job Type Rate"}
        isOpen={isRateFormOpen && !!selectedDriver}
        onClose={() => setIsRateFormOpen(false)}
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
