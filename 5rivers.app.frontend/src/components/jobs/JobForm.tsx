import { useState, useEffect } from "react";
import {
  jobApi,
  jobTypeApi,
  driverApi,
  unitApi,
  dispatcherApi,
} from "@/src/lib/api";
import { Button } from "../ui/button";
import { FormField } from "../common/FormField";
import { toast } from "sonner";
import type {
  Job,
  JobType,
  Driver,
  Unit,
  Dispatcher,
} from "@/src/types/entities";

interface JobFormProps {
  job?: Job;
  onSuccess: () => void;
  onCancel: () => void;
}

export function JobForm({ job, onSuccess, onCancel }: JobFormProps) {
  const [jobDate, setJobDate] = useState(job?.jobDate || "");
  const [jobTypeId, setJobTypeId] = useState(job?.jobTypeId || "");
  const [driverId, setDriverId] = useState(job?.driverId || "");
  const [unitId, setUnitId] = useState(job?.unitId || "");
  const [dispatcherId, setDispatcherId] = useState(job?.dispatcherId || "");
  const [status, setStatus] = useState(job?.status || "");
  const [jobGrossAmount, setJobGrossAmount] = useState(
    job?.jobGrossAmount || ""
  );
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [tonnageTags, setTonnageTags] = useState<Array<string>>([]);
  const [tonnageInput, setTonnageInput] = useState("");
  const [loads, setLoads] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(true);

  useEffect(() => {
    setDropdownLoading(true);
    Promise.all([
      jobTypeApi.fetchAll(),
      driverApi.fetchAll(),
      unitApi.fetchAll(),
      dispatcherApi.fetchAll(),
    ])
      .then(([jobTypes, drivers, units, dispatchers]) => {
        setJobTypes(jobTypes);
        setDrivers(drivers);
        setUnits(units);
        setDispatchers(dispatchers);
        setDropdownLoading(false);
      })
      .catch(() => setDropdownLoading(false));
  }, []);

  // Populate all fields from job when editing
  useEffect(() => {
    if (job) {
      setJobDate(job.jobDate ? job.jobDate.slice(0, 10) : "");
      setJobTypeId(job.jobTypeId || "");
      setDriverId(job.driverId || "");
      setUnitId(job.unitId || "");
      setDispatcherId(job.dispatcherId || "");
      setStatus(job.status || job.invoiceStatus || "");
      setJobGrossAmount(
        job.jobGrossAmount ? job.jobGrossAmount.toString() : ""
      );
      setStartTime(job.startTime || "");
      setEndTime(job.endTime || "");
      setLoads(
        job.loads !== undefined && job.loads !== null
          ? job.loads.toString()
          : ""
      );
      // Handle weight/tonnageTags (array or JSON string)
      if (job.weight) {
        if (Array.isArray(job.weight)) {
          setTonnageTags(job.weight.map(String));
        } else {
          try {
            const parsed = JSON.parse(job.weight);
            if (Array.isArray(parsed)) setTonnageTags(parsed.map(String));
            else if (typeof parsed === "string") setTonnageTags([parsed]);
            else setTonnageTags([]);
          } catch {
            setTonnageTags([String(job.weight)]);
          }
        }
      } else {
        setTonnageTags([]);
      }
    }
  }, [job]);

  // Helper to get selected jobType object
  const selectedJobType = jobTypes.find((jt) => jt.jobTypeId === jobTypeId);
  const dispatchType = selectedJobType?.dispatchType;
  const rateOfJob = parseFloat(selectedJobType?.rateOfJob as string) || 0;

  // Calculate gross amount based on job type
  useEffect(() => {
    if (dispatchType === "Fixed") {
      // Do not auto-calculate, allow manual entry
      return;
    }
    let gross = 0;
    if (dispatchType === "Hourly") {
      if (startTime && endTime) {
        const [sh, sm] = startTime.split(":").map(Number);
        const [eh, em] = endTime.split(":").map(Number);
        const start = sh * 60 + sm;
        let end = eh * 60 + em;
        if (end < start) end += 24 * 60;
        const minutes = end - start;
        // Round up to next 15-minute increment
        const roundedMinutes = Math.ceil(minutes / 15) * 15;
        const hours = roundedMinutes / 60;
        gross = hours * rateOfJob;
      }
    } else if (dispatchType === "Tonnage") {
      const totalTonnage = tonnageTags.map(Number).reduce((a, b) => a + b, 0);
      gross = totalTonnage * rateOfJob;
    } else if (dispatchType === "Load") {
      gross = (parseInt(loads, 10) || 0) * rateOfJob;
    }
    setJobGrossAmount(gross ? gross.toFixed(2) : "");
  }, [dispatchType, rateOfJob, startTime, endTime, tonnageTags, loads]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!jobDate) newErrors.jobDate = "Date is required";
    if (!jobTypeId) newErrors.jobTypeId = "Job Type ID is required";
    if (!driverId) newErrors.driverId = "Driver ID is required";
    if (!unitId) newErrors.unitId = "Unit is required";
    if (!dispatcherId) newErrors.dispatcherId = "Dispatcher is required";
    if (dispatchType === "Hourly") {
      if (!startTime) newErrors.startTime = "Start time is required";
      if (!endTime) newErrors.endTime = "End time is required";
    }
    if (dispatchType === "Tonnage" && tonnageTags.length === 0) {
      newErrors.tonnage = "At least one tonnage entry is required";
    }
    if (dispatchType === "Load" && !loads) {
      newErrors.loads = "Number of loads is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddTonnage = () => {
    if (tonnageInput && !isNaN(Number(tonnageInput))) {
      setTonnageTags([...tonnageTags, tonnageInput]);
      setTonnageInput("");
    }
  };
  const handleRemoveTonnage = (idx: number) => {
    setTonnageTags(tonnageTags.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const form: any = {
        jobDate,
        jobTypeId,
        driverId,
        unitId,
        dispatcherId,
        status,
        jobGrossAmount,
      };
      if (dispatchType === "Hourly") {
        form.startTime = startTime;
        form.endTime = endTime;
      }
      if (dispatchType === "Tonnage") {
        form.weight = tonnageTags;
      }
      if (dispatchType === "Load") {
        form.loads = loads;
      }
      if (job && job.jobId) {
        await jobApi.update(job.jobId, form);
        toast.success("Job updated successfully");
      } else {
        await jobApi.create(form);
        toast.success("Job created successfully");
      }
      onSuccess();
    } catch {
      toast.error("Failed to save job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        id="jobDate"
        label="Date"
        type="date"
        value={jobDate}
        onChange={setJobDate}
        required
        error={errors.jobDate}
      />
      <FormField
        id="jobTypeId"
        label="Job Type"
        type="select"
        value={jobTypeId}
        onChange={setJobTypeId}
        options={jobTypes.map((jt) => ({
          value: jt.jobTypeId || "",
          label: jt.title,
        }))}
        placeholder={
          dropdownLoading ? "Loading job types..." : "Select job type"
        }
        required
        error={errors.jobTypeId}
      />
      <FormField
        id="driverId"
        label="Driver"
        type="select"
        value={driverId}
        onChange={setDriverId}
        options={drivers.map((d) => ({
          value: d.driverId || "",
          label: d.name,
        }))}
        placeholder={dropdownLoading ? "Loading drivers..." : "Select driver"}
        required
        error={errors.driverId}
      />
      <FormField
        id="unitId"
        label="Unit"
        type="select"
        value={unitId}
        onChange={setUnitId}
        options={units.map((u) => ({ value: u.unitId || "", label: u.name }))}
        placeholder={dropdownLoading ? "Loading units..." : "Select unit"}
        required
        error={errors.unitId}
      />
      <FormField
        id="dispatcherId"
        label="Dispatcher"
        type="select"
        value={dispatcherId}
        onChange={setDispatcherId}
        options={dispatchers.map((d) => ({
          value: d.dispatcherId || "",
          label: d.name,
        }))}
        placeholder={
          dropdownLoading ? "Loading dispatchers..." : "Select dispatcher"
        }
        required
        error={errors.dispatcherId}
      />
      {/* Conditional fields based on job type */}
      {dispatchType === "Hourly" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label
              htmlFor="startTime"
              className="font-medium after:content-['*'] after:text-red-500 after:ml-0.5"
            >
              Start Time
            </label>
            <input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="mt-1 border rounded px-2 py-1 w-full"
            />
            {errors.startTime && (
              <p className="text-destructive text-sm mt-1">
                {errors.startTime}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label
              htmlFor="endTime"
              className="font-medium after:content-['*'] after:text-red-500 after:ml-0.5"
            >
              End Time
            </label>
            <input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="mt-1 border rounded px-2 py-1 w-full"
            />
            {errors.endTime && (
              <p className="text-destructive text-sm mt-1">{errors.endTime}</p>
            )}
          </div>
        </div>
      )}
      {dispatchType === "Tonnage" && (
        <div>
          <label className="block font-medium mb-1">Tonnage per Trip</label>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={tonnageInput}
              onChange={(e) => setTonnageInput(e.target.value)}
              className="border rounded px-2 py-1 w-32"
              placeholder="Enter tonnage"
            />
            <Button
              type="button"
              onClick={handleAddTonnage}
              disabled={!tonnageInput || isNaN(Number(tonnageInput))}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tonnageTags.map((tag, idx) => (
              <span
                key={idx}
                className="bg-gray-200 px-2 py-1 rounded flex items-center gap-1"
              >
                {tag}
                <button
                  type="button"
                  className="ml-1 text-red-500"
                  onClick={() => handleRemoveTonnage(idx)}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          {errors.tonnage && (
            <p className="text-destructive text-sm mt-1">{errors.tonnage}</p>
          )}
        </div>
      )}
      {dispatchType === "Load" && (
        <FormField
          id="loads"
          label="Number of Loads"
          type="number"
          value={loads}
          onChange={setLoads}
          required
          error={errors.loads}
        />
      )}
      <FormField
        id="jobGrossAmount"
        label="Gross Amount"
        type="number"
        value={jobGrossAmount}
        onChange={dispatchType === "Fixed" ? setJobGrossAmount : () => {}}
        placeholder={
          dispatchType === "Fixed" ? "Enter amount" : "Auto-calculated"
        }
        required
        error={errors.jobGrossAmount}
        min={0}
        step={0.01}
        readOnly={dispatchType !== "Fixed"}
      />
      <div className="flex gap-2 justify-end">
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
          disabled={loading}
          className={
            job
              ? "bg-orange-500 hover:bg-orange-600 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }
        >
          {loading
            ? job
              ? "Updating..."
              : "Creating..."
            : job
            ? "Update Job"
            : "Create Job"}
        </Button>
      </div>
    </form>
  );
}
