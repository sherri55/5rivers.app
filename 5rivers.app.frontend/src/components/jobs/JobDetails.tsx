import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";

interface JobDetailsProps {
  job: any;
  onDelete: () => void;
  onEdit: () => void;
}

export function JobDetails({ job, onDelete, onEdit }: JobDetailsProps) {
  if (!job) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">No job selected.</div>
        </CardContent>
      </Card>
    );
  }

  // Parse imageUrls if it's a string
  const imageUrls =
    typeof job.imageUrls === "string"
      ? (() => {
          try {
            return JSON.parse(job.imageUrls);
          } catch {
            return [];
          }
        })()
      : Array.isArray(job.imageUrls)
      ? job.imageUrls
      : [];

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Job Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
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
            <div className="text-base">{job.jobDate}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Status
            </div>
            <div className="text-base">{job.status || job.invoiceStatus}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Driver
            </div>
            <div className="text-base">
              {job.driver?.name || job.driverId || "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Job Type
            </div>
            <div className="text-base">
              {job.jobType?.title || job.jobTypeId || "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Unit
            </div>
            <div className="text-base">
              {job.unit?.name || job.unitId || "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Dispatcher
            </div>
            <div className="text-base">
              {job.dispatcher?.name || job.dispatcherId || "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Gross Amount
            </div>
            <div className="text-base">{job.jobGrossAmount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Start Time
            </div>
            <div className="text-base">{job.startTime || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              End Time
            </div>
            <div className="text-base">{job.endTime || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Weight
            </div>
            <div className="text-base">
              {job.weight
                ? Array.isArray(job.weight)
                  ? job.weight.join(", ")
                  : job.weight
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Loads
            </div>
            <div className="text-base">{job.loads || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Invoice
            </div>
            <div className="text-base">{job.invoiceId || "—"}</div>
          </div>
        </div>
        {/* Show job images if present */}
        {imageUrls.length > 0 && (
          <div className="mt-6">
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Images
            </div>
            <div className="flex flex-wrap gap-2">
              {imageUrls.map((url: string, idx: number) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={url}
                    alt={`Job Image ${idx + 1}`}
                    className="w-24 h-24 object-cover rounded border"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end mt-6 gap-2">
          <Button type="button" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button type="button" variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
