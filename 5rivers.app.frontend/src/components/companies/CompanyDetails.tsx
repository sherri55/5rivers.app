"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/src/components/ui/alert";
import { Button } from "@/src/components/ui/button";

interface Company {
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  jobTypesCount?: number;
}

interface CompanyDetailsProps {
  company: Company | null;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function CompanyDetails({
  company,
  onDelete,
  onEdit,
}: CompanyDetailsProps) {
  if (!company) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="default">
            <AlertTitle>No Company Selected</AlertTitle>
            <AlertDescription>
              Please select a company from the list to view its details.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Company Details</CardTitle>
        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Name
            </div>
            <div className="font-medium text-base">{company.name}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Email
            </div>
            <div className="text-base">{company.email || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Phone
            </div>
            <div className="text-base">{company.phone || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Job Types
            </div>
            <div className="text-base">{company.jobTypesCount || 0}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Description
            </div>
            <div className="text-base whitespace-pre-wrap">
              {company.description || "—"}
            </div>
          </div>
        </div>
        {onDelete && (
          <div className="flex justify-end mt-6">
            <Button type="button" variant="destructive" onClick={onDelete}>
              Delete Company
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
