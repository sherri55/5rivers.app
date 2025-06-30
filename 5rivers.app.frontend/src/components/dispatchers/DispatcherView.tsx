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
    <div className="slide-over-form slide-over-view">
      <div className="form-section">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="view-field-label">
              Name
            </div>
            <div className="view-field-value font-medium">{dispatcher.name}</div>
          </div>

          <div>
            <div className="view-field-label">
              Email Address
            </div>
            <div className="view-field-value">{dispatcher.email || "—"}</div>
          </div>

          <div>
            <div className="view-field-label">
              Phone Number
            </div>
            <div className="view-field-value">{dispatcher.phone || "—"}</div>
          </div>

          <div>
            <div className="view-field-label">
              Commission Rate
            </div>
            <div className="view-field-value">
              {formatCommission(dispatcher.commissionPercentage)}
            </div>
          </div>

          <div>
            <div className="view-field-label">
              Jobs Count
            </div>
            <div className="view-field-value">{dispatcher.jobsCount || 0}</div>
          </div>

          <div>
            <div className="view-field-label">
              Invoices Count
            </div>
            <div className="view-field-value">{dispatcher.invoicesCount || 0}</div>
          </div>

          {dispatcher.description && (
            <div>
              <div className="view-field-label">
                Description
              </div>
              <div className="view-field-value whitespace-pre-wrap">
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