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
  TruckIcon,
} from "@heroicons/react/24/outline";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Unit = {
  id: number;
  name: string;
  description?: string;
};

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [formState, setFormState] = useState<Partial<Unit>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filters, setFilters] = useState({
    hasDescription: false,
  });
  const [sortField, setSortField] = useState<"name" | "id">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchUnits = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/units`);
      if (!res.ok) throw new Error("Failed to fetch units");
      const data = await res.json();
      setUnits(data);
      setFilteredUnits(data);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load units");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...units];

    // Apply search
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(
        (unit) =>
          unit.name.toLowerCase().includes(lowerSearchTerm) ||
          (unit.description &&
            unit.description.toLowerCase().includes(lowerSearchTerm))
      );
    }

    // Apply has description filter
    if (filters.hasDescription) {
      result = result.filter(
        (unit) => !!unit.description && unit.description.trim() !== ""
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortField === "name") {
        return sortOrder === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        return sortOrder === "asc" ? a.id - b.id : b.id - a.id;
      }
    });

    setFilteredUnits(result);
  }, [units, searchTerm, filters, sortField, sortOrder]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const method = isEditing ? "PUT" : "POST";
    const endpoint = isEditing
      ? `${API_URL}/units/${formState.id}`
      : `${API_URL}/units`;

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      if (!res.ok) throw new Error("Failed to save unit");

      toast.success(
        isEditing ? "Unit updated successfully" : "Unit added successfully"
      );
      await fetchUnits();
      resetForm();
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to save unit");
    }
  };

  const resetForm = () => {
    setFormState({});
    setIsEditing(false);
    setShowAddForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this unit?")) return;

    try {
      const res = await fetch(`${API_URL}/units/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete unit");

      setUnits((prev) => prev.filter((unit) => unit.id !== id));
      toast.success("Unit deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete unit");
    }
  };

  const handleEdit = (unit: Unit) => {
    setFormState(unit);
    setIsEditing(true);
    setShowAddForm(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const toggleSortOrder = (field: "name" | "id") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Head>
        <title>Units - 5rivers.app.client</title>
      </Head>

      <ToastContainer position="top-right" autoClose={3000} />

      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-8 text-center text-indigo-600">
          Units Management
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
                placeholder="Search units..."
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
                {showAddForm ? "Hide Form" : "Add Unit"}
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
                  {filteredUnits.length}{" "}
                  {filteredUnits.length === 1 ? "unit" : "units"}
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
                  <div className="flex flex-wrap gap-4">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.hasDescription}
                        onChange={() =>
                          setFilters((prev) => ({
                            ...prev,
                            hasDescription: !prev.hasDescription,
                          }))
                        }
                        className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                      />
                      <span className="ml-2">Has Description</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleSortOrder("name")}
                        className={`flex items-center px-3 py-1 rounded-full text-sm ${
                          sortField === "name"
                            ? "bg-indigo-500 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        Sort by Name{" "}
                        {sortField === "name" &&
                          (sortOrder === "asc" ? "↑" : "↓")}
                      </button>
                      <button
                        onClick={() => toggleSortOrder("id")}
                        className={`flex items-center px-3 py-1 rounded-full text-sm ${
                          sortField === "id"
                            ? "bg-indigo-500 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        Sort by ID{" "}
                        {sortField === "id" &&
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

        {/* Unit Form */}
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
                    <TruckIcon className="w-5 h-5 mr-2" />
                    {isEditing ? "Update Unit" : "Add New Unit"}
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
                      htmlFor="name"
                    >
                      Unit Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      placeholder="Enter unit name"
                      value={formState.name || ""}
                      onChange={handleChange}
                      required
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="description"
                    >
                      Description (Optional)
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      placeholder="Enter unit description"
                      value={formState.description || ""}
                      onChange={handleChange}
                      rows={3}
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
                    {isEditing ? "Update Unit" : "Add Unit"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Units List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-lg shadow-md border border-gray-200">
            <p className="text-gray-500 text-lg">
              No units found matching your filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredUnits.map((unit) => (
                <motion.div
                  key={unit.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white p-6 shadow-md rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center mb-3">
                    <TruckIcon className="w-5 h-5 text-indigo-600 mr-2" />
                    <h3 className="text-xl font-bold text-indigo-700">
                      {unit.name}
                    </h3>
                  </div>

                  {unit.description && (
                    <div className="mb-4 text-gray-600">
                      <p>{unit.description}</p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4 justify-end">
                    <button
                      onClick={() => handleEdit(unit)}
                      className="flex items-center bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded transition-colors"
                    >
                      <PencilIcon className="w-4 h-4 mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(unit.id)}
                      className="flex items-center bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded transition-colors"
                    >
                      <TrashIcon className="w-4 h-4 mr-1" /> Delete
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
