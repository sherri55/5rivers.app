"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { jobApi } from "@/src/lib/api";
import { JobList } from "@/src/components/jobs/JobList";
import { JobView } from "@/src/components/jobs/JobView";
import { JobForm } from "@/src/components/jobs/JobForm";

export default function JobsPage() {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const searchParams = useSearchParams();

  // Handle URL parameters for auto-opening job view
  useEffect(() => {
    const jobId = searchParams.get("jobId");
    if (jobId) {
      // Fetch the job and open the slide view
      jobApi.getById(jobId)
        .then((job) => {
          if (job) {
            setSelectedJob(job);
            setIsViewOpen(true);
          } else {
            toast.error("Job not found");
          }
        })
        .catch(() => {
          toast.error("Failed to load job");
        });
    }
  }, [searchParams]);

  return (
    <div>
      <JobList
        onViewJob={(job) => {
          setSelectedJob(job);
          setIsViewOpen(true);
        }}
        onEditJob={(job) => {
          setSelectedJob(job);
          setIsEditOpen(true);
        }}
        onCreateJob={() => setIsCreateOpen(true)}
        refresh={refresh}
        setRefresh={setRefresh}
      />
      {isViewOpen && (
        <JobView
          job={selectedJob}
          onClose={() => setIsViewOpen(false)}
          onEdit={() => {
            setIsEditOpen(true);
            setIsViewOpen(false);
          }}
        />
      )}
      {isEditOpen && (
        <JobForm
          job={selectedJob}
          onClose={() => setIsEditOpen(false)}
          onSave={() => {
            setRefresh((prev) => prev + 1);
            setIsEditOpen(false);
          }}
        />
      )}
      {isCreateOpen && (
        <JobForm
          onClose={() => setIsCreateOpen(false)}
          onSave={() => {
            setRefresh((prev) => prev + 1);
            setIsCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}