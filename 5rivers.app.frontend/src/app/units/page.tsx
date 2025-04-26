"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
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
import { fetchGraphQL, mutateGraphQL } from "../../lib/graphql-client";
import {
  GET_UNITS,
  CREATE_UNIT,
  UPDATE_UNIT,
  DELETE_UNIT,
} from "@/lib/graphql-client";

type SortField = "name" | "unitId";

interface Unit {
  unitId: string;
  name: string;
  description?: string;
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [formState, setFormState] = useState<Partial<Unit>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ hasDescription: false });
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // sync query data
  useEffect(() => {
    const loadUnits = async () => {
      const data = await fetchGraphQL(GET_UNITS);
      if (data?.units) {
        setUnits(data.units);
      }
    };
    loadUnits();
  }, []);

  // filter + sort
  useEffect(() => {
    let result = [...units];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.description?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filters.hasDescription) {
      result = result.filter((u) => !!u.description?.trim());
    }
    result.sort((a, b) => {
      if (sortField === "name") {
        return sortOrder === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      return sortOrder === "asc"
        ? a.unitId.localeCompare(b.unitId)
        : b.unitId.localeCompare(a.unitId);
    });
    setFilteredUnits(result);
  }, [units, searchTerm, filters, sortField, sortOrder]);

  const resetForm = () => {
    setFormState({});
    setIsEditing(false);
    setShowForm(false);
  };

  const handleCreate = async () => {
    try {
      await mutateGraphQL(CREATE_UNIT, {
        name: formState.name,
        description: formState.description,
      });
      const data = await fetchGraphQL(GET_UNITS);
      if (data?.units) {
        setUnits(data.units);
        setFilteredUnits(data.units);
      }
      toast.success("Unit created");
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message);
    }
  };

  const handleUpdate = async () => {
    if (!formState.unitId) return;
    try {
      await mutateGraphQL(UPDATE_UNIT, {
        unitId: formState.unitId,
        name: formState.name,
        description: formState.description,
      });
      const data = await fetchGraphQL(GET_UNITS);
      if (data?.units) {
        setUnits(data.units);
        setFilteredUnits(data.units);
      }
      toast.success("Unit updated");
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message);
    }
  };

  const handleDelete = async (unitId: string) => {
    if (!confirm("Delete this unit?")) return;
    try {
      await mutateGraphQL(DELETE_UNIT, { unitId });
      const data = await fetchGraphQL(GET_UNITS);
      if (data?.units) {
        setUnits(data.units);
        setFilteredUnits(data.units);
      }
      toast.success("Unit deleted");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message);
    }
  };

  const handleEdit = (unit: Unit) => {
    setFormState(unit);
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field)
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Head>
        <title>Units — 5Rivers App</title>
      </Head>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-8 text-center text-indigo-600">
          Units Management
        </h1>

        {/* search & buttons */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-grow max-w-md">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search units…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowForm((v) => !v)}
                className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded"
              >
                <PlusIcon className="w-5 h-5 mr-1" />
                {showForm ? "Hide Form" : "Add Unit"}
              </button>
              <button
                onClick={() => setShowFilters((v) => !v)}
                className="flex items-center bg-indigo-100 hover:bg-indigo-200 text-indigo-700 py-2 px-4 rounded"
              >
                <FunnelIcon className="w-5 h-5 mr-1" />
                Filters {showFilters ? "▲" : "▼"}
              </button>
              <span className="text-sm text-gray-500">
                {filteredUnits.length}{" "}
                {filteredUnits.length === 1 ? "unit" : "units"}
              </span>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mt-4 border-t pt-4"
              >
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.hasDescription}
                    onChange={() =>
                      setFilters((f) => ({
                        ...f,
                        hasDescription: !f.hasDescription,
                      }))
                    }
                    className="form-checkbox text-indigo-600"
                  />
                  <span className="ml-2">Has description</span>
                </label>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleSort("name")}
                      className={`px-3 py-1 rounded-full text-sm ${
                        sortField === "name"
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      Name{" "}
                      {sortField === "name" &&
                        (sortOrder === "asc" ? "↑" : "↓")}
                    </button>
                    <button
                      onClick={() => toggleSort("unitId")}
                      className={`px-3 py-1 rounded-full text-sm ${
                        sortField === "unitId"
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      ID{" "}
                      {sortField === "unitId" &&
                        (sortOrder === "asc" ? "↑" : "↓")}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setFilters({ hasDescription: false });
                      setSortField("name");
                      setSortOrder("asc");
                    }}
                    className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-3 rounded text-sm"
                  >
                    <XMarkIcon className="w-4 h-4 mr-1" />
                    Clear
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* create/edit form */}
        <AnimatePresence>
          {showForm && (
            <motion.form
              onSubmit={isEditing ? handleUpdate : handleCreate}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white p-6 rounded-lg shadow mb-6 border"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <TruckIcon className="w-5 h-5 mr-2 text-indigo-600" />
                  {isEditing ? "Edit Unit" : "Add Unit"}
                </h2>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium mb-1"
                  >
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formState.name || ""}
                    onChange={(e) =>
                      setFormState((f) => ({ ...f, name: e.target.value }))
                    }
                    required
                    className="w-full border rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={2}
                    value={formState.description || ""}
                    onChange={(e) =>
                      setFormState((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    className="w-full border rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
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
                  } text-white py-2 px-4 rounded`}
                >
                  {isEditing ? "Update" : "Create"}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* list */}
        {filteredUnits.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-lg shadow border text-gray-500">
            No units found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredUnits.map((unit) => (
                <motion.div
                  key={unit.unitId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white p-6 shadow rounded-lg border hover:shadow-lg"
                >
                  <div className="flex items-center mb-3">
                    <TruckIcon className="w-5 h-5 text-indigo-600 mr-2" />
                    <h3 className="text-xl font-bold text-indigo-700">
                      {unit.name}
                    </h3>
                  </div>
                  {unit.description && (
                    <p className="text-gray-600 mb-4">{unit.description}</p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleEdit(unit)}
                      className="flex items-center bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded"
                    >
                      <PencilIcon className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(unit.unitId)}
                      className="flex items-center bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
                    >
                      <TrashIcon className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
