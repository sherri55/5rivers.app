"use client";

import { useState, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import { DataTable, Column } from "@/src/components/common/DataTable";
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
  driverId: string;
  jobTypeId: string;
  hourlyRate?: number;
  percentage?: number;
  jobType: {
    jobTypeId: string;
    title: string;
  };
  createdAt: string;
}

interface DriverViewProps {
  driver: Driver;
  onEdit: () => void;
  onDelete: () => void;
  onCreateRate: () => void;
  onClose: () => void;
}

export function DriverView({
  driver,
  onEdit,
  onDelete,
  onCreateRate,
  onClose,
}: DriverViewProps) {
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
    <div className="slide-over-form slide-over-view">
      <div className="form-section">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="view-field-label">
              Name
            </div>
            <div className="view-field-value font-medium">{driver.name}</div>
          </div>

          <div>
            <div className="view-field-label">
              Email
            </div>
            <div className="view-field-value">{driver.email || "—"}</div>
          </div>

          <div>
            <div className="view-field-label">
              Phone
            </div>
            <div className="view-field-value">{driver.phone || "—"}</div>
          </div>

          <div>
            <div className="view-field-label">
              Default Hourly Rate
            </div>
            <div className="view-field-value">{formatCurrency(driver.hourlyRate)}</div>
          </div>

          <div>
            <div className="view-field-label">
              Active Jobs
            </div>
            <div className="view-field-value">{driver.activeJobsCount || 0}</div>
          </div>

          {driver.description && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Description
              </div>
              <div className="text-base whitespace-pre-wrap">
                {driver.description}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Driver Rates Section */}
      <div className="form-section">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold">Job Type Rates</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCreateRate}
          >
            Add Rate
          </Button>
        </div>

        <DataTable
          data={driverRates}
          columns={rateColumns}
          loading={loadingRates}
          emptyTitle="No Job Type Rates"
          emptyDescription="This driver has no specific job type rates configured."
        />
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