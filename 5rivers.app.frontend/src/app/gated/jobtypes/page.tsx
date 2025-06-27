"use client";

import { useState } from "react";
import { JobTypeList } from "@/src/components/jobtypes/JobTypeList";
import { JobTypeDetails } from "@/src/components/jobtypes/JobTypeDetails";
import { JobTypeForm } from "@/src/components/jobtypes/JobTypeForm";
import { Modal, ConfirmDialog } from "@/src/components/common/Modal";
import { SlideOver } from "@/src/components/common/SlideOver";
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Job Types</h1>
            <p className="text-indigo-100 text-lg">
              Manage job types and their configuration
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-medium">Job Types</span>
              <div className="text-2xl font-bold">18</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[80vh]">
        {/* Sidebar/List */}
        <div className="lg:w-2/5 xl:w-1/3">
          <div className="sticky top-6">
            <JobTypeList
              onSelect={(jt: any) => setSelectedJobType(jt)}
              onEdit={handleEdit}
              onCreate={handleCreate}
              refresh={refreshTrigger}
            />
          </div>
        </div>
        
        {/* Details Panel */}
        <div className="flex-1">
          {selectedJobType ? (
            <div className="animate-fade-in">
              <JobTypeDetails
                jobType={selectedJobType}
                onDelete={() => setConfirmDelete(true)}
                onEdit={() => selectedJobType && handleEdit(selectedJobType)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No Job Type Selected</h3>
                <p className="text-sm max-w-sm mx-auto">
                  Select a job type from the list to view its details and manage configuration.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Create/Edit SlideOver */}
      <SlideOver
        title={editingJobType ? "Edit Job Type" : "Create New Job Type"}
        subtitle={editingJobType ? "Update job type configuration" : "Add a new job type to the system"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="lg"
      >
        <JobTypeForm
          jobType={editingJobType as any || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
            if (editingJobType) {
              setSelectedJobType(null);
            }
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </SlideOver>
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
