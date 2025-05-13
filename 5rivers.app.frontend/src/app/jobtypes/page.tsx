"use client";

import { useState } from "react";
import { JobTypeList } from "../../components/jobtypes/JobTypeList";
import { JobTypeDetails } from "../../components/jobtypes/JobTypeDetails";
import { JobTypeForm } from "@/src/components/jobtypes/JobTypeForm";
import { Modal, ConfirmDialog } from "../../components/common/Modal";
import { jobTypeApi } from "@/src/lib/api";
import { toast } from "sonner";

interface JobType {
  jobTypeId: string;
  title: string;
  startLocation?: string;
  endLocation?: string;
  dispatchType?: string;
  rateOfJob?: number;
  companyId?: string;
  dispatcherId?: string;
}

export default function JobTypesPage() {
  const [selectedJobType, setSelectedJobType] = useState<JobType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJobType, setEditingJobType] = useState<JobType | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  const handleCreate = () => {
    setEditingJobType(null);
    setIsFormOpen(true);
  };

  const handleEdit = (jobType: JobType) => {
    setEditingJobType(jobType);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedJobType) return;
    try {
      await jobTypeApi.delete(selectedJobType.jobTypeId);
      toast.success("Job Type deleted successfully");
      setSelectedJobType(null);
      refresh();
    } catch (error) {
      toast.error("Failed to delete job type" + error.message);
    }
    setConfirmDelete(false);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Job Types</h1>
        <p className="text-muted-foreground">
          Manage job types and their information.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-1">
          <JobTypeList
            onSelect={setSelectedJobType}
            onEdit={handleEdit}
            onCreate={handleCreate}
            refresh={refreshTrigger}
          />
        </div>
        <div className="md:col-span-1">
          {selectedJobType && (
            <JobTypeDetails
              jobType={selectedJobType}
              onDelete={() => setConfirmDelete(true)}
              onEdit={() => selectedJobType && handleEdit(selectedJobType)}
            />
          )}
        </div>
      </div>
      <Modal
        title={editingJobType ? "Edit Job Type" : "Create Job Type"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      >
        <JobTypeForm
          jobType={editingJobType || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
            if (editingJobType) {
              setSelectedJobType(null);
            }
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
      <ConfirmDialog
        title="Delete Job Type"
        message="Are you sure you want to delete this job type? This action cannot be undone."
        isOpen={confirmDelete}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
