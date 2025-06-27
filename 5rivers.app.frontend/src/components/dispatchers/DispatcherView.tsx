"use client";

import { Button } from "@/src/components/ui/button";

interface Dispatcher {
  dispatcherId: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  commissionPercentage?: number;
  jobsCount?: number;
  invoicesCount?: number;
}

interface DispatcherViewProps {
  dispatcher: Dispatcher;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function DispatcherView({
  dispatcher,
  onEdit,
  onDelete,
  onClose,
}: DispatcherViewProps) {
  const formatCommission = (value?: number) => {
    if (value === undefined || value === null) return "—";
    return `${value}%`;
  };

  return (
    <div className="slide-over-form">
      <div className="form-section">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Name
            </div>
            <div className="font-medium text-base">{dispatcher.name}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Email Address
            </div>
            <div className="text-base">{dispatcher.email || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Phone Number
            </div>
            <div className="text-base">{dispatcher.phone || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Commission Rate
            </div>
            <div className="text-base">
              {formatCommission(dispatcher.commissionPercentage)}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Jobs Count
            </div>
            <div className="text-base">{dispatcher.jobsCount || 0}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Invoices Count
            </div>
            <div className="text-base">{dispatcher.invoicesCount || 0}</div>
          </div>

          {dispatcher.description && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Description
              </div>
              <div className="text-base whitespace-pre-wrap">
                {dispatcher.description}
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