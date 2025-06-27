"use client";

import { Button } from "@/src/components/ui/button";
import { Job as EntityJob } from "@/src/types/entities";

interface Job extends Omit<EntityJob, "jobTypeId"> {
  jobTypeId?: string;
  jobType?: { title: string };
  driver?: { name: string };
  unit?: { name: string };
  dispatcher?: { name: string };
  paymentReceived?: boolean;
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
}

export function JobView({
  job,
  onEdit,
  onDelete,
  onClose,
}: JobViewProps) {
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

  const formatArray = (value?: string | string[]) => {
    if (!value) return "—";
    if (Array.isArray(value)) return value.join(", ");
    return value;
  };

  return (
    <div className="slide-over-form">
      <div className="form-section">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Job ID
            </div>
            <div className="font-mono text-base">{job.jobId}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Date
            </div>
            <div className="text-base">{formatDate(job.jobDate)}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Job Type
            </div>
            <div className="text-base">{job.jobType?.title || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Driver
            </div>
            <div className="text-base">{job.driver?.name || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Unit
            </div>
            <div className="text-base">{job.unit?.name || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Dispatcher
            </div>
            <div className="text-base">{job.dispatcher?.name || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Status
            </div>
            <div className="text-base">{job.status || "Pending"}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Gross Amount
            </div>
            <div className="text-base">{formatCurrency(job.jobGrossAmount)}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Payment Status
            </div>
            <div className="text-base">
              {job.paymentReceived ? "Payment Received" : "Payment Pending"}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Invoice Status
            </div>
            <div className="text-base">
              {job.invoiceId ? "Invoiced" : "Not Invoiced"}
            </div>
          </div>

          {job.startTime && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Start Time
              </div>
              <div className="text-base">{job.startTime}</div>
            </div>
          )}

          {job.endTime && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                End Time
              </div>
              <div className="text-base">{job.endTime}</div>
            </div>
          )}

          {job.weight && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Weight
              </div>
              <div className="text-base">{formatArray(job.weight)}</div>
            </div>
          )}

          {job.loads && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Loads
              </div>
              <div className="text-base">{job.loads}</div>
            </div>
          )}

          {job.tickets && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Tickets
              </div>
              <div className="text-base">{formatArray(job.tickets)}</div>
            </div>
          )}

          {(job.startLocation || job.endLocation) && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Route
              </div>
              <div className="text-base">
                {job.startLocation && job.endLocation
                  ? `${job.startLocation} to ${job.endLocation}`
                  : job.startLocation || job.endLocation || "—"}
              </div>
            </div>
          )}

          {job.description && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Description
              </div>
              <div className="text-base whitespace-pre-wrap">
                {job.description}
              </div>
            </div>
          )}

          {job.imageUrls && job.imageUrls.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
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