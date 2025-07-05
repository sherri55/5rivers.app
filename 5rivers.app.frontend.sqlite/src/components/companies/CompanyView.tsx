"use client";

import { Button } from "@/src/components/ui/button";

interface Company {
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  jobTypesCount?: number;
}

interface CompanyViewProps {
  company: Company;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function CompanyView({
  company,
  onEdit,
  onDelete,
  onClose,
}: CompanyViewProps) {
  return (
    <div className="slide-over-form slide-over-view">
      <div className="form-section">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="view-field-label">
              Company Name
            </div>
            <div className="view-field-value font-medium">{company.name}</div>
          </div>

          <div>
            <div className="view-field-label">
              Email Address
            </div>
            <div className="view-field-value">{company.email || "—"}</div>
          </div>

          <div>
            <div className="view-field-label">
              Phone Number
            </div>
            <div className="view-field-value">{company.phone || "—"}</div>
          </div>

          <div>
            <div className="view-field-label">
              Job Types Count
            </div>
            <div className="view-field-value">{company.jobTypesCount || 0}</div>
          </div>

          {company.description && (
            <div>
              <div className="view-field-label">
                Description
              </div>
              <div className="view-field-value whitespace-pre-wrap">
                {company.description}
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