"use client";

import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { FormField } from "../../components/common/FormField";
import { driverRateApi, jobTypeApi } from "@/src/lib/api";
import { toast } from "sonner";

interface JobType {
  jobTypeId: string;
  title: string;
}

interface DriverRate {
  driverRateId: string;
  driverId: string;
  jobTypeId: string;
  hourlyRate?: number;
  percentage?: number;
}

interface DriverRateFormProps {
  driverId: string;
  driverRate?: DriverRate;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DriverRateForm({
  driverId,
  driverRate,
  onSuccess,
  onCancel,
}: DriverRateFormProps) {
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [selectedJobTypeId, setSelectedJobTypeId] = useState(
    driverRate?.jobTypeId || ""
  );
  const [hourlyRate, setHourlyRate] = useState<number | undefined>(
    driverRate?.hourlyRate
  );
  const [percentage, setPercentage] = useState<number | undefined>(
    driverRate?.percentage
  );
  const [loading, setLoading] = useState(false);
  const [loadingJobTypes, setLoadingJobTypes] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load job types
  useEffect(() => {
    setLoadingJobTypes(true);
    jobTypeApi
      .fetchAll()
      .then((data) => {
        setJobTypes(data);
        setLoadingJobTypes(false);
      })
      .catch((error) => {
        console.error("Failed to load job types:", error);
        toast.error("Failed to load job types");
        setLoadingJobTypes(false);
      });
  }, []);

  // Reset form when driverRate changes
  useEffect(() => {
    if (driverRate) {
      setSelectedJobTypeId(driverRate.jobTypeId);
      setHourlyRate(driverRate.hourlyRate);
      setPercentage(driverRate.percentage);
    } else {
      setSelectedJobTypeId("");
      setHourlyRate(undefined);
      setPercentage(undefined);
    }
  }, [driverRate]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedJobTypeId) {
      newErrors.jobTypeId = "Job type is required";
    }

    if (hourlyRate === undefined && percentage === undefined) {
      newErrors.rates = "Either hourly rate or percentage must be specified";
    }

    if (hourlyRate !== undefined && hourlyRate < 0) {
      newErrors.hourlyRate = "Hourly rate cannot be negative";
    }

    if (percentage !== undefined && (percentage < 0 || percentage > 100)) {
      newErrors.percentage = "Percentage must be between 0 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const rateData = {
        driverId,
        jobTypeId: selectedJobTypeId,
        hourlyRate,
        percentage,
      };

      if (driverRate?.driverRateId) {
        await driverRateApi.update(driverRate.driverRateId, rateData);
        toast.success("Rate updated successfully");
      } else {
        await driverRateApi.create(rateData);
        toast.success("Rate added successfully");
      }

      setLoading(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving rate:", error);
      toast.error(`Failed to ${driverRate ? "update" : "add"} rate`);
      setLoading(false);
    }
  };

  const jobTypeOptions = jobTypes.map((jobType) => ({
    value: jobType.jobTypeId,
    label: jobType.title,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        id="jobTypeId"
        label="Job Type"
        type="select"
        value={selectedJobTypeId}
        onChange={setSelectedJobTypeId}
        placeholder={
          loadingJobTypes ? "Loading job types..." : "Select job type"
        }
        options={jobTypeOptions}
        required
        error={errors.jobTypeId}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="hourlyRate"
          label="Hourly Rate"
          type="number"
          value={hourlyRate || ""}
          onChange={(val) => {
            setHourlyRate(val === "" ? undefined : Number(val));
            if (val) setPercentage(undefined);
          }}
          placeholder="Enter hourly rate"
          min={0}
          step={0.01}
          error={errors.hourlyRate || errors.rates}
        />

        <FormField
          id="percentage"
          label="Percentage"
          type="number"
          value={percentage || ""}
          onChange={(val) => {
            setPercentage(val === "" ? undefined : Number(val));
            if (val) setHourlyRate(undefined);
          }}
          placeholder="Enter percentage"
          min={0}
          max={100}
          step={0.1}
          error={errors.percentage}
        />
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Note: Enter either an hourly rate OR a percentage, not both.
      </p>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || loadingJobTypes}
          className={
            driverRate
              ? "bg-orange-500 hover:bg-orange-600 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }
        >
          {loading ? "Saving..." : driverRate ? "Update Rate" : "Add Rate"}
        </Button>
      </div>
    </form>
  );
}
