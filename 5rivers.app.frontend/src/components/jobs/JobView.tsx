"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Job as EntityJob } from "@/src/types/entities";
import { jobApi } from "@/src/lib/api";
import { toast } from "sonner";

interface Job extends Omit<EntityJob, "jobTypeId"> {
  jobTypeId?: string;
  jobType?: { title: string };
  driver?: { name: string };
  unit?: { name: string };
  dispatcher?: { name: string };
  paymentReceived?: boolean;
  driverPaid?: boolean;
  startTime?: string;
  endTime?: string;
  weight?: string | string[];
  loads?: number;
  tickets?: string | string[];
  startLocation?: string;
  endLocation?: string;
  imageUrls?: string[];
  description?: string;
}

interface JobViewProps {
  job: Job;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  onUpdate?: (updatedJob: Job) => void;
}

export function JobView({
  job,
  onEdit,
  onDelete,
  onClose,
  onUpdate,
}: JobViewProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const formatCurrency = (value?: number | string) => {
    if (value === undefined || value === null) return "—";
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return "—";
    return `$${numValue.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "—";
    try {
      // If it's already a formatted time string, return as is
      if (timeString.includes(':')) {
        return timeString;
      }
      // If it's a timestamp, format it
      const date = new Date(timeString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString;
    }
  };

  const formatArray = (value?: string | string[]) => {
    if (!value) return "—";
    if (Array.isArray(value)) return value.join(", ");
    return value;
  };

  const handleToggleDriverPaid = async () => {
    if (!job.jobId) return;
    
    setIsUpdating(true);
    try {
      const updated = await jobApi.toggleDriverPaid(job.jobId);
      if (onUpdate) {
        onUpdate({ ...job, ...updated });
      }
      toast.success(
        updated.driverPaid ? "Driver marked as paid" : "Driver marked as unpaid"
      );
    } catch (error) {
      toast.error("Failed to toggle driver payment status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="slide-over-form slide-over-view">
      <div className="form-section">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="view-field-label">
              Job ID
            </div>
            <div className="view-field-value font-mono">{job.jobId}</div>
          </div>

          <div>
            <div className="view-field-label">
              Date
            </div>
            <div className="view-field-value">{formatDate(job.jobDate)}</div>
          </div>

          <div>
            <div className="view-field-label">
              Job Type
            </div>
            <div className="view-field-value">{job.jobType?.title || "—"}</div>
          </div>

          <div>
            <div className="view-field-label">
              Driver
            </div>
            <div className="view-field-value">{job.driver?.name || "—"}</div>
          </div>

          <div>
            <div className="view-field-label">
              Unit
            </div>
            <div className="view-field-value">{job.unit?.name || "—"}</div>
          </div>

          <div>
            <div className="view-field-label">
              Dispatcher
            </div>
            <div className="view-field-value">{job.dispatcher?.name || "—"}</div>
          </div>

          <div>
            <div className="view-field-label">
              Status
            </div>
            <div className="view-field-value">{job.status || "Pending"}</div>
          </div>

          <div>
            <div className="view-field-label">
              Gross Amount
            </div>
            <div className="view-field-value">{formatCurrency(job.jobGrossAmount)}</div>
          </div>

          <div>
            <div className="view-field-label">
              Payment Status
            </div>
            <div className="view-field-value">
              {job.paymentReceived ? "Payment Received" : "Payment Pending"}
            </div>
          </div>

          <div>
            <div className="view-field-label">
              Driver Pay Status
            </div>
            <div className="view-field-value flex items-center gap-3">
              <span>{job.driverPaid ? "Driver Paid" : "Driver Unpaid"}</span>
              <Button
                size="sm"
                variant={job.driverPaid ? "default" : "outline"}
                onClick={handleToggleDriverPaid}
                disabled={isUpdating}
                className={job.driverPaid ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {isUpdating ? "Updating..." : job.driverPaid ? "Mark Unpaid" : "Mark Paid"}
              </Button>
            </div>
          </div>

          <div>
            <div className="view-field-label">
              Invoice Status
            </div>
            <div className="view-field-value">
              {job.invoiceId ? "Invoiced" : "Not Invoiced"}
            </div>
          </div>

          {job.startTime && (
            <div>
              <div className="view-field-label">
                Start Time
              </div>
              <div className="view-field-value">{formatTime(job.startTime)}</div>
            </div>
          )}

          {job.endTime && (
            <div>
              <div className="view-field-label">
                End Time
              </div>
              <div className="view-field-value">{formatTime(job.endTime)}</div>
            </div>
          )}

          {job.weight && (
            <div>
              <div className="view-field-label">
                Weight
              </div>
              <div className="view-field-value">{formatArray(job.weight)}</div>
            </div>
          )}

          {job.loads && (
            <div>
              <div className="view-field-label">
                Loads
              </div>
              <div className="view-field-value">{job.loads}</div>
            </div>
          )}

          {job.tickets && (
            <div>
              <div className="view-field-label">
                Tickets
              </div>
              <div className="view-field-value">{formatArray(job.tickets)}</div>
            </div>
          )}

          {(job.startLocation || job.endLocation) && (
            <div>
              <div className="view-field-label">
                Route
              </div>
              <div className="view-field-value">
                {job.startLocation && job.endLocation
                  ? `${job.startLocation} to ${job.endLocation}`
                  : job.startLocation || job.endLocation || "—"}
              </div>
            </div>
          )}

          {job.description && (
            <div>
              <div className="view-field-label">
                Description
              </div>
              <div className="view-field-value whitespace-pre-wrap">
                {job.description}
              </div>
            </div>
          )}

          {job.imageUrls && job.imageUrls.length > 0 && (
            <div>
              <div className="view-field-label">
                Images
              </div>
              <div className="grid grid-cols-2 gap-2">
                {job.imageUrls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={url}
                      alt={`Job image ${index + 1}`}
                      className="w-24 h-24 object-cover rounded border"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
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