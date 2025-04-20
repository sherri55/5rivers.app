"use client";
import { useState, useEffect, FormEvent, useCallback } from "react";
import Head from "next/head";
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Driver {
  driverId: number;
  name: string;
  description: string;
  email: string;
  phone: string;
  hourlyRate: number;
}

type SortField = "name" | "email" | "phone" | "hourlyRate";
type SortOrder = "asc" | "desc";

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [formState, setFormState] = useState<Partial<Driver>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    hasEmail: false,
    hasPhone: false,
    hasDescription: false,
    hourlyRateRange: {
      min: "",
      max: "",
    },
  });

  const fetchDrivers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/drivers`);
      if (!res.ok) throw new Error("Failed to fetch drivers");
      const data = await res.json();
      setDrivers(data);
      setFilteredDrivers(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load drivers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...drivers];

    // Apply filters
    if (filters.hasEmail) {
      result = result.filter(
        (driver) => driver.email && driver.email.trim() !== ""
      );
    }

    if (filters.hasPhone) {
      result = result.filter(
        (driver) => driver.phone && driver.phone.trim() !== ""
      );
    }

    if (filters.hasDescription) {
      result = result.filter(
        (driver) => driver.description && driver.description.trim() !== ""
      );
    }

    // Apply hourly rate range filter
    if (filters.hourlyRateRange.min !== "") {
      const minRate = parseFloat(filters.hourlyRateRange.min);
      if (!isNaN(minRate)) {
        result = result.filter((driver) => driver.hourlyRate >= minRate);
      }
    }

    if (filters.hourlyRateRange.max !== "") {
      const maxRate = parseFloat(filters.hourlyRateRange.max);
      if (!isNaN(maxRate)) {
        result = result.filter((driver) => driver.hourlyRate <= maxRate);
      }
    }

    // Apply search
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(
        (driver) =>
          driver.name.toLowerCase().includes(lowerSearchTerm) ||
          (driver.email &&
            driver.email.toLowerCase().includes(lowerSearchTerm)) ||
          (driver.phone &&
            driver.phone.toLowerCase().includes(lowerSearchTerm)) ||
          (driver.description &&
            driver.description.toLowerCase().includes(lowerSearchTerm)) ||
          (driver.hourlyRate &&
            driver.hourlyRate.toString().includes(lowerSearchTerm))
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortField === "hourlyRate") {
        // Numeric sort for hourly rate
        const valueA = a[sortField] || 0;
        const valueB = b[sortField] || 0;
        return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
      } else {
        // String sort for other fields
        const valueA = a[sortField] || "";
        const valueB = b[sortField] || "";
        return sortOrder === "asc"
          ? valueA.toString().localeCompare(valueB.toString())
          : valueB.toString().localeCompare(valueA.toString());
      }
    });

    setFilteredDrivers(result);
  }, [drivers, searchTerm, sortField, sortOrder, filters]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const method = isEditing ? "PUT" : "POST";
    const endpoint = isEditing
      ? `${API_URL}/drivers/${formState.driverId}`
      : `${API_URL}/drivers`;

    const payload = {
      ...formState,
      hourlyRate: formState.hourlyRate
        ? parseFloat(formState.hourlyRate.toString())
        : 0,
    };

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save driver");

      toast.success(
        isEditing ? "Driver updated successfully" : "Driver added successfully"
      );
      await fetchDrivers();
      setFormState({});
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error(
        isEditing ? "Failed to update driver" : "Failed to add driver"
      );
    }
  };

  const handleDelete = async (driverId: number) => {
    if (!confirm("Are you sure you want to delete this driver?")) return;

    try {
      const res = await fetch(`${API_URL}/drivers/${driverId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete driver");

      setDrivers((prev) => prev.filter((d) => d.driverId !== driverId));
      toast.success("Driver deleted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete driver");
    }
  };

  const handleEdit = (driver: Driver) => {
    setFormState({ ...driver });
    setIsEditing(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormState({});
    setIsEditing(false);
  };

  const toggleSortOrder = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleFilterChange = (filterName: keyof typeof filters) => {
    if (filterName === "hourlyRateRange") return;

    setFilters((prev) => ({
      ...prev,
      [filterName]: !prev[filterName],
    }));
  };

  const handleRateRangeChange = (type: "min" | "max", value: string) => {
    setFilters((prev) => ({
      ...prev,
      hourlyRateRange: {
        ...prev.hourlyRateRange,
        [type]: value,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Head>
        <title>Drivers - 5rivers.app.client</title>
        <meta name="description" content="Manage drivers for 5rivers" />
      </Head>

      <ToastContainer position="top-right" autoClose={3000} />

      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-8 text-center text-indigo-600">
          Drivers Management
        </h1>

        {/* Driver Form */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-8 border border-gray-200"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <PlusIcon className="w-5 h-5 mr-2" />{" "}
              {isEditing ? "Update Driver" : "Add New Driver"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  className="block text-gray-700 text-sm font-bold mb-2"
                  htmlFor="name"
                >
                  Driver Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Enter driver name"
                  value={formState.name || ""}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label
                  className="block text-gray-700 text-sm font-bold mb-2"
                  htmlFor="email"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Enter driver email"
                  value={formState.email || ""}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  className="block text-gray-700 text-sm font-bold mb-2"
                  htmlFor="phone"
                >
                  Phone
                </label>
                <input
                  id="phone"
                  type="text"
                  name="phone"
                  placeholder="Enter driver phone"
                  value={formState.phone || ""}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  className="block text-gray-700 text-sm font-bold mb-2"
                  htmlFor="hourlyRate"
                >
                  Hourly Rate
                </label>
                <input
                  id="hourlyRate"
                  type="number"
                  name="hourlyRate"
                  placeholder="Enter hourly rate"
                  value={formState.hourlyRate || ""}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label
                  className="block text-gray-700 text-sm font-bold mb-2"
                  htmlFor="description"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Enter driver description"
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
                {isEditing ? "Update Driver" : "Add Driver"}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="relative flex-grow max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center bg-indigo-100 hover:bg-indigo-200 text-indigo-700 py-2 px-4 rounded transition-colors"
              >
                <FunnelIcon className="w-5 h-5 mr-2" /> Filters{" "}
                {showFilters ? "▲" : "▼"}
              </button>
              <div className="ml-4">
                <span className="text-sm text-gray-500">
                  {filteredDrivers.length}{" "}
                  {filteredDrivers.length === 1 ? "driver" : "drivers"}
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
                  <h3 className="font-medium mb-2">Filters:</h3>
                  <div className="flex flex-wrap gap-4">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.hasEmail}
                        onChange={() => handleFilterChange("hasEmail")}
                        className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                      />
                      <span className="ml-2">Has Email</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.hasPhone}
                        onChange={() => handleFilterChange("hasPhone")}
                        className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                      />
                      <span className="ml-2">Has Phone</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.hasDescription}
                        onChange={() => handleFilterChange("hasDescription")}
                        className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                      />
                      <span className="ml-2">Has Description</span>
                    </label>
                  </div>

                  <div className="mt-3">
                    <h4 className="font-medium mb-2">Hourly Rate Range:</h4>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.hourlyRateRange.min}
                        onChange={(e) =>
                          handleRateRangeChange("min", e.target.value)
                        }
                        className="shadow appearance-none border rounded w-24 py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min="0"
                        step="0.01"
                      />
                      <span>to</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.hourlyRateRange.max}
                        onChange={(e) =>
                          handleRateRangeChange("max", e.target.value)
                        }
                        className="shadow appearance-none border rounded w-24 py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <h3 className="font-medium mb-2 mt-4">Sort By:</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleSortOrder("name")}
                      className={`px-3 py-1 rounded-full text-sm ${
                        sortField === "name"
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Name{" "}
                      {sortField === "name" &&
                        (sortOrder === "asc" ? "↑" : "↓")}
                    </button>
                    <button
                      onClick={() => toggleSortOrder("email")}
                      className={`px-3 py-1 rounded-full text-sm ${
                        sortField === "email"
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Email{" "}
                      {sortField === "email" &&
                        (sortOrder === "asc" ? "↑" : "↓")}
                    </button>
                    <button
                      onClick={() => toggleSortOrder("phone")}
                      className={`px-3 py-1 rounded-full text-sm ${
                        sortField === "phone"
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Phone{" "}
                      {sortField === "phone" &&
                        (sortOrder === "asc" ? "↑" : "↓")}
                    </button>
                    <button
                      onClick={() => toggleSortOrder("hourlyRate")}
                      className={`px-3 py-1 rounded-full text-sm ${
                        sortField === "hourlyRate"
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Hourly Rate{" "}
                      {sortField === "hourlyRate" &&
                        (sortOrder === "asc" ? "↑" : "↓")}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Driver List */}
        <h2 className="text-2xl font-semibold mb-4">Driver List</h2>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-lg shadow-md border border-gray-200">
            <p className="text-gray-500 text-lg">
              No drivers found.{" "}
              {searchTerm && "Try a different search term or clear filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredDrivers.map((driver) => (
                <motion.div
                  key={driver.driverId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white p-6 shadow-md rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-xl font-bold mb-3 text-indigo-700">
                    {driver.name}
                  </h3>

                  {driver.description && (
                    <div className="mb-3 text-gray-600">
                      <p>{driver.description}</p>
                    </div>
                  )}

                  <div className="space-y-1 mb-4">
                    {driver.email && (
                      <p className="flex items-center text-gray-700">
                        <span className="font-medium mr-2">Email:</span>
                        <a
                          href={`mailto:${driver.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {driver.email}
                        </a>
                      </p>
                    )}

                    {driver.phone && (
                      <p className="flex items-center text-gray-700">
                        <span className="font-medium mr-2">Phone:</span>
                        <a
                          href={`tel:${driver.phone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {driver.phone}
                        </a>
                      </p>
                    )}

                    <p className="flex items-center text-gray-700">
                      <span className="font-medium mr-2">Hourly Rate:</span>
                      {typeof driver.hourlyRate === "number"
                        ? driver.hourlyRate.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "$0.00"}
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleEdit(driver)}
                      className="flex items-center bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded transition-colors"
                    >
                      <PencilIcon className="w-4 h-4 mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(driver.driverId)}
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
