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
    <div className="slide-over-form">
      <div className="form-section">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Company Name
            </div>
            <div className="font-medium text-base">{company.name}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Email Address
            </div>
            <div className="text-base">{company.email || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Phone Number
            </div>
            <div className="text-base">{company.phone || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Job Types Count
            </div>
            <div className="text-base">{company.jobTypesCount || 0}</div>
          </div>

          {company.description && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Description
              </div>
              <div className="text-base whitespace-pre-wrap">
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