"use client";

import { Button } from "@/src/components/ui/button";
import { JobType } from "@/src/types/entities";

interface JobTypeViewProps {
  jobType: JobType;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function JobTypeView({
  jobType,
  onEdit,
  onDelete,
  onClose,
}: JobTypeViewProps) {
  const formatCurrency = (value?: number | string) => {
    if (value === undefined || value === null) return "—";
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return "—";
    return `$${numValue.toFixed(2)}`;
  };

  return (
    <div className="slide-over-form">
      <div className="form-section">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Job Type ID
            </div>
            <div className="font-mono text-base">{jobType.jobTypeId}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Title
            </div>
            <div className="text-base font-medium">{jobType.title}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Company
            </div>
            <div className="text-base">{(jobType as JobType & { company?: { name: string } }).company?.name || jobType.companyId || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Dispatch Type
            </div>
            <div className="text-base">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {jobType.dispatchType || "Not Specified"}
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Rate
            </div>
            <div className="text-base font-medium text-green-600">
              {formatCurrency(jobType.rateOfJob)}
              {jobType.dispatchType && (
                <span className="text-sm text-muted-foreground ml-1">
                  per {jobType.dispatchType.toLowerCase()}
                </span>
              )}
            </div>
          </div>

          {jobType.startLocation && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Start Location
              </div>
              <div className="text-base">{jobType.startLocation}</div>
            </div>
          )}

          {jobType.endLocation && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                End Location
              </div>
              <div className="text-base">{jobType.endLocation}</div>
            </div>
          )}

          {jobType.startLocation && jobType.endLocation && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Route
              </div>
              <div className="text-base">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                  {jobType.startLocation} → {jobType.endLocation}
                </span>
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Configuration Summary
            </div>
            <div className="text-base bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">
                This job type is configured for <strong>{jobType.dispatchType || "unspecified"}</strong> dispatch 
                {jobType.rateOfJob && (
                  <span> at a rate of <strong>{formatCurrency(jobType.rateOfJob)}</strong></span>
                )}
                {jobType.startLocation && jobType.endLocation && (
                  <span> for routes from <strong>{jobType.startLocation}</strong> to <strong>{jobType.endLocation}</strong></span>
                )}
                .
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="form-actions sticky">
        <div className="btn-group">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button type="button" variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}