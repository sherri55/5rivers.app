"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/src/components/ui/alert";
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

interface DispatcherDetailsProps {
  dispatcher: Dispatcher | null;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function DispatcherDetails({
  dispatcher,
  onDelete,
  onEdit,
}: DispatcherDetailsProps) {
  if (!dispatcher) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Dispatcher Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="default">
            <AlertTitle>No Dispatcher Selected</AlertTitle>
            <AlertDescription>
              Please select a dispatcher from the list to view details.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const formatCommission = (value?: number) => {
    if (value === undefined || value === null) return "—";
    return `${value}%`;
  };

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Dispatcher Details</CardTitle>
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
            <div className="font-medium text-base">{dispatcher.name}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Email
            </div>
            <div className="text-base">{dispatcher.email || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Phone
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
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Description
            </div>
            <div className="text-base whitespace-pre-wrap">
              {dispatcher.description || "—"}
            </div>
          </div>
        </div>
        {onDelete && (
          <div className="flex justify-end mt-6">
            <Button type="button" variant="destructive" onClick={onDelete}>
              Delete Dispatcher
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
