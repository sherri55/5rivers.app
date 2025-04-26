// pages/jobs.tsx
"use client";
import React, {
  useState,
  useEffect,
  FormEvent,
  useCallback,
  useMemo,
} from "react";
import Head from "next/head";
import { format, parseISO } from "date-fns";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { CollapsiblePanel } from "../../components/ui/CollapsiblePanel";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  TruckIcon,
  UserIcon,
  PhotoIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import JobListSection from "../../components/jobs/JobListSection";
import {
  fetchGraphQL,
  mutateGraphQL,
  GET_DISPATCHERS,
  GET_DRIVERS,
  GET_JOBS,
  GET_JOBTYPES,
  GET_UNITS,
  UPDATE_INVOICE_STATUS,
} from "../../lib/graphql-client";
import { useRouter, useSearchParams } from "next/navigation";

// Domain types
export interface Job {
  jobId: number;
  title: string;
  dateOfJob: string;
  dispatchType: string;
  driverId: string;
  driverName: string;
  dispatcherId: string;
  unitId: string;
  unitName: string;
  jobTypeId: string;
  startTimeForJob?: string;
  endTimeForJob?: string;
  startTimeForDriver?: string;
  endTimeForDriver?: string;
  loads?: number;
  weight?: number[];
  ticketIds?: string[];
  imageUrls?: string[];
  jobGrossAmount: number;
  invoiceStatus: "Pending" | "Raised" | "Received";
}

export interface JobType {
  jobTypeId: string;
  title: string;
  dispatchType: string;
  startLocation: string;
  endLocation: string;
  rateOfJob: number;
  companyId: string;
}
export interface Driver {
  driverId: string;
  name: string;
}
export interface Dispatcher {
  dispatcherId: string;
  name: string;
  commission: number; // Add this property
  isActive: boolean; // Add this property
}
export interface Unit {
  unitId: string;
  name: string;
}

// Filter shape
type DateRange = { start: string; end: string };
type Filters = {
  searchTerm: string;
  dateRange: DateRange;
  driverId: string;
  dispatcherId: string;
  unitId: string;
  jobTypeId: string;
  dispatchType: string;
  invoiceStatus: "all" | "Pending" | "Raised" | "Received";
};

export default function JobsPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // Add for query param
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const jobIdFromQuery = searchParams ? searchParams.get("jobId") : null;

  // Data & loading
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [addFormVisible, setAddFormVisible] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    searchTerm: "",
    dateRange: { start: "", end: "" },
    driverId: "",
    dispatcherId: "",
    unitId: "",
    jobTypeId: "",
    dispatchType: "",
    invoiceStatus: "all",
  });

  const [formData, setFormData] = useState<Partial<Job>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [ticketInput, setTicketInput] = useState<string>("");
  const [weightInput, setWeightInput] = useState<string>("");

  // Fetch all necessary data
  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchGraphQL(GET_JOBS),
      fetchGraphQL(GET_JOBTYPES),
      fetchGraphQL(GET_DRIVERS),
      fetchGraphQL(GET_DISPATCHERS),
      fetchGraphQL(GET_UNITS),
    ])
      .then(
        ([jobsData, typesData, driversData, dispatchersData, unitsData]) => {
          // Extract arrays from GraphQL responses
          const jobs = Array.isArray(jobsData?.jobs)
            ? jobsData.jobs.map((job: any) => {
                // Find driver and unit by ID for display names
                const driver = (driversData?.drivers || []).find(
                  (d: any) => d.driverId === job.driverId
                );
                const unit = (unitsData?.units || []).find(
                  (u: any) => u.unitId === job.unitId
                );
                return {
                  ...job,
                  ticketIds:
                    typeof job.ticketIds === "string"
                      ? JSON.parse(job.ticketIds)
                      : job.ticketIds,
                  weight:
                    typeof job.weight === "string"
                      ? JSON.parse(job.weight)
                      : job.weight,
                  driverName: driver ? driver.name : "Unknown",
                  unitName: unit ? unit.name : "Unknown",
                };
              })
            : [];
          const jobTypes = Array.isArray(typesData?.jobTypes)
            ? typesData.jobTypes
            : [];
          const drivers = Array.isArray(driversData?.drivers)
            ? driversData.drivers
            : [];
          const dispatchers = Array.isArray(dispatchersData?.dispatchers)
            ? dispatchersData.dispatchers
            : [];
          const units = Array.isArray(unitsData?.units) ? unitsData.units : [];

          setJobs(jobs);
          setJobTypes(jobTypes);
          setDrivers(drivers);
          setDispatchers(dispatchers);
          setUnits(units);
        }
      )
      .catch((e) => {
        setError((e as Error).message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchAll();
  }, []);

  // Pre-select job if jobId is in query string
  useEffect(() => {
    if (jobIdFromQuery && jobs.length > 0) {
      const found = jobs.find((j) => String(j.jobId) === jobIdFromQuery);
      if (found) {
        setFormData(found);
        setIsEditing(true);
        setCurrentId(found.jobId);
        setAddFormVisible(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIdFromQuery, jobs]);

  // Filtering logic
  const filteredJobs = useMemo(() => {
    if (loading) return [];
    let result = [...jobs];

    const {
      searchTerm,
      dateRange,
      driverId,
      dispatcherId,
      unitId,
      jobTypeId,
      dispatchType,
      invoiceStatus,
    } = filters;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(term) ||
          j.driverName.toLowerCase().includes(term) ||
          j.unitName.toLowerCase().includes(term)
      );
    }
    if (dateRange.start)
      result = result.filter((j) => j.dateOfJob >= dateRange.start);
    if (dateRange.end)
      result = result.filter((j) => j.dateOfJob <= dateRange.end);
    if (driverId) result = result.filter((j) => j.driverId === driverId);
    if (dispatcherId)
      result = result.filter((j) => j.dispatcherId === dispatcherId);
    if (unitId) result = result.filter((j) => j.unitId === unitId);
    if (jobTypeId) result = result.filter((j) => j.jobTypeId === jobTypeId);
    if (dispatchType)
      result = result.filter((j) => j.dispatchType === dispatchType);
    if (invoiceStatus !== "all")
      result = result.filter((j) => j.invoiceStatus === invoiceStatus);

    // Sort newest first
    result.sort(
      (a, b) =>
        new Date(b.dateOfJob).getTime() - new Date(a.dateOfJob).getTime()
    );

    return result;
  }, [jobs, filters, loading]);

  // Handlers
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
  };
  const handleDateFilter = (field: "start" | "end", value: string) => {
    setFilters((f) => ({
      ...f,
      dateRange: { ...f.dateRange, [field]: value },
    }));
  };

  const updateInvoiceStatus = async (
    jobId: number,
    status: "Pending" | "Raised" | "Received"
  ) => {
    try {
      debugger;
      await mutateGraphQL(UPDATE_INVOICE_STATUS, { jobId, status });
      toast.success(`Invoice status updated to ${status}`);
      fetchAll(); // Refresh data after update
    } catch (e) {
      toast.error(`Failed to update invoice status: ${(e as Error).message}`);
    }
  };
  const clearFilters = () =>
    setFilters({
      searchTerm: "",
      dateRange: { start: "", end: "" },
      driverId: "",
      dispatcherId: "",
      unitId: "",
      jobTypeId: "",
      dispatchType: "",
      invoiceStatus: "all",
    });

  const handleEdit = (job: Job) => {
    setFormData(job);
    setIsEditing(true);
    setCurrentId(job.jobId);
    setAddFormVisible(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this job?")) return;
    try {
      await mutateGraphQL(
        `
      mutation DeleteJob($jobId: ID!) {
        deleteJob(jobId: $jobId)
      }
    `,
        { jobId: id }
      );
      toast.success("Job deleted");
      fetchAll();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      ticketIds: JSON.stringify(formData.ticketIds || []),
      weight: JSON.stringify(formData.weight || []),
    };
    try {
      if (isEditing && currentId !== null) {
        await mutateGraphQL(
          `
        mutation UpdateJob($jobId: ID!, $input: UpdateJobInput!) {
          updateJob(jobId: $jobId, input: $input) {
            jobId
          }
        }
      `,
          { jobId: currentId, input: payload }
        );
        toast.success("Job updated");
      } else {
        await mutateGraphQL(
          `
        mutation CreateJob($input: CreateJobInput!) {
          createJob(input: $input) {
            jobId
          }
        }
      `,
          { input: payload }
        );
        toast.success("Job added");
      }
      resetForm();
      fetchAll();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const resetForm = () => {
    setFormData({});
    setIsEditing(false);
    setCurrentId(null);
  };

  const jobsByMonthAndUnit = useMemo(() => {
    if (!Array.isArray(filteredJobs)) return {};
    return filteredJobs.reduce((acc, job: Job) => {
      // month key as “YYYY‑MM”
      const month = job.dateOfJob.slice(0, 7);

      // init month bucket
      if (!acc[month]) {
        acc[month] = {};
      }

      // unit bucket inside month
      const unit = job.unitName || "Unknown";
      if (!acc[month][unit]) {
        acc[month][unit] = [];
      }

      acc[month][unit].push(job);
      return acc;
    }, {} as Record<string, Record<string, Job[]>>);
  }, [filteredJobs]);

  if (loading) return <LoadingSpinner />;
  if (error)
    return (
      <EmptyState
        title="Error"
        description={error}
        action={<Button onClick={fetchAll}>Retry</Button>}
        icon={undefined}
      />
    );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Head>
        <title>Jobs Management</title>
      </Head>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="container mx-auto p-6">
        <PageHeader title="Jobs Management" icon={undefined} />

        {/* Search and controls */}
        <Card className="mb-6">
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder="Search jobs..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => setAddFormVisible((v) => !v)}
              variant="primary"
            >
              <PlusIcon className="w-5 h-5 mr-2" />{" "}
              {addFormVisible ? "Hide Form" : "Add Job"}
            </Button>
            <Button
              onClick={() => setFiltersVisible((v) => !v)}
              variant="outline"
            >
              <FunnelIcon className="w-5 h-5 mr-2" /> Filters
            </Button>
            <div className="ml-auto text-sm text-gray-600">
              {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"}
            </div>
          </div>

          <AnimatePresence>
            {filtersVisible && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4"
              >
                <CollapsiblePanel title="Advanced Filters">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      type="date"
                      label="From"
                      value={filters.dateRange.start}
                      onChange={(e) =>
                        handleDateFilter("start", e.target.value)
                      }
                    />
                    <Input
                      type="date"
                      label="To"
                      value={filters.dateRange.end}
                      onChange={(e) => handleDateFilter("end", e.target.value)}
                    />
                    <Select
                      label="Driver"
                      options={[
                        { value: "", label: "All Drivers" },
                        ...drivers.map((d) => ({
                          value: d.driverId,
                          label: d.name,
                        })),
                      ]}
                      value={filters.driverId}
                      onChange={(e) =>
                        handleFilterChange("driverId", e.target.value)
                      }
                      className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm bg-white text-gray-800 px-3 py-2 transition-all"
                    />
                    <Select
                      label="Dispatcher"
                      options={[
                        { value: "", label: "All Dispatchers" },
                        ...dispatchers.map((d) => ({
                          value: d.dispatcherId,
                          label: d.name,
                        })),
                      ]}
                      value={filters.dispatcherId}
                      onChange={(e) =>
                        handleFilterChange("dispatcherId", e.target.value)
                      }
                      className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm bg-white text-gray-800 px-3 py-2 transition-all"
                    />
                    <Select
                      label="Unit"
                      options={[
                        { value: "", label: "All Units" },
                        ...units.map((u) => ({
                          value: u.unitId,
                          label: u.name,
                        })),
                      ]}
                      value={filters.unitId}
                      onChange={(e) =>
                        handleFilterChange("unitId", e.target.value)
                      }
                      className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm bg-white text-gray-800 px-3 py-2 transition-all"
                    />
                    <Select
                      label="Job Type"
                      options={[
                        { value: "", label: "All Types" },
                        ...jobTypes.map((jt) => ({
                          value: jt.jobTypeId,
                          label: jt.title,
                        })),
                      ]}
                      value={filters.jobTypeId}
                      onChange={(e) =>
                        handleFilterChange("jobTypeId", e.target.value)
                      }
                      className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm bg-white text-gray-800 px-3 py-2 transition-all"
                    />
                    <Select
                      label="Dispatch Type"
                      options={[
                        { value: "", label: "All" },
                        ...Array.from(
                          new Set(jobTypes.map((jt) => jt.dispatchType))
                        ).map((dt) => ({ value: dt, label: dt })),
                      ]}
                      value={filters.dispatchType}
                      onChange={(e) =>
                        handleFilterChange("dispatchType", e.target.value)
                      }
                      className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm bg-white text-gray-800 px-3 py-2 transition-all"
                    />
                    <Select
                      label="Payment Status"
                      options={[
                        { value: "all", label: "All" },
                        { value: "Pending", label: "Pending" },
                        { value: "Raised", label: "Raised" },
                        { value: "Received", label: "Received" },
                      ]}
                      value={filters.invoiceStatus}
                      onChange={(e) =>
                        handleFilterChange("invoiceStatus", e.target.value)
                      }
                      className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm bg-white text-gray-800 px-3 py-2 transition-all"
                    />
                  </div>
                  <div className="mt-4 text-right">
                    <Button variant="secondary" onClick={clearFilters}>
                      <XMarkIcon className="w-4 h-4 mr-1" /> Clear Filters
                    </Button>
                  </div>
                </CollapsiblePanel>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Add/Edit Form */}
        <AnimatePresence>
          {addFormVisible && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="mb-6 shadow-lg rounded-2xl border border-gray-200 bg-white p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center text-indigo-700">
                      <PlusIcon className="w-6 h-6 mr-2" />
                      {isEditing ? "Update Job" : "Add New Job"}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setAddFormVisible(false)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Job title & type */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        Job Title
                      </label>
                      <Input
                        name="title"
                        value={formData.title || ""}
                        onChange={(e: { target: { value: any } }) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        required
                        className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        Dispatcher
                      </label>
                      <Select
                        name="dispatcherId"
                        options={[
                          { value: "", label: "Select" },
                          ...dispatchers.map((d) => ({
                            value: d.dispatcherId,
                            label: d.name,
                          })),
                        ]}
                        value={formData.dispatcherId || ""}
                        onChange={(v: any) =>
                          setFormData({ ...formData, dispatcherId: v })
                        }
                        required
                        className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm bg-white text-gray-800 px-3 py-2 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        Job Type
                      </label>
                      <Select
                        name="jobTypeId"
                        options={[
                          { value: "", label: "Select Job Type" },
                          ...jobTypes.map((jt) => ({
                            value: jt.jobTypeId,
                            label: jt.title,
                          })),
                        ]}
                        value={formData.jobTypeId ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          const v = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            jobTypeId: v,
                            dispatchType:
                              jobTypes.find((j) => j.jobTypeId === v)
                                ?.dispatchType ?? "",
                          }));
                        }}
                        required
                        className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm bg-white text-gray-800 px-3 py-2 transition-all"
                      />
                    </div>
                  </div>

                  {/* Date and Times / loads / weight */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        Date of Job
                      </label>
                      <Input
                        type="date"
                        name="dateOfJob"
                        value={formData.dateOfJob || ""}
                        onChange={(e: { target: { value: any } }) =>
                          setFormData({
                            ...formData,
                            dateOfJob: e.target.value,
                          })
                        }
                        required
                        className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm"
                      />
                    </div>
                    {formData.dispatchType === "Hourly" && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-gray-700">
                            Start Time
                          </label>
                          <Input
                            type="time"
                            name="startTimeForJob"
                            value={formData.startTimeForJob || ""}
                            onChange={(e: { target: { value: any } }) =>
                              setFormData({
                                ...formData,
                                startTimeForJob: e.target.value,
                              })
                            }
                            required
                            className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-gray-700">
                            End Time
                          </label>
                          <Input
                            type="time"
                            name="endTimeForJob"
                            value={formData.endTimeForJob || ""}
                            onChange={(e: { target: { value: any } }) =>
                              setFormData({
                                ...formData,
                                endTimeForJob: e.target.value,
                              })
                            }
                            required
                            className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm"
                          />
                        </div>
                      </>
                    )}
                    {formData.dispatchType === "Load" && (
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                          Loads
                        </label>
                        <Input
                          type="number"
                          name="loads"
                          value={formData.loads || 0}
                          onChange={(e: {
                            target: { value: string | number };
                          }) =>
                            setFormData({
                              ...formData,
                              loads: +e.target.value,
                            })
                          }
                          required
                          className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm"
                        />
                      </div>
                    )}
                    {formData.dispatchType === "Tonnage" && (
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                          Weight (Tons)
                        </label>
                        <input
                          type="text"
                          name="weight"
                          className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm p-2"
                          placeholder="Type and press Enter or comma to add"
                          value={weightInput || ""}
                          onChange={(e) => setWeightInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (
                              (e.key === "Enter" || e.key === ",") &&
                              weightInput.trim() !== ""
                            ) {
                              e.preventDefault();
                              const val = parseFloat(weightInput.trim());
                              if (
                                !isNaN(val) &&
                                !formData.weight?.includes(val)
                              ) {
                                setFormData({
                                  ...formData,
                                  weight: [...(formData.weight || []), val],
                                });
                              }
                              setWeightInput("");
                            }
                          }}
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(formData.weight || []).map((w, idx) => (
                            <span
                              key={w + idx}
                              className="inline-flex items-center bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium shadow-sm"
                            >
                              {w}
                              <button
                                type="button"
                                className="ml-2 text-indigo-500 hover:text-red-500 focus:outline-none"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    weight: formData.weight?.filter(
                                      (_, i) => i !== idx
                                    ),
                                  });
                                }}
                                aria-label={`Remove weight ${w}`}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Driver & unit */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        Driver
                      </label>
                      <Select
                        name="driverId"
                        options={[
                          { value: "", label: "Select" },
                          ...drivers.map((d) => ({
                            value: d.driverId,
                            label: d.name,
                          })),
                        ]}
                        value={formData.driverId || ""}
                        onChange={(v: any) =>
                          setFormData({ ...formData, driverId: v })
                        }
                        required
                        className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm bg-white text-gray-800 px-3 py-2 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        Start for Driver
                      </label>
                      <Input
                        type="time"
                        name="startTimeForDriver"
                        value={formData.startTimeForDriver || ""}
                        onChange={(e: { target: { value: any } }) =>
                          setFormData({
                            ...formData,
                            startTimeForDriver: e.target.value,
                          })
                        }
                        required
                        className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        End for Driver
                      </label>
                      <Input
                        type="time"
                        name="endTimeForDriver"
                        value={formData.endTimeForDriver || ""}
                        onChange={(e: { target: { value: any } }) =>
                          setFormData({
                            ...formData,
                            endTimeForDriver: e.target.value,
                          })
                        }
                        required
                        className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Unit & tickets */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        Unit
                      </label>
                      <Select
                        name="unitId"
                        options={[
                          { value: "", label: "Select" },
                          ...units.map((u) => ({
                            value: u.unitId,
                            label: u.name,
                          })),
                        ]}
                        value={formData.unitId || ""}
                        onChange={(v: any) =>
                          setFormData({ ...formData, unitId: v })
                        }
                        required
                        className="rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm bg-white text-gray-800 px-3 py-2 transition-all"
                      />
                    </div>
                    <div>
                      <label
                        className="block text-sm font-semibold mb-2 text-gray-700"
                        htmlFor="ticketIds"
                      >
                        Ticket IDs
                      </label>
                      <input
                        id="ticketIds"
                        type="text"
                        className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm p-2"
                        placeholder="Type and press Enter or comma to add"
                        value={ticketInput || ""}
                        onChange={(e) => setTicketInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            (e.key === "Enter" || e.key === ",") &&
                            ticketInput.trim() !== ""
                          ) {
                            e.preventDefault();
                            if (
                              !formData.ticketIds?.includes(
                                ticketInput.trim()
                              ) &&
                              ticketInput.trim() !== ""
                            ) {
                              setFormData({
                                ...formData,
                                ticketIds: [
                                  ...(formData.ticketIds || []),
                                  ticketInput.trim(),
                                ],
                              });
                            }
                            setTicketInput("");
                          }
                        }}
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(formData.ticketIds || []).map((ticket, idx) => (
                          <span
                            key={ticket + idx}
                            className="inline-flex items-center bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium shadow-sm"
                          >
                            {ticket}
                            <button
                              type="button"
                              className="ml-2 text-indigo-500 hover:text-red-500 focus:outline-none"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  ticketIds: formData.ticketIds?.filter(
                                    (t, i) => i !== idx
                                  ),
                                });
                              }}
                              aria-label={`Remove ticket ${ticket}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Images */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Images
                    </label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          imageUrls: Array.from(e.target.files || []).map((f) =>
                            URL.createObjectURL(f)
                          ),
                        })
                      }
                      className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-4 mt-8">
                    {isEditing && (
                      <Button
                        variant="secondary"
                        onClick={resetForm}
                        className="rounded-lg px-6 py-2"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      type="submit"
                      variant={isEditing ? "primary" : "success"}
                      className="rounded-lg px-6 py-2 font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      {isEditing ? "Update Job" : "Add Job"}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Job list */}
        <div>
          {filteredJobs.length === 0 ? (
            <EmptyState
              title="No jobs found"
              description="Try adjusting filters."
              icon={undefined}
            />
          ) : (
            <Card>
              <JobListSection
                allJobs={filteredJobs}
                allJobTypes={jobTypes}
                allDispatchers={dispatchers}
                jobsByMonthAndUnit={jobsByMonthAndUnit}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
                updateInvoiceStatus={updateInvoiceStatus}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
