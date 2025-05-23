"use client";

import { useState } from "react";
import { JobList } from "@/src/components/jobs/JobList";
import { JobDetails } from "@/src/components/jobs/JobDetails";
import { JobForm } from "@/src/components/jobs/JobForm";
import { Modal, ConfirmDialog } from "@/src/components/common/Modal";
import { jobApi } from "@/src/lib/api";
import { toast } from "sonner";

interface Job {
  jobId: string;
  jobDate: string;
  jobTypeId?: string;
  driverId?: string;
  unitId?: string;
  dispatcherId?: string;
  status?: string;
  jobGrossAmount?: number;
  invoiceId?: string;
}

export default function JobsPage() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  const handleCreate = () => {
    setEditingJob(null);
    setIsFormOpen(true);
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedJob) return;
    try {
      await jobApi.delete(selectedJob.jobId);
      toast.success("Job deleted successfully");
      setSelectedJob(null);
      refresh();
    } catch (error) {
      toast.error("Failed to delete job" + error.message);
    }
    setConfirmDelete(false);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Jobs</h1>
        <p className="text-muted-foreground">
          Manage jobs and their information.
        </p>
      </div>
      <div className="flex flex-col min-h-[80vh] w-full max-w-screen-2xl mx-auto px-4 md:flex-row md:gap-8">
        {/* Sidebar/List */}
        <div className="lg:w-full md:w-2/5 md:pr-6">
          <JobList
            onSelect={setSelectedJob}
            onEdit={handleEdit}
            onCreate={handleCreate}
            onDelete={handleDelete}
            refresh={refreshTrigger}
          />
        </div>
        {/* Details Panel */}
        <div className="flex-1">
          {selectedJob && (
            <JobDetails
              job={selectedJob}
              onDelete={() => setConfirmDelete(true)}
              onEdit={() => selectedJob && handleEdit(selectedJob)}
            />
          )}
        </div>
      </div>
      <Modal
        title={editingJob ? "Edit Job" : "Create Job"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      >
        <JobForm
          job={editingJob || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
            if (editingJob) {
              setSelectedJob(null);
            }
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
      <ConfirmDialog
        title="Delete Job"
        message="Are you sure you want to delete this job? This action cannot be undone."
        isOpen={confirmDelete}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
