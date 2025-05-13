import { useState, useEffect } from "react";
import { jobTypeApi, companyApi, dispatcherApi } from "@/src/lib/api";
import { Button } from "../ui/button";
import { FormField } from "../common/FormField";
import { toast } from "sonner";
import type { JobType, Company, Dispatcher } from "@/src/types/entities";

interface JobTypeFormProps {
  jobType?: JobType;
  onSuccess: () => void;
  onCancel: () => void;
}

export function JobTypeForm({ jobType, onSuccess, onCancel }: JobTypeFormProps) {
  const [title, setTitle] = useState(jobType?.title || "");
  const [startLocation, setStartLocation] = useState(jobType?.startLocation || "");
  const [endLocation, setEndLocation] = useState(jobType?.endLocation || "");
  const [dispatchType, setDispatchType] = useState(jobType?.dispatchType || "");
  const [rateOfJob, setRateOfJob] = useState(jobType?.rateOfJob || "");
  const [companyId, setCompanyId] = useState(jobType?.companyId || "");
  const [dispatcherId, setDispatcherId] = useState(jobType?.dispatcherId || "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [companyOptions, setCompanyOptions] = useState<{ value: string; label: string }[]>([]);
  const [dispatcherOptions, setDispatcherOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    companyApi.fetchAll().then((companies: Company[]) => {
      setCompanyOptions(
        companies.map((c) => ({ value: c.companyId || "", label: c.name }))
      );
    });
    dispatcherApi.fetchAll().then((dispatchers: Dispatcher[]) => {
      setDispatcherOptions(
        dispatchers.map((d) => ({ value: d.dispatcherId || "", label: d.name }))
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
        dispatcherId,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        id="title"
        label="Title"
        value={title}
        onChange={setTitle}
        placeholder="Enter title"
        required
        error={errors.title}
      />
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
      <FormField
        id="dispatcherId"
        label="Dispatcher"
        type="select"
        value={dispatcherId}
        onChange={setDispatcherId}
        options={dispatcherOptions}
        placeholder="Select dispatcher"
        error={errors.dispatcherId}
      />
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? (jobType ? "Updating..." : "Creating...") : jobType ? "Update Job Type" : "Create Job Type"}</Button>
      </div>
    </form>
  );
}
