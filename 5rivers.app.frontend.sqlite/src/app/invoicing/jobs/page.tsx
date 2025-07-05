"use client";

import { useState, useEffect } from "react";
import { JobList } from "@/src/components/jobs/JobList";
import { JobForm } from "@/src/components/jobs/JobForm";
import { JobView } from "@/src/components/jobs/JobView";
import { ConfirmDialog } from "@/src/components/common/Modal";
import { SlideOver } from "@/src/components/common/SlideOver";
import { jobApi } from "@/src/lib/api";
import { toast } from "sonner";
import { Job } from "@/src/types/entities";

export default function JobsPage() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [jobCount, setJobCount] = useState<number>(0);

  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  // Fetch job count
  useEffect(() => {
    const fetchJobCount = async () => {
      try {
        const response = await jobApi.fetchAll({ pageSize: 1 });
        setJobCount(response.total || 0);
      } catch (error) {
        console.error("Failed to fetch job count:", error);
      }
    };
    fetchJobCount();
  }, [refreshTrigger]);

  const handleCreate = () => {
    setEditingJob(null);
    setIsFormOpen(true);
  };

  const handleView = (job: Job) => {
    setSelectedJob(job);
    setIsViewOpen(true);
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setIsFormOpen(true);
  };

  const handleDelete = (job: Job) => {
    setSelectedJob(job);
    setConfirmDelete(true);
  };

  const confirmDeleteAction = async () => {
    if (!selectedJob) return;

    try {
      await jobApi.delete(selectedJob.jobId);
      toast.success("Job deleted successfully");
      setSelectedJob(null);
      refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to delete job: " + message);
    }
    setConfirmDelete(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Jobs</h1>
            <p className="text-blue-100 text-lg">
              Manage jobs, track progress, and assign resources
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-medium">Total Jobs</span>
              <div className="text-2xl font-bold">{jobCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <div className="w-full">
        <JobList
          onView={handleView}
          onEdit={handleEdit}
          onCreate={handleCreate}
          refresh={refreshTrigger}
        />
      </div>

      {/* View SlideOver */}
      <SlideOver
        title="Job Details"
        subtitle="View job information and progress"
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        size="lg"
      >
        {selectedJob && (
          <JobView
            job={selectedJob}
            onEdit={() => handleEdit(selectedJob)}
            onDelete={() => setConfirmDelete(true)}
            onClose={() => setIsViewOpen(false)}
            onUpdate={(updatedJob) => setSelectedJob(updatedJob as Job)}
          />
        )}
      </SlideOver>

      {/* Create/Edit SlideOver */}
      <SlideOver
        title={editingJob ? "Edit Job" : "Create New Job"}
        subtitle={
          editingJob
            ? "Update job information and assignments"
            : "Create a new job and assign resources"
        }
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="lg"
      >
        <JobForm
          job={editingJob || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
            if (editingJob) {
              setSelectedJob(null);
              setIsViewOpen(false);
            }
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </SlideOver>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        title="Delete Job"
        message="Are you sure you want to delete this job? This action cannot be undone."
        isOpen={confirmDelete}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
