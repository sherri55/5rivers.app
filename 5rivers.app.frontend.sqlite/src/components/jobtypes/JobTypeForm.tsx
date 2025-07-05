import { useState, useEffect } from "react";
import { jobTypeApi, companyApi } from "@/src/lib/api";
import { Button } from "../ui/button";
import { FormField } from "../common/FormField";
import { toast } from "sonner";
import type { JobType } from "@/src/types/entities";

interface JobTypeFormProps {
  jobType?: JobType;
  onSuccess: () => void;
  onCancel: () => void;
}

export function JobTypeForm({
  jobType,
  onSuccess,
  onCancel,
}: JobTypeFormProps) {
  const [title, setTitle] = useState(jobType?.title || "");
  const [startLocation, setStartLocation] = useState(
    jobType?.startLocation || ""
  );
  const [endLocation, setEndLocation] = useState(jobType?.endLocation || "");
  const [dispatchType, setDispatchType] = useState(jobType?.dispatchType || "");
  const [rateOfJob, setRateOfJob] = useState(jobType?.rateOfJob || "");
  const [companyId, setCompanyId] = useState(jobType?.companyId || "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [companyOptions, setCompanyOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    companyApi.fetchAll({ pageSize: 10000 }).then((response: any) => {
      // Handle paginated response format
      const companies = response.data || response;
      setCompanyOptions(
        companies
          .slice()
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
          .map((c: any) => ({ value: c.companyId || "", label: c.name }))
      );
    });
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const form = {
        title,
        startLocation,
        endLocation,
        dispatchType,
        rateOfJob,
        companyId,
      };
      if (jobType && jobType.jobTypeId) {
        await jobTypeApi.update(jobType.jobTypeId, form);
        toast.success("Job type updated successfully");
      } else {
        await jobTypeApi.create(form);
        toast.success("Job type created successfully");
      }
      onSuccess();
    } catch {
      toast.error("Failed to save job type");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="slide-over-form">
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <FormField
            id="title"
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Enter title"
            required
            error={errors.title}
          />
          
          <div className="form-row-2">
            <FormField
              id="startLocation"
              label="Start Location"
              value={startLocation}
              onChange={setStartLocation}
              placeholder="Enter start location"
            />
            <FormField
              id="endLocation"
              label="End Location"
              value={endLocation}
              onChange={setEndLocation}
              placeholder="Enter end location"
            />
          </div>

          <div className="form-row-2">
            <FormField
              id="dispatchType"
              label="Dispatch Type"
              type="select"
              value={dispatchType}
              onChange={setDispatchType}
              options={[
                { value: "Hourly", label: "Hourly" },
                { value: "Tonnage", label: "Tonnage" },
                { value: "Load", label: "Load" },
                { value: "Fixed", label: "Fixed" },
              ]}
              placeholder="Select dispatch type"
            />
            <FormField
              id="rateOfJob"
              label="Rate"
              type="number"
              value={rateOfJob}
              onChange={setRateOfJob}
              placeholder="Enter rate"
            />
          </div>

          <FormField
            id="companyId"
            label="Company"
            type="select"
            value={companyId}
            onChange={setCompanyId}
            options={companyOptions}
            placeholder="Select company"
            required
            error={errors.companyId}
          />
        </div>

        <div className="form-actions sticky">
          <div className="btn-group">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              style={{
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                color: '#374151',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: jobType ? '#f97316' : '#2563eb',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {loading
                ? jobType
                  ? "Updating..."
                  : "Creating..."
                : jobType
                ? "Update Job Type"
                : "Create Job Type"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
