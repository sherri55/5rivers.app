"use client";

import { useState } from "react";
import { JobList } from "@/src/components/jobs/JobList";
import { JobDetails } from "@/src/components/jobs/JobDetails";
import { JobForm } from "@/src/components/jobs/JobForm";
import { Modal, ConfirmDialog } from "@/src/components/common/Modal";
import { SlideOver } from "@/src/components/common/SlideOver";
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Jobs</h1>
            <p className="text-teal-100 text-lg">
              Manage jobs and track their progress
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-medium">Active Jobs</span>
              <div className="text-2xl font-bold">24</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[80vh]">
        {/* Sidebar/List */}
        <div className="lg:w-2/5 xl:w-1/3">
          <div className="sticky top-6">
            <JobList
              onSelect={setSelectedJob}
              onEdit={handleEdit}
              onCreate={handleCreate}
              onDelete={handleDelete}
              refresh={refreshTrigger}
            />
          </div>
        </div>
        
        {/* Details Panel */}
        <div className="flex-1">
          {selectedJob ? (
            <div className="animate-fade-in">
              <JobDetails
                job={selectedJob}
                onDelete={() => setConfirmDelete(true)}
                onEdit={() => selectedJob && handleEdit(selectedJob)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No Job Selected</h3>
                <p className="text-sm max-w-sm mx-auto">
                  Select a job from the list to view its details and manage information.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Create/Edit SlideOver */}
      <SlideOver
        title={editingJob ? "Edit Job" : "Create New Job"}
        subtitle={editingJob ? "Update job information" : "Add a new job to the system"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="lg"
      >
        <JobForm
          job={editingJob as any || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
            if (editingJob) {
              setSelectedJob(null);
            }
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </SlideOver>
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
