"use client";

import { useState, useEffect } from "react";
import { JobTypeList } from "@/src/components/jobtypes/JobTypeList";
import { JobTypeForm } from "@/src/components/jobtypes/JobTypeForm";
import { ConfirmDialog } from "@/src/components/common/Modal";
import { SlideOver } from "@/src/components/common/SlideOver";
import { jobTypeApi } from "@/src/lib/api";
import { toast } from "sonner";

interface JobType {
  jobTypeId: string;
  name: string;
  description?: string;
  rate?: number;
  unit?: string;
}

export default function JobTypesPage() {
  const [selectedJobType, setSelectedJobType] = useState<JobType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJobType, setEditingJobType] = useState<JobType | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [jobTypeCount, setJobTypeCount] = useState<number>(0);

  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  // Fetch job type count
  useEffect(() => {
    const fetchJobTypeCount = async () => {
      try {
        const response = await jobTypeApi.fetchAll({ pageSize: 1 });
        setJobTypeCount(response.total || 0);
      } catch (error) {
        console.error("Failed to fetch job type count:", error);
      }
    };
    fetchJobTypeCount();
  }, [refreshTrigger]);

  const handleCreate = () => {
    setEditingJobType(null);
    setIsFormOpen(true);
  };

  const handleEdit = (jobType: JobType) => {
    setEditingJobType(jobType);
    setIsFormOpen(true);
  };

  const handleDelete = async (jobType: JobType) => {
    setSelectedJobType(jobType);
    setConfirmDelete(true);
  };

  const confirmDeleteAction = async () => {
    if (!selectedJobType) return;

    try {
      await jobTypeApi.delete(selectedJobType.jobTypeId);
      toast.success("Job type deleted successfully");
      setSelectedJobType(null);
      refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to delete job type: " + message);
    }
    setConfirmDelete(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Job Types</h1>
            <p className="text-purple-100 text-lg">
              Manage service categories and pricing
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-medium">Total Types</span>
              <div className="text-2xl font-bold">{jobTypeCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <div className="w-full">
        <JobTypeList
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreate={handleCreate}
          refresh={refreshTrigger}
        />
      </div>

      {/* Create/Edit SlideOver */}
      <SlideOver
        title={editingJobType ? "Edit Job Type" : "Create New Job Type"}
        subtitle={
          editingJobType
            ? "Update job type information and pricing"
            : "Add a new service category"
        }
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="lg"
      >
        <JobTypeForm
          jobType={editingJobType || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </SlideOver>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        title="Delete Job Type"
        message="Are you sure you want to delete this job type? This action cannot be undone."
        isOpen={confirmDelete}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
