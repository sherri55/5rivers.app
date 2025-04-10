"use client";
import { useState, useEffect, FormEvent, useCallback } from "react";
import { format, parseISO } from "date-fns";
import Head from "next/head";
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  TruckIcon,
  UserIcon,
  TicketIcon,
  PhotoIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "framer-motion";
import JobListSection from "@/components/jobs/joblist";

export type Job = {
  jobId: number;
  title: string;
  dateOfJob: string;
  dayOfJob: string;
  jobGrossAmount: number;
  driverPay: number;
  hoursOfDriver: number;
  hoursOfJob: number;
  weight: string;
  loads: number;
  ticketIds: string;
  imageUrls: string[];
  jobTypeId: string;
  dispatchType: string;
  driverId: string;
  dispatcherId: string;
  unitId: string;
  unitName: string;
  driverName: string;
  startTimeForDriver: string;
  endTimeForDriver: string;
  startTimeForJob: string;
  endTimeForJob: string;
  invoiceId: string;
  amountReceived: boolean;
};

export type JobType = {
  jobTypeId: string;
  title: string;
  companyId: string;
  startLocation: string;
  endLocation: string;
  dispatchType: string;
  rateOfJob: number;
};

export type Driver = {
  driverId: string;
  name: string;
};

export type Dispatcher = {
  dispatcherId: string;
  name: string;
  email: string;
};

export type Unit = {
  unitId: string;
  name: string;
};

export type Company = {
  companyId: string;
  name: string;
};

// Filter types
type DateRangeFilter = {
  start: string;
  end: string;
};

type JobFilters = {
  showAddForm: boolean;
  searchTerm: string;
  dateRange: DateRangeFilter;
  driverId: string;
  dispatcherId: string;
  unitId: string;
  jobTypeId: string;
  dispatchType: string;
  amountReceived: string; // "all", "received", "pending"
};

export default function JobsPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const [formData, setFormData] = useState({
    title: "",
    dateOfJob: "",
    startTimeForDriver: "",
    endTimeForDriver: "",
    startTimeForJob: "",
    endTimeForJob: "",
    jobTypeId: "",
    dispatchType: "",
    driverId: "",
    driverName: "",
    dispatcherId: "",
    unitId: "",
    unitName: "",
    weight: [] as number[],
    loads: 0,
    ticketIds: [] as string[],
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [ticketInput, setTicketInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // New filter state
  const [filters, setFilters] = useState<JobFilters>({
    showAddForm: false,
    searchTerm: "",
    dateRange: {
      start: "",
      end: "",
    },
    driverId: "",
    dispatcherId: "",
    unitId: "",
    jobTypeId: "",
    dispatchType: "",
    amountReceived: "all",
  });

  const [showFilters, setShowFilters] = useState(false);

  // Debounce search to avoid excessive re-renders
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setFilters((prev) => ({ ...prev, searchTerm: value }));
    }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/jobs`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data: Job[] = await res.json();
      setJobs(data);
      setFilteredJobs(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load jobs");
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  const fetchJobTypes = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/jobtypes`);
      if (!res.ok) throw new Error("Failed to fetch job types");
      const data: JobType[] = await res.json();
      setJobTypes(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load job types");
    }
  }, [API_URL]);

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/drivers`);
      if (!res.ok) throw new Error("Failed to fetch drivers");
      const data: Driver[] = await res.json();
      setDrivers(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load drivers");
    }
  }, [API_URL]);

  const fetchDispatchers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/dispatchers`);
      if (!res.ok) throw new Error("Failed to fetch dispatchers");
      const data: Dispatcher[] = await res.json();
      setDispatchers(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load dispatchers");
    }
  }, [API_URL]);

  const fetchUnits = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/units`);
      if (!res.ok) throw new Error("Failed to fetch units");
      const data: Unit[] = await res.json();
      setUnits(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load units");
    }
  }, [API_URL]);

  useEffect(() => {
    fetchJobs();
    fetchJobTypes();
    fetchDrivers();
    fetchDispatchers();
    fetchUnits();
  }, [fetchJobs, fetchJobTypes, fetchDrivers, fetchDispatchers, fetchUnits]);

  // Apply filters when jobs or filter state changes
  useEffect(() => {
    if (jobs.length === 0) return;

    let result = [...jobs];

    // Apply search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      result = result.filter(
        (job) =>
          job.title.toLowerCase().includes(searchLower) ||
          job.driverName?.toLowerCase().includes(searchLower) ||
          job.unitName?.toLowerCase().includes(searchLower) ||
          job.dispatchType?.toLowerCase().includes(searchLower)
      );
    }

    // Apply date range filter
    if (filters.dateRange.start) {
      result = result.filter((job) => job.dateOfJob >= filters.dateRange.start);
    }
    if (filters.dateRange.end) {
      result = result.filter((job) => job.dateOfJob <= filters.dateRange.end);
    }

    // Apply driver filter
    if (filters.driverId) {
      result = result.filter((job) => job.driverId === filters.driverId);
    }

    // Apply dispatcher filter
    if (filters.dispatcherId) {
      result = result.filter(
        (job) => job.dispatcherId === filters.dispatcherId
      );
    }

    // Apply unit filter
    if (filters.unitId) {
      result = result.filter((job) => job.unitId === filters.unitId);
    }

    // Apply job type filter
    if (filters.jobTypeId) {
      result = result.filter((job) => job.jobTypeId === filters.jobTypeId);
    }

    // Apply dispatch type filter
    if (filters.dispatchType) {
      result = result.filter(
        (job) => job.dispatchType === filters.dispatchType
      );
    }

    // Apply amount received filter
    if (filters.amountReceived === "received") {
      result = result.filter((job) => job.amountReceived);
    } else if (filters.amountReceived === "pending") {
      result = result.filter((job) => !job.amountReceived);
    }

    // Sort by date (newest first)
    result.sort(
      (a, b) =>
        new Date(b.dateOfJob).getTime() - new Date(a.dateOfJob).getTime()
    );

    setFilteredJobs(result);
  }, [jobs, filters]);

  const handleEdit = useCallback(
    (job: Job) => {
      setFormData({
        title: job.title || "",
        dateOfJob: job.dateOfJob || "",
        startTimeForDriver: job.startTimeForDriver || "",
        endTimeForDriver: job.endTimeForDriver || "",
        startTimeForJob: job.startTimeForJob || "",
        endTimeForJob: job.endTimeForJob || "",
        jobTypeId: job.jobTypeId || "",
        dispatchType: job.dispatchType || "",
        driverId: job.driverId || "",
        driverName:
          drivers.find((d) => d.driverId === job.driverId)?.name || "",
        dispatcherId: job.dispatcherId || "",
        unitId: job.unitId || "",
        unitName: units.find((u) => u.unitId === job.unitId)?.name || "",
        weight:
          typeof job.weight === "string"
            ? JSON.parse(job.weight)
            : job.weight || [],
        loads: job.loads || 0,
        ticketIds:
          typeof job.ticketIds === "string"
            ? JSON.parse(job.ticketIds)
            : job.ticketIds || [],
      });

      setIsEditing(true);
      setCurrentJobId(job.jobId);
      setFilters((prev) => ({ ...prev, showAddForm: true }));

      // Scroll to form
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [drivers, units]
  );

  const handleTicketKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = ticketInput.trim();
      if (value && !formData.ticketIds.includes(value)) {
        setFormData((prev) => ({
          ...prev,
          ticketIds: [...prev.ticketIds, value],
        }));
        setTicketInput("");
      }
    }
  };

  const handleWeightKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = parseFloat(weightInput.trim());
      if (!isNaN(value)) {
        setFormData((prev) => ({
          ...prev,
          weight: [...prev.weight, value],
        }));
        setWeightInput("");
      }
    }
  };

  const removeWeight = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      weight: prev.weight.filter((_, i) => i !== index),
    }));
  };

  const removeTicketId = (ticketId: string) => {
    setFormData((prev) => ({
      ...prev,
      ticketIds: prev.ticketIds.filter((id) => id !== ticketId),
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { id, name, value } = e.target;

    if (id === "jobTypeId") {
      const selectElement = e.target as HTMLSelectElement;
      const selectedOption = selectElement.options[selectElement.selectedIndex];
      if (selectedOption) {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          dispatchType: selectedOption.getAttribute(
            "data-dispatchtype"
          ) as string,
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name.startsWith("dateRange.")) {
      const field = name.split(".")[1] as keyof DateRangeFilter;
      setFilters((prev) => ({
        ...prev,
        dateRange: {
          ...prev.dateRange,
          [field]: value,
        },
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const clearFilters = () => {
    setFilters({
      ...filters,
      searchTerm: "",
      dateRange: {
        start: "",
        end: "",
      },
      driverId: "",
      dispatcherId: "",
      unitId: "",
      jobTypeId: "",
      dispatchType: "",
      amountReceived: "all",
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setFormData((prev) => ({ ...prev, images: files }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const job = {
      ...formData,
      ticketIds: JSON.stringify(formData.ticketIds),
      weight: JSON.stringify(formData.weight),
    };

    try {
      const res = await fetch(
        `${API_URL}/jobs/${isEditing ? currentJobId : ""}`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(job),
        }
      );

      if (!res.ok) throw new Error("Failed to save job");

      toast.success(
        isEditing ? "Job updated successfully" : "Job added successfully"
      );
      await fetchJobs();
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save job");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      dateOfJob: "",
      startTimeForDriver: "",
      endTimeForDriver: "",
      startTimeForJob: "",
      endTimeForJob: "",
      jobTypeId: "",
      dispatchType: "",
      driverId: "",
      driverName: "",
      dispatcherId: "",
      unitId: "",
      unitName: "",
      weight: [],
      loads: 0,
      ticketIds: [],
    });
    setIsEditing(false);
    setCurrentJobId(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this job?")) return;

    try {
      const res = await fetch(`${API_URL}/jobs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete job");

      setJobs((prev) => prev.filter((job) => job.jobId !== id));
      toast.success("Job deleted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete job");
    }
  };

  // Group jobs by month and unit for the job list section
  const jobsByMonthAndUnit = filteredJobs.reduce((acc, job) => {
    const month = format(parseISO(job.dateOfJob), "yyyy-MM");
    if (!acc[month]) acc[month] = {};

    if (!acc[month][job.unitName]) acc[month][job.unitName] = [];
    acc[month][job.unitName].push(job);

    return acc;
  }, {} as Record<string, Record<string, Job[]>>);

  // Get unique dispatch types from job types
  const dispatchTypes = Array.from(
    new Set(jobTypes.map((jt) => jt.dispatchType))
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Head>
        <title>Jobs - 5rivers.app.client</title>
        <meta name="description" content="Manage jobs for 5rivers" />
      </Head>

      <ToastContainer position="top-right" autoClose={3000} />

      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-8 text-center text-indigo-600">
          Jobs Management
        </h1>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search jobs by title, driver, unit..."
                onChange={handleSearchChange}
                className="pl-10 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    showAddForm: !prev.showAddForm,
                  }))
                }
                className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-1" />{" "}
                {filters.showAddForm ? "Hide Form" : "Add Job"}
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center bg-indigo-100 hover:bg-indigo-200 text-indigo-700 py-2 px-4 rounded transition-colors"
              >
                <FunnelIcon className="w-5 h-5 mr-1" /> Filters{" "}
                {showFilters ? "▲" : "▼"}
              </button>

              <div className="ml-2">
                <span className="text-sm text-gray-500">
                  {filteredJobs.length}{" "}
                  {filteredJobs.length === 1 ? "job" : "jobs"}
                </span>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="border-t pt-4 mt-2">
                  <h3 className="font-medium mb-3">Filter Jobs:</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Date Range
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="date"
                          name="dateRange.start"
                          value={filters.dateRange.start}
                          onChange={handleFilterChange}
                          className="shadow border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                        />
                        <span>to</span>
                        <input
                          type="date"
                          name="dateRange.end"
                          value={filters.dateRange.end}
                          onChange={handleFilterChange}
                          className="shadow border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Driver
                      </label>
                      <select
                        name="driverId"
                        value={filters.driverId}
                        onChange={handleFilterChange}
                        className="shadow border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Drivers</option>
                        {drivers.map((driver) => (
                          <option key={driver.driverId} value={driver.driverId}>
                            {driver.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Dispatcher
                      </label>
                      <select
                        name="dispatcherId"
                        value={filters.dispatcherId}
                        onChange={handleFilterChange}
                        className="shadow border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Dispatchers</option>
                        {dispatchers.map((dispatcher) => (
                          <option
                            key={dispatcher.dispatcherId}
                            value={dispatcher.dispatcherId}
                          >
                            {dispatcher.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Unit
                      </label>
                      <select
                        name="unitId"
                        value={filters.unitId}
                        onChange={handleFilterChange}
                        className="shadow border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Units</option>
                        {units.map((unit) => (
                          <option key={unit.unitId} value={unit.unitId}>
                            {unit.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Job Type
                      </label>
                      <select
                        name="jobTypeId"
                        value={filters.jobTypeId}
                        onChange={handleFilterChange}
                        className="shadow border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Job Types</option>
                        {jobTypes.map((jobType) => (
                          <option
                            key={jobType.jobTypeId}
                            value={jobType.jobTypeId}
                          >
                            {jobType.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Dispatch Type
                      </label>
                      <select
                        name="dispatchType"
                        value={filters.dispatchType}
                        onChange={handleFilterChange}
                        className="shadow border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Dispatch Types</option>
                        {dispatchTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Payment Status
                      </label>
                      <select
                        name="amountReceived"
                        value={filters.amountReceived}
                        onChange={handleFilterChange}
                        className="shadow border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="all">All Jobs</option>
                        <option value="received">Received</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={clearFilters}
                      className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-3 rounded text-sm transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4 mr-1" /> Clear Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Job Add/Edit Form */}
        <AnimatePresence>
          {filters.showAddForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <form
                onSubmit={handleSubmit}
                className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-8 border border-gray-200"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold flex items-center">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    {isEditing ? "Update Job" : "Add New Job"}
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, showAddForm: false }))
                    }
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Job Details Section */}
                <div className="mb-6">
                  <h3 className="text-md font-medium mb-3 flex items-center text-indigo-600">
                    <CalendarIcon className="w-5 h-5 mr-2" />
                    Job Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="title"
                        className="block text-gray-700 text-sm font-bold mb-2"
                      >
                        Job Title
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter job title"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="dispatcherId"
                        className="block text-gray-700 text-sm font-bold mb-2"
                      >
                        Dispatcher
                      </label>
                      <select
                        id="dispatcherId"
                        name="dispatcherId"
                        value={formData.dispatcherId}
                        onChange={handleInputChange}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Dispatcher</option>
                        {dispatchers.map((dispatcher) => (
                          <option
                            key={dispatcher.dispatcherId}
                            value={dispatcher.dispatcherId}
                          >
                            {dispatcher.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="jobTypeId"
                        className="block text-gray-700 text-sm font-bold mb-2"
                      >
                        Job Type
                      </label>
                      <select
                        id="jobTypeId"
                        name="jobTypeId"
                        value={formData.jobTypeId}
                        onChange={handleInputChange}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Job Type</option>
                        {jobTypes
                          .sort((a, b) => a.title.localeCompare(b.title))
                          .map((jobType) => (
                            <option
                              key={jobType.jobTypeId}
                              value={jobType.jobTypeId}
                              data-dispatchtype={jobType.dispatchType}
                            >
                              {jobType.title}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Job Date & Time Section */}
                <div className="mb-6">
                  <h3 className="text-md font-medium mb-3 flex items-center text-indigo-600">
                    <ClockIcon className="w-5 h-5 mr-2" />
                    Job Date & Time
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="dateOfJob"
                        className="block text-gray-700 text-sm font-bold mb-2"
                      >
                        Date of Job
                      </label>
                      <input
                        type="date"
                        id="dateOfJob"
                        name="dateOfJob"
                        value={formData.dateOfJob}
                        onChange={handleInputChange}
                        required
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    {formData.dispatchType === "Hourly" && (
                      <>
                        <div>
                          <label
                            htmlFor="startTimeForJob"
                            className="block text-gray-700 text-sm font-bold mb-2"
                          >
                            Start Time for Job
                          </label>
                          <input
                            type="time"
                            id="startTimeForJob"
                            name="startTimeForJob"
                            value={formData.startTimeForJob}
                            onChange={handleInputChange}
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="endTimeForJob"
                            className="block text-gray-700 text-sm font-bold mb-2"
                          >
                            End Time for Job
                          </label>
                          <input
                            type="time"
                            id="endTimeForJob"
                            name="endTimeForJob"
                            value={formData.endTimeForJob}
                            onChange={handleInputChange}
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </>
                    )}
                    {formData.dispatchType === "Load" && (
                      <div>
                        <label
                          htmlFor="loads"
                          className="block text-gray-700 text-sm font-bold mb-2"
                        >
                          Loads
                        </label>
                        <input
                          type="number"
                          id="loads"
                          name="loads"
                          value={formData.loads}
                          onChange={handleInputChange}
                          placeholder="Enter number of loads"
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                    {formData.dispatchType === "Tonnage" && (
                      <div className="md:col-span-2">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          Weight (Tons)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={weightInput}
                            onChange={(e) => setWeightInput(e.target.value)}
                            onKeyDown={handleWeightKeyDown}
                            placeholder="Enter weight and press Enter"
                            step="0.01"
                            min="0"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const value = parseFloat(weightInput.trim());
                              if (!isNaN(value)) {
                                setFormData((prev) => ({
                                  ...prev,
                                  weight: [...prev.weight, value],
                                }));
                                setWeightInput("");
                              }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.weight.map((w, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center bg-indigo-100 text-indigo-800 rounded-full px-3 py-1 text-sm"
                            >
                              {w.toFixed(2)} Tons
                              <button
                                type="button"
                                className="ml-2 text-indigo-600 hover:text-indigo-800"
                                onClick={() => removeWeight(index)}
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Driver Information Section */}
                <div className="mb-6">
                  <h3 className="text-md font-medium mb-3 flex items-center text-indigo-600">
                    <UserIcon className="w-5 h-5 mr-2" />
                    Driver Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="driverId"
                        className="block text-gray-700 text-sm font-bold mb-2"
                      >
                        Driver
                      </label>
                      <select
                        id="driverId"
                        name="driverId"
                        value={formData.driverId}
                        onChange={handleInputChange}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Driver</option>
                        {drivers
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((driver) => (
                            <option
                              key={driver.driverId}
                              value={driver.driverId}
                            >
                              {driver.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="startTimeForDriver"
                        className="block text-gray-700 text-sm font-bold mb-2"
                      >
                        Start Time for Driver
                      </label>
                      <input
                        type="time"
                        id="startTimeForDriver"
                        name="startTimeForDriver"
                        value={formData.startTimeForDriver}
                        onChange={handleInputChange}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="endTimeForDriver"
                        className="block text-gray-700 text-sm font-bold mb-2"
                      >
                        End Time for Driver
                      </label>
                      <input
                        type="time"
                        id="endTimeForDriver"
                        name="endTimeForDriver"
                        value={formData.endTimeForDriver}
                        onChange={handleInputChange}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Unit and Tickets Section */}
                <div className="mb-6">
                  <h3 className="text-md font-medium mb-3 flex items-center text-indigo-600">
                    <TruckIcon className="w-5 h-5 mr-2" />
                    Unit and Tickets
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="unitId"
                        className="block text-gray-700 text-sm font-bold mb-2"
                      >
                        Unit Number
                      </label>
                      <select
                        id="unitId"
                        name="unitId"
                        value={formData.unitId}
                        onChange={handleInputChange}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Unit</option>
                        {units
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((unit) => (
                            <option key={unit.unitId} value={unit.unitId}>
                              {unit.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Ticket IDs
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={ticketInput}
                          onChange={(e) => setTicketInput(e.target.value)}
                          onKeyDown={handleTicketKeyDown}
                          placeholder="Enter ticket ID and press Enter"
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const value = ticketInput.trim();
                            if (value && !formData.ticketIds.includes(value)) {
                              setFormData((prev) => ({
                                ...prev,
                                ticketIds: [...prev.ticketIds, value],
                              }));
                              setTicketInput("");
                            }
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.ticketIds.map((id) => (
                          <span
                            key={id}
                            className="inline-flex items-center bg-indigo-100 text-indigo-800 rounded-full px-3 py-1 text-sm"
                          >
                            {id}
                            <button
                              type="button"
                              className="ml-2 text-indigo-600 hover:text-indigo-800"
                              onClick={() => removeTicketId(id)}
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Images Section */}
                <div className="mb-6">
                  <h3 className="text-md font-medium mb-3 flex items-center text-indigo-600">
                    <PhotoIcon className="w-5 h-5 mr-2" />
                    Images
                  </h3>
                  <div>
                    <label
                      htmlFor="images"
                      className="block text-gray-700 text-sm font-bold mb-2"
                    >
                      Upload Images
                    </label>
                    <input
                      type="file"
                      id="images"
                      name="images"
                      onChange={handleImageChange}
                      multiple
                      className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-8">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className={`${
                      isEditing
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-green-600 hover:bg-green-700"
                    } text-white py-2 px-4 rounded transition-colors`}
                  >
                    {isEditing ? "Update Job" : "Add Job"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Job List */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Job List</h2>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-lg shadow-md border border-gray-200">
              <p className="text-gray-500 text-lg">
                No jobs found. Try adjusting your filters.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow-md rounded-lg border border-gray-200 overflow-hidden">
              <JobListSection
                allJobTypes={jobTypes}
                allJobs={filteredJobs}
                allDispatchers={dispatchers}
                jobsByMonthAndUnit={jobsByMonthAndUnit}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
