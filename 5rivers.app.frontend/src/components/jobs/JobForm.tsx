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
  const [tickets, setTickets] = useState<Array<string>>([]);
  const [ticketInput, setTicketInput] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
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
      .then(
        ([
          jobTypesResponse,
          driversResponse,
          unitsResponse,
          dispatchersResponse,
        ]) => {
          // Handle paginated response format
          const jobTypes = jobTypesResponse.data || jobTypesResponse;
          const drivers = driversResponse.data || driversResponse;
          const units = unitsResponse.data || unitsResponse;
          const dispatchers = dispatchersResponse.data || dispatchersResponse;

          setJobTypes(jobTypes);
          setDrivers(drivers);
          setUnits(units);
          setDispatchers(dispatchers);
          setDropdownLoading(false);
        }
      )
      .catch(() => setDropdownLoading(false));
  }, []);

  // Parse existing images for edit mode
  const existingImageUrls =
    job && job.imageUrls
      ? typeof job.imageUrls === "string"
        ? (() => {
            try {
              return JSON.parse(job.imageUrls);
            } catch {
              return [];
            }
          })()
        : Array.isArray(job.imageUrls)
        ? job.imageUrls
        : []
      : [];

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
      // Handle tickets (array or JSON string)
      if (job.ticketIds) {
        if (Array.isArray(job.ticketIds)) {
          setTickets(job.ticketIds.map(String));
        } else {
          try {
            const parsed = JSON.parse(job.ticketIds);
            if (Array.isArray(parsed)) setTickets(parsed.map(String));
            else if (typeof parsed === "string") setTickets([parsed]);
            else setTickets([]);
          } catch {
            setTickets([String(job.ticketIds)]);
          }
        }
      } else {
        setTickets([]);
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

  const handleRemoveTicket = (idx: number) => {
    setTickets(tickets.filter((_, i) => i !== idx));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImages(files);
      // Generate previews
      const previews = files.map((file) => URL.createObjectURL(file));
      setImagePreviews(previews);
    }
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
        startTime: dispatchType === "Hourly" ? startTime : undefined,
        endTime: dispatchType === "Hourly" ? endTime : undefined,
        weight: dispatchType === "Tonnage" ? tonnageTags : undefined,
        loads: dispatchType === "Load" ? loads : undefined,
        ticketIds: tickets.length > 0 ? tickets : undefined,
      };
      Object.keys(form).forEach(
        (key) => form[key] === undefined && delete form[key]
      );
      // Build FormData
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => formData.append(key, v));
        } else if (value !== undefined && value !== null) {
          formData.append(key, value as string);
        }
      });
      images.forEach((file) => formData.append("images", file));
      if (job && job.jobId) {
        await jobApi.update(job.jobId, formData, true);
        toast.success("Job updated successfully");
      } else {
        await jobApi.create(formData, true);
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
    <div className="slide-over-form">
      <form onSubmit={handleSubmit}>
        <div className="form-section">
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
            options={jobTypes
              .slice()
              .sort((a, b) => a.title.localeCompare(b.title))
              .map((jt) => ({
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
      {/* Tickets field - render inline to control Enter behavior */}
      <div className="space-y-1">
        <label htmlFor="ticketIds" className="font-medium">
          Tickets
        </label>
        <input
          id="ticketIds"
          type="text"
          value={ticketInput}
          onChange={(e) => setTicketInput(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              ticketInput &&
              !tickets.includes(ticketInput)
            ) {
              e.preventDefault();
              e.stopPropagation();
              setTickets([...tickets, ticketInput]);
              setTicketInput("");
            }
          }}
          className="border rounded px-2 py-1 w-full"
          placeholder="Enter ticket number and press Enter"
          autoComplete="off"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {tickets.map((ticket, idx) => (
            <span
              key={idx}
              className="bg-gray-200 px-2 py-1 rounded flex items-center gap-1"
            >
              {ticket}
              <button
                type="button"
                className="ml-1 text-red-500"
                onClick={() => handleRemoveTicket(idx)}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      </div>
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
      />
      {/* Image upload field */}
      <div>
        <label className="block font-medium mb-1">Job Images</label>
        {/* Show existing images if editing */}
        {existingImageUrls.length > 0 && (
          <div className="mb-2">
            <div className="text-xs text-muted-foreground mb-1">
              Existing Images
            </div>
            <div className="flex flex-wrap gap-2">
              {existingImageUrls.map((src: string, idx: number) => (
                <a
                  key={idx}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={src}
                    alt={`existing-job-img-${idx}`}
                    className="w-20 h-20 object-cover rounded border"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
        />
        {imagePreviews.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {imagePreviews.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`preview-${idx}`}
                className="w-20 h-20 object-cover rounded border"
              />
            ))}
          </div>
        )}
        </div>
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
                backgroundColor: job ? '#f97316' : '#2563eb',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
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
        </div>
      </form>
    </div>
  );
}
