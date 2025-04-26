"use client";
import React, { useState, useEffect } from "react";
import Head from "next/head";
import { gql } from "@apollo/client";
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  CREATE_JOBTYPE,
  DELETE_JOBTYPE,
  fetchGraphQL,
  GET_JOBTYPES,
  mutateGraphQL,
  UPDATE_JOBTYPE,
} from "../../lib/graphql-client";

export type JobType = {
  jobTypeId: string;
  title: string;
  dispatchType?: string;
  startLocation?: string;
  endLocation?: string;
  rateOfJob?: number;
  companyId?: string;
};

export default function JobTypesPage() {
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [formState, setFormState] = useState<Partial<JobType>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ hasDispatchType: false });
  const [sortField, setSortField] = useState<"title" | "jobTypeId">("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const loadJobTypes = async () => {
      const data = await fetchGraphQL(GET_JOBTYPES);
      if (data?.jobTypes) {
        setJobTypes(data.jobTypes);
      }
    };
    loadJobTypes();
  }, []);

  // Compute filtered/sorted list on render
  const filteredJobTypes = React.useMemo(() => {
    let result = [...jobTypes];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (jt) =>
          jt.title.toLowerCase().includes(q) ||
          (jt.dispatchType?.toLowerCase().includes(q) ?? false)
      );
    }

    if (filters.hasDispatchType) {
      result = result.filter((jt) => !!jt.dispatchType?.trim());
    }

    result.sort((a, b) => {
      if (sortField === "title") {
        return sortOrder === "asc"
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      } else {
        // jobTypeId is a string (UUID), so just compare as string
        return sortOrder === "asc"
          ? a.jobTypeId.localeCompare(b.jobTypeId)
          : b.jobTypeId.localeCompare(a.jobTypeId);
      }
    });

    return result;
  }, [jobTypes, searchTerm, filters, sortField, sortOrder]);

  const resetForm = () => {
    setFormState({});
    setIsEditing(false);
    setShowForm(false);
  };

  const handleCreateJobType = async () => {
    await mutateGraphQL(CREATE_JOBTYPE, {
      title: formState.title,
      dispatchType: formState.dispatchType,
      startLocation: formState.startLocation,
      endLocation: formState.endLocation,
      rateOfJob: formState.rateOfJob,
      companyId: formState.companyId,
    });
    const data = await fetchGraphQL(GET_JOBTYPES);
    if (data?.jobTypes) {
      setJobTypes(data.jobTypes);
    }
    resetForm();
  };

  const handleUpdateJobType = async () => {
    if (!formState.jobTypeId) return;
    await mutateGraphQL(UPDATE_JOBTYPE, {
      jobTypeId: formState.jobTypeId,
      title: formState.title,
      dispatchType: formState.dispatchType,
      startLocation: formState.startLocation,
      endLocation: formState.endLocation,
      rateOfJob: formState.rateOfJob,
      companyId: formState.companyId,
    });
    const data = await fetchGraphQL(GET_JOBTYPES);
    if (data?.jobTypes) {
      setJobTypes(data.jobTypes);
    }
    resetForm();
  };

  const handleDeleteJobType = async (jobTypeId: string) => {
    await mutateGraphQL(DELETE_JOBTYPE, { jobTypeId });
    const data = await fetchGraphQL(GET_JOBTYPES);
    if (data?.jobTypes) {
      setJobTypes(data.jobTypes);
    }
  };

  const handleEdit = (jt: JobType) => {
    setFormState(jt);
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleSortOrder = (field: "title" | "jobTypeId") => {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Head>
        <title>Job Types – GraphQL</title>
      </Head>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold text-center text-indigo-600 mb-8">
          Job Types Management
        </h1>

        <div className="bg-white p-4 rounded-lg shadow-md mb-6 border">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="relative flex-grow max-w-md">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute inset-y-0 left-3" />
              <input
                type="text"
                placeholder="Search job types…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border rounded w-full py-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm((f) => !f)}
                className="bg-indigo-600 px-4 py-2 text-white rounded flex items-center"
              >
                <PlusIcon className="w-5 h-5 mr-1" />
                {showForm ? "Hide Form" : "Add Job Type"}
              </button>
              <button
                onClick={() => setShowFilters((f) => !f)}
                className="bg-indigo-100 px-4 py-2 text-indigo-700 rounded flex items-center"
              >
                <FunnelIcon className="w-5 h-5 mr-1" />
                Filters
              </button>
            </div>
          </div>
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t pt-4"
              >
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.hasDispatchType}
                      onChange={() =>
                        setFilters((f) => ({
                          ...f,
                          hasDispatchType: !f.hasDispatchType,
                        }))
                      }
                      className="form-checkbox h-4 w-4 text-indigo-600"
                    />
                    <span className="ml-2">Has Dispatch Type</span>
                  </label>
                </div>
                <div className="flex justify-between mt-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleSortOrder("title")}
                      className={`px-3 py-1 rounded ${
                        sortField === "title"
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-200"
                      }`}
                    >
                      Title{" "}
                      {sortField === "title" &&
                        (sortOrder === "asc" ? "↑" : "↓")}
                    </button>
                    <button
                      onClick={() => toggleSortOrder("jobTypeId")}
                      className={`px-3 py-1 rounded ${
                        sortField === "jobTypeId"
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-200"
                      }`}
                    >
                      ID{" "}
                      {sortField === "jobTypeId" &&
                        (sortOrder === "asc" ? "↑" : "↓")}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setFilters({ hasDispatchType: false });
                      setSortField("title");
                      setSortOrder("asc");
                    }}
                    className="px-3 py-1 bg-gray-200 rounded"
                  >
                    Clear
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              onSubmit={(e) => {
                e.preventDefault();
                isEditing ? handleUpdateJobType() : handleCreateJobType();
              }}
              className="bg-white p-6 rounded shadow mb-6 border"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <TruckIcon className="w-5 h-5 mr-1" />
                  {isEditing ? "Update Job Type" : "Add New Job Type"}
                </h2>
                <button type="button" onClick={resetForm}>
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  name="title"
                  value={formState.title || ""}
                  onChange={(e) =>
                    setFormState((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Job Type Title"
                  required
                  className="border rounded py-2 px-3 focus:ring-indigo-500"
                />
                <input
                  name="dispatchType"
                  value={formState.dispatchType || ""}
                  onChange={(e) =>
                    setFormState((f) => ({
                      ...f,
                      dispatchType: e.target.value,
                    }))
                  }
                  placeholder="Dispatch Type (optional)"
                  className="border rounded py-2 px-3 focus:ring-indigo-500"
                />
                <input
                  name="startLocation"
                  value={formState.startLocation || ""}
                  onChange={(e) =>
                    setFormState((f) => ({
                      ...f,
                      startLocation: e.target.value,
                    }))
                  }
                  placeholder="Start Location (optional)"
                  className="border rounded py-2 px-3 focus:ring-indigo-500"
                />
                <input
                  name="endLocation"
                  value={formState.endLocation || ""}
                  onChange={(e) =>
                    setFormState((f) => ({
                      ...f,
                      endLocation: e.target.value,
                    }))
                  }
                  placeholder="End Location (optional)"
                  className="border rounded py-2 px-3 focus:ring-indigo-500"
                />
                <input
                  name="rateOfJob"
                  type="number"
                  value={formState.rateOfJob || ""}
                  onChange={(e) =>
                    setFormState((f) => ({
                      ...f,
                      rateOfJob: parseFloat(e.target.value),
                    }))
                  }
                  placeholder="Rate of Job (optional)"
                  className="border rounded py-2 px-3 focus:ring-indigo-500"
                />
                <input
                  name="companyId"
                  value={formState.companyId || ""}
                  onChange={(e) =>
                    setFormState((f) => ({
                      ...f,
                      companyId: e.target.value,
                    }))
                  }
                  placeholder="Company ID (optional)"
                  className="border rounded py-2 px-3 focus:ring-indigo-500"
                />
              </div>
              <div className="mt-4 text-right">
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="mr-2 px-4 py-2 bg-gray-500 text-white rounded"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  {isEditing ? "Update" : "Save"}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {filteredJobTypes.length === 0 ? (
          <div className="bg-white p-8 text-center rounded shadow border">
            <p>No job types found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobTypes.map((jt) => (
              <motion.div
                key={jt.jobTypeId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white p-6 shadow-md rounded-lg border hover:shadow-lg"
              >
                <div className="flex items-center mb-3">
                  <TruckIcon className="w-5 h-5 text-indigo-600 mr-2" />
                  <h3 className="text-xl font-bold text-indigo-700">
                    {jt.title}
                  </h3>
                </div>
                {jt.dispatchType && (
                  <p className="text-gray-600 mb-4">{jt.dispatchType}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => handleEdit(jt)}
                    className="flex items-center bg-blue-500 px-3 py-1 text-white rounded"
                  >
                    <PencilIcon className="w-4 h-4 mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteJobType(jt.jobTypeId)}
                    className="flex items-center bg-red-500 px-3 py-1 text-white rounded"
                  >
                    <TrashIcon className="w-4 h-4 mr-1" /> Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
