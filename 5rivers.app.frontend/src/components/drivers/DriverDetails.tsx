"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { DataTable, Column } from "../../components/common/DataTable";
import { driverRateApi } from "@/src/lib/api";

interface Driver {
  driverId: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  hourlyRate?: number;
  activeJobsCount?: number;
}

interface DriverRate {
  driverRateId: string;
  jobType: {
    jobTypeId: string;
    title: string;
  };
  hourlyRate?: number;
  percentage?: number;
  createdAt: string;
}

interface DriverDetailsProps {
  driver: Driver | null;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function DriverDetails({
  driver,
  onDelete,
  onEdit,
}: DriverDetailsProps) {
  const [driverRates, setDriverRates] = useState<DriverRate[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);

  useEffect(() => {
    if (driver?.driverId) {
      setLoadingRates(true);
      driverRateApi
        .fetchByDriver(driver.driverId)
        .then((data) => {
          setDriverRates(data);
          setLoadingRates(false);
        })
        .catch((error) => {
          console.error("Failed to load driver rates:", error);
          setLoadingRates(false);
        });
    } else {
      setDriverRates([]);
    }
  }, [driver]);

  if (!driver) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Driver Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="default">
            <AlertTitle>No Driver Selected</AlertTitle>
            <AlertDescription>
              Please select a driver from the list to view details.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return "—";
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (value?: number) => {
    if (value === undefined || value === null) return "—";
    return `${value}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const rateColumns: Column<DriverRate>[] = [
    {
      header: "Job Type",
      accessorKey: "jobType",
      cell: (row) => row.jobType.title,
    },
    {
      header: "Hourly Rate",
      accessorKey: "hourlyRate",
      cell: (row) => formatCurrency(row.hourlyRate),
    },
    {
      header: "Percentage",
      accessorKey: "percentage",
      cell: (row) => formatPercentage(row.percentage),
    },
    {
      header: "Created",
      accessorKey: "createdAt",
      cell: (row) => formatDate(row.createdAt),
    },
  ];

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Driver Details</CardTitle>
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
            <div className="font-medium text-base">{driver.name}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Email
            </div>
            <div className="text-base">{driver.email || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Phone
            </div>
            <div className="text-base">{driver.phone || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Default Hourly Rate
            </div>
            <div className="text-base">{formatCurrency(driver.hourlyRate)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Active Jobs
            </div>
            <div className="text-base">{driver.activeJobsCount || 0}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Description
            </div>
            <div className="text-base whitespace-pre-wrap">
              {driver.description || "—"}
            </div>
          </div>
        </div>

        {/* Driver Rates Section */}
        <div className="mt-6">
          <h3 className="text-base font-semibold mb-2">Job Type Rates</h3>

          <DataTable
            data={driverRates}
            columns={rateColumns}
            loading={loadingRates}
            emptyTitle="No Job Type Rates"
            emptyDescription="This driver has no specific job type rates configured."
          />
        </div>

        {onDelete && (
          <div className="flex justify-end mt-6">
            <Button type="button" variant="destructive" onClick={onDelete}>
              Delete Driver
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
