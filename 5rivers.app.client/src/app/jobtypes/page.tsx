"use client";
import { useState, useEffect, FormEvent, useCallback } from "react";
import Head from "next/head";
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowsRightLeftIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface JobType {
  jobTypeId: string;
  title: string;
  startLocation: string;
  endLocation: string;
  dispatchType: string;
  rateOfJob: number;
  companyId: string;
}

interface Company {
  companyId: string;
  name: string;
}

export default function JobTypesPage() {
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [filteredJobTypes, setFilteredJobTypes] = useState<JobType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formState, setFormState] = useState<Partial<JobType>>({
    dispatchType: "Hourly",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dispatchType: "",
    companyId: "",
    minRate: "",
    maxRate: "",
  });
  const [expandedCompanies, setExpandedCompanies] = useState<
    Record<string, boolean>
  >({});
  const [sortField, setSortField] = useState<"title" | "rateOfJob">("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchJobTypes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/jobtypes`);
      if (!res.ok) throw new Error("Failed to fetch job types");
      const data = await res.json();
      setJobTypes(data);
      setFilteredJobTypes(data);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load job types");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/companies`);
      if (!res.ok) throw new Error("Failed to fetch companies");
      const data = await res.json();
      setCompanies(data);

      // Initialize all companies as expanded
      const initialExpandedState: Record<string, boolean> = {};
      data.forEach((company: Company) => {
        initialExpandedState[company.companyId] = true;
      });
      setExpandedCompanies(initialExpandedState);
    } catch (error) {
      console.error("Fetch companies error:", error);
      toast.error("Failed to load companies");
    }
  }, []);

  useEffect(() => {
    fetchJobTypes();
    fetchCompanies();
  }, [fetchJobTypes, fetchCompanies]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...jobTypes];

    // Apply search
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(
        (jobType) =>
          jobType.title.toLowerCase().includes(lowerSearchTerm) ||
          (jobType.startLocation &&
            jobType.startLocation.toLowerCase().includes(lowerSearchTerm)) ||
          (jobType.endLocation &&
            jobType.endLocation.toLowerCase().includes(lowerSearchTerm))
      );
    }

    // Apply dispatch type filter
    if (filters.dispatchType) {
      result = result.filter(
        (jobType) => jobType.dispatchType === filters.dispatchType
      );
    }

    // Apply company filter
    if (filters.companyId) {
      result = result.filter(
        (jobType) => jobType.companyId === filters.companyId
      );
    }

    // Apply rate range filters
    if (filters.minRate) {
      const minRate = parseFloat(filters.minRate);
      if (!isNaN(minRate)) {
        result = result.filter((jobType) => jobType.rateOfJob >= minRate);
      }
    }

    if (filters.maxRate) {
      const maxRate = parseFloat(filters.maxRate);
      if (!isNaN(maxRate)) {
        result = result.filter((jobType) => jobType.rateOfJob <= maxRate);
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortField === "rateOfJob") {
        // Numeric sort for rate
        return sortOrder === "asc"
          ? a.rateOfJob - b.rateOfJob
          : b.rateOfJob - a.rateOfJob;
      } else {
        // String sort for title
        return sortOrder === "asc"
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
    });

    setFilteredJobTypes(result);
  }, [jobTypes, searchTerm, filters, sortField, sortOrder]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const method = isEditing ? "PUT" : "POST";
    const endpoint = isEditing
      ? `${API_URL}/jobtypes/${formState.jobTypeId}`
      : `${API_URL}/jobtypes`;

    const payload = {
      ...formState,
      rateOfJob: parseFloat(formState.rateOfJob as unknown as string),
    };

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save job type");

      toast.success(
        isEditing
          ? "Job type updated successfully"
          : "Job type added successfully"
      );
      await fetchJobTypes();
      resetForm();
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to save job type");
    }
  };

  const resetForm = () => {
    setFormState({ dispatchType: "Hourly" });
    setIsEditing(false);
    setShowAddForm(false);
  };

  const handleDelete = async (jobTypeId: string) => {
    if (!confirm("Are you sure you want to delete this job type?")) return;

    try {
      const res = await fetch(`${API_URL}/jobtypes/${jobTypeId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete job type");

      setJobTypes((prev) => prev.filter((jt) => jt.jobTypeId !== jobTypeId));
      toast.success("Job type deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete job type");
    }
  };

  const handleEdit = (jobType: JobType) => {
    setFormState(jobType);
    setIsEditing(true);
    setShowAddForm(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      dispatchType: "",
      companyId: "",
      minRate: "",
      maxRate: "",
    });
    setSearchTerm("");
  };

  const toggleCompanyExpanded = (companyId: string) => {
    setExpandedCompanies((prev) => ({
      ...prev,
      [companyId]: !prev[companyId],
    }));
  };

  const toggleSortOrder = (field: "title" | "rateOfJob") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Group job types by company for display
  const jobTypesByCompany = filteredJobTypes.reduce((acc, jobType) => {
    const companyId = jobType.companyId || "uncategorized";
    if (!acc[companyId]) acc[companyId] = [];
    acc[companyId].push(jobType);
    return acc;
  }, {} as Record<string, JobType[]>);

  // Get all dispatch types for the filter dropdown
  const dispatchTypes = Array.from(
    new Set(jobTypes.map((jt) => jt.dispatchType))
  ).sort();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Head>
        <title>Job Types - 5rivers.app.client</title>
      </Head>

      <ToastContainer position="top-right" autoClose={3000} />

      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-8 text-center text-indigo-600">
          Job Types Management
        </h1>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="relative flex-grow max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search job types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-1" />{" "}
                {showAddForm ? "Hide Form" : "Add Job Type"}
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
                  {filteredJobTypes.length}{" "}
                  {filteredJobTypes.length === 1 ? "job type" : "job types"}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Dispatch Type
                      </label>
                      <select
                        name="dispatchType"
                        value={filters.dispatchType}
                        onChange={handleFilterChange}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Types</option>
                        {dispatchTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Company
                      </label>
                      <select
                        name="companyId"
                        value={filters.companyId}
                        onChange={handleFilterChange}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Companies</option>
                        {companies
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((company) => (
                            <option
                              key={company.companyId}
                              value={company.companyId}
                            >
                              {company.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Min Rate ($)
                      </label>
                      <input
                        type="number"
                        name="minRate"
                        placeholder="Min rate"
                        value={filters.minRate}
                        onChange={handleFilterChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Max Rate ($)
                      </label>
                      <input
                        type="number"
                        name="maxRate"
                        placeholder="Max rate"
                        value={filters.maxRate}
                        onChange={handleFilterChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleSortOrder("title")}
                        className={`flex items-center px-3 py-1 rounded-full text-sm ${
                          sortField === "title"
                            ? "bg-indigo-500 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        Sort by Title{" "}
                        {sortField === "title" &&
                          (sortOrder === "asc" ? "↑" : "↓")}
                      </button>
                      <button
                        onClick={() => toggleSortOrder("rateOfJob")}
                        className={`flex items-center px-3 py-1 rounded-full text-sm ${
                          sortField === "rateOfJob"
                            ? "bg-indigo-500 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        Sort by Rate{" "}
                        {sortField === "rateOfJob" &&
                          (sortOrder === "asc" ? "↑" : "↓")}
                      </button>
                    </div>

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

        {/* Job Type Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <form
                onSubmit={handleSubmit}
                className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-8 border border-gray-200"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold flex items-center">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    {isEditing ? "Update Job Type" : "Add New Job Type"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="title"
                    >
                      Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      placeholder="Enter job type title"
                      value={formState.title || ""}
                      onChange={handleChange}
                      required
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="companyId"
                    >
                      Company
                    </label>
                    <select
                      id="companyId"
                      name="companyId"
                      value={formState.companyId || ""}
                      onChange={handleChange}
                      required
                      className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Company</option>
                      {companies
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((company) => (
                          <option
                            key={company.companyId}
                            value={company.companyId}
                          >
                            {company.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="startLocation"
                    >
                      Start Location
                    </label>
                    <input
                      type="text"
                      id="startLocation"
                      name="startLocation"
                      placeholder="Enter start location"
                      value={formState.startLocation || ""}
                      onChange={handleChange}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="endLocation"
                    >
                      End Location
                    </label>
                    <input
                      type="text"
                      id="endLocation"
                      name="endLocation"
                      placeholder="Enter end location"
                      value={formState.endLocation || ""}
                      onChange={handleChange}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="dispatchType"
                    >
                      Dispatch Type
                    </label>
                    <select
                      id="dispatchType"
                      name="dispatchType"
                      value={formState.dispatchType || "Hourly"}
                      onChange={handleChange}
                      required
                      className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Hourly">Hourly</option>
                      <option value="Tonnage">Tonnage</option>
                      <option value="Fixed">Fixed</option>
                      <option value="Load">Load</option>
                    </select>
                  </div>

                  <div>
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="rateOfJob"
                    >
                      Rate of Job ($)
                    </label>
                    <input
                      type="number"
                      id="rateOfJob"
                      name="rateOfJob"
                      placeholder="Enter rate"
                      value={formState.rateOfJob || ""}
                      onChange={handleChange}
                      required
                      step="0.01"
                      min="0"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
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
                        ? "bg-blue-500 hover:bg-blue-600"
                        : "bg-green-500 hover:bg-green-600"
                    } text-white py-2 px-4 rounded transition-colors`}
                  >
                    {isEditing ? "Update Job Type" : "Add Job Type"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Job Types List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : Object.keys(jobTypesByCompany).length === 0 ? (
          <div className="bg-white p-8 text-center rounded-lg shadow-md border border-gray-200">
            <p className="text-gray-500 text-lg">
              No job types found matching your filters.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(jobTypesByCompany).map(([companyId, types]) => {
              const companyName =
                companies.find((c) => c.companyId === companyId)?.name ||
                "Uncategorized";

              return (
                <div
                  key={companyId}
                  className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer bg-indigo-50"
                    onClick={() => toggleCompanyExpanded(companyId)}
                  >
                    <h2 className="text-xl font-bold flex items-center text-indigo-700">
                      <BuildingOfficeIcon className="w-5 h-5 mr-2" />
                      {companyName}
                    </h2>
                    <button className="p-1 rounded-full hover:bg-indigo-100">
                      {expandedCompanies[companyId] ? (
                        <ChevronUpIcon className="w-5 h-5 text-indigo-700" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-indigo-700" />
                      )}
                    </button>
                  </div>

                  <AnimatePresence>
                    {expandedCompanies[companyId] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {types.map((jt) => (
                              <div
                                key={jt.jobTypeId}
                                className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                              >
                                <h3 className="text-xl font-bold mb-3 text-indigo-700">
                                  {jt.title}
                                </h3>

                                <div className="space-y-2 mb-4">
                                  {jt.startLocation && jt.endLocation && (
                                    <div className="flex items-start">
                                      <ArrowsRightLeftIcon className="w-4 h-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                                      <div>
                                        <span className="font-medium">
                                          Route:{" "}
                                        </span>
                                        {jt.startLocation} → {jt.endLocation}
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex items-start">
                                    <div className="font-medium mr-2">
                                      Type:
                                    </div>
                                    <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                      {jt.dispatchType}
                                    </span>
                                  </div>

                                  <div className="flex items-start">
                                    <CurrencyDollarIcon className="w-4 h-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                                    <div>
                                      <span className="font-medium">
                                        Rate:{" "}
                                      </span>
                                      {jt.rateOfJob.toLocaleString("en-US", {
                                        style: "currency",
                                        currency: "USD",
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-2 mt-4 justify-end">
                                  <button
                                    onClick={() => handleEdit(jt)}
                                    className="flex items-center bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded transition-colors"
                                  >
                                    <PencilIcon className="w-4 h-4 mr-1" /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(jt.jobTypeId)}
                                    className="flex items-center bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded transition-colors"
                                  >
                                    <TrashIcon className="w-4 h-4 mr-1" />{" "}
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
