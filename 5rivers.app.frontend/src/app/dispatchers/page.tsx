// pages/dispatchers.tsx
"use client";
import { useState, useEffect, FormEvent } from "react";
import Head from "next/head";
import { useQuery, useMutation, gql } from "@apollo/client";
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
import {
  CREATE_DISPATCHER,
  DELETE_DISPATCHER,
  fetchGraphQL,
  GET_DISPATCHERS,
  mutateGraphQL,
  UPDATE_DISPATCHER,
} from "@/lib/graphql-client";
import { error } from "console";
import { data } from "framer-motion/client";

export interface Dispatcher {
  dispatcherId: string;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  commission: number;
  isActive: boolean;
}

type SortField = "name" | "email" | "phone" | "commission";
type SortOrder = "asc" | "desc";

export default function DispatchersPage() {
  const [loading, setLoading] = useState(true);
  // Replace useQuery with fetchGraphQL in useEffect
  useEffect(() => {
    const loadDispatchers = async () => {
      setLoading(true);
      const data = await fetchGraphQL(GET_DISPATCHERS);
      if (data?.dispatchers) {
        setDispatchers(data.dispatchers);
        setFiltered(data.dispatchers);
      }
      setLoading(false);
    };
    loadDispatchers();
  }, []);

  // Replace createDispatcher mutation
  const createDispatcher = async () => {
    await mutateGraphQL(CREATE_DISPATCHER, { input: form });
    // Reload data after mutation
    const data = await fetchGraphQL(GET_DISPATCHERS);
    if (data?.dispatchers) {
      setDispatchers(data.dispatchers);
      setFiltered(data.dispatchers);
    }
  };

  // Replace updateDispatcher mutation
  const updateDispatcher = async () => {
    if (!form.dispatcherId) return;
    await mutateGraphQL(UPDATE_DISPATCHER, {
      input: { ...form, dispatcherId: form.dispatcherId },
    });
    const data = await fetchGraphQL(GET_DISPATCHERS);
    if (data?.dispatchers) {
      setDispatchers(data.dispatchers);
      setFiltered(data.dispatchers);
    }
  };

  // Replace deleteDispatcher mutation
  const deleteDispatcher = async (id: string) => {
    await mutateGraphQL(DELETE_DISPATCHER, { dispatcherId: id });
    const data = await fetchGraphQL(GET_DISPATCHERS);
    if (data?.dispatchers) {
      setDispatchers(data.dispatchers);
      setFiltered(data.dispatchers);
    }
  };

  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [filtered, setFiltered] = useState<Dispatcher[]>([]);
  const [form, setForm] = useState<Partial<Dispatcher>>({});
  const [editing, setEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    hasEmail: false,
    hasPhone: false,
    hasDescription: false,
    minCommission: "",
    maxCommission: "",
  });

  useEffect(() => {
    let result = [...dispatchers];
    if (filters.hasEmail) result = result.filter((d) => !!d.email);
    if (filters.hasPhone) result = result.filter((d) => !!d.phone);
    if (filters.hasDescription) result = result.filter((d) => !!d.description);
    if (filters.minCommission) {
      const min = parseFloat(filters.minCommission);
      if (!isNaN(min)) result = result.filter((d) => d.commission >= min);
    }
    if (filters.maxCommission) {
      const max = parseFloat(filters.maxCommission);
      if (!isNaN(max)) result = result.filter((d) => d.commission <= max);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(term) ||
          d.email?.toLowerCase().includes(term) ||
          d.phone?.toLowerCase().includes(term) ||
          d.description?.toLowerCase().includes(term) ||
          d.commission.toString().includes(term)
      );
    }
    result.sort((a, b) => {
      if (sortField === "commission") {
        return sortOrder === "asc"
          ? a.commission - b.commission
          : b.commission - a.commission;
      }
      const aVal = (a[sortField] as string).toLowerCase();
      const bVal = (b[sortField] as string).toLowerCase();
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
    setFiltered(result);
  }, [dispatchers, filters, searchTerm, sortField, sortOrder]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const input = {
      ...form,
      commission: parseFloat(form.commission?.toString() || "0"),
    };
    try {
      if (editing && form.dispatcherId) {
        await updateDispatcher();
        toast.success("Dispatcher updated");
      } else {
        await createDispatcher();
        toast.success("Dispatcher added");
      }
      setForm({});
      setEditing(false);
    } catch {
      toast.error("Save failed");
    }
  };

  const handleEdit = (d: Dispatcher) => {
    setForm(d);
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this dispatcher?")) return;
    try {
      await deleteDispatcher(id);
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const toggleSort = (field: SortField) => {
    if (field === sortField)
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const toggleFilter = (key: keyof typeof filters) => {
    setFilters((prev) => ({ ...prev, [key]: prev[key] }));
  };

  const handleCommissionRange = (
    type: "minCommission" | "maxCommission",
    value: string
  ) => {
    setFilters((prev) => ({ ...prev, [type]: value }));
  };

  if (loading) return <div className="py-12 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Head>
        <title>Dispatchers</title>
      </Head>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-8 text-center text-indigo-600">
          Dispatchers Management
        </h1>
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white shadow rounded p-6 mb-8 border border-gray-200"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <PlusIcon className="w-5 h-5 mr-2" />
            {editing ? "Update Dispatcher" : "Add New Dispatcher"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                value={form.name || ""}
                onChange={handleChange}
                required
                className="w-full border rounded p-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={form.email || ""}
                onChange={handleChange}
                className="w-full border rounded p-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1" htmlFor="phone">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                value={form.phone || ""}
                onChange={handleChange}
                className="w-full border rounded p-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label
                className="block text-sm font-bold mb-1"
                htmlFor="commission"
              >
                Commission
              </label>
              <input
                id="commission"
                type="number"
                name="commission"
                value={form.commission ?? ""}
                onChange={handleChange}
                className="w-full border rounded p-2 focus:ring-indigo-500"
                step="0.01"
                min="0"
              />
            </div>
            <div className="md:col-span-2">
              <label
                className="block text-sm font-bold mb-1"
                htmlFor="description"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={form.description || ""}
                onChange={handleChange}
                className="w-full border rounded p-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setForm({});
                  setEditing(false);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className={`${
                editing ? "bg-blue-500" : "bg-green-500"
              } px-4 py-2 text-white rounded hover:opacity-90`}
            >
              {editing ? "Update" : "Add"}
            </button>
          </div>
        </motion.form>

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded shadow mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="relative flex-grow md:max-w-md">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute top-2 left-3" />
              <input
                type="text"
                placeholder="Search dispatchers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border rounded p-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setShowFilters((f) => !f)}
                className="flex items-center bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-2 rounded"
              >
                <FunnelIcon className="w-5 h-5 mr-2" /> Filters{" "}
                {showFilters ? "▲" : "▼"}
              </button>
              <span className="ml-4 text-sm text-gray-600">
                {filtered.length} dispatchers
              </span>
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
                  <div className="flex flex-wrap gap-4 mb-4">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.hasEmail}
                        onChange={() =>
                          setFilters((prev) => ({
                            ...prev,
                            hasEmail: !prev.hasEmail,
                          }))
                        }
                        className="form-checkbox h-4 w-4 text-indigo-600"
                      />
                      <span className="ml-2">Has Email</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.hasPhone}
                        onChange={() =>
                          setFilters((prev) => ({
                            ...prev,
                            hasPhone: !prev.hasPhone,
                          }))
                        }
                        className="form-checkbox h-4 w-4 text-indigo-600"
                      />
                      <span className="ml-2">Has Phone</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.hasDescription}
                        onChange={() =>
                          setFilters((prev) => ({
                            ...prev,
                            hasDescription: !prev.hasDescription,
                          }))
                        }
                        className="form-checkbox h-4 w-4 text-indigo-600"
                      />
                      <span className="ml-2">Has Description</span>
                    </label>
                  </div>
                  <h4 className="font-medium mb-2">Commission Range:</h4>
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minCommission}
                      onChange={(e) =>
                        handleCommissionRange("minCommission", e.target.value)
                      }
                      className="w-24 border rounded p-1 focus:ring-indigo-500"
                      min="0"
                      step="0.01"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxCommission}
                      onChange={(e) =>
                        handleCommissionRange("maxCommission", e.target.value)
                      }
                      className="w-24 border rounded p-1 focus:ring-indigo-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <h3 className="font-medium mb-2">Sort By:</h3>
                  <div className="flex flex-wrap gap-2">
                    {(
                      ["name", "email", "phone", "commission"] as SortField[]
                    ).map((field) => (
                      <button
                        key={field}
                        onClick={() => toggleSort(field)}
                        className={`px-3 py-1 rounded-full text-sm ${
                          sortField === field
                            ? "bg-indigo-500 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {field.charAt(0).toUpperCase() + field.slice(1)}{" "}
                        {sortField === field
                          ? sortOrder === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dispatcher List */}
        {filtered.length === 0 ? (
          <div className="bg-white p-6 text-center rounded shadow border border-gray-200">
            <p className="text-gray-500">No dispatchers found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filtered.map((dispatcher) => (
                <motion.div
                  key={dispatcher.dispatcherId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white p-6 rounded shadow hover:shadow-lg border border-gray-200"
                >
                  <h3 className="text-xl font-bold mb-2 text-indigo-700">
                    {dispatcher.name}
                  </h3>
                  {dispatcher.description && (
                    <p className="text-gray-600 mb-2">
                      {dispatcher.description}
                    </p>
                  )}
                  <div className="text-gray-700 mb-4 space-y-1">
                    {dispatcher.email && (
                      <p>
                        <strong>Email:</strong>{" "}
                        <a
                          href={`mailto:${dispatcher.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {dispatcher.email}
                        </a>
                      </p>
                    )}
                    {dispatcher.phone && (
                      <p>
                        <strong>Phone:</strong>{" "}
                        <a
                          href={`tel:${dispatcher.phone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {dispatcher.phone}
                        </a>
                      </p>
                    )}
                    <p>
                      <strong>Commission:</strong>{" "}
                      {dispatcher.commission.toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                      %
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(dispatcher)}
                      className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      <PencilIcon className="w-4 h-4 mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(dispatcher.dispatcherId)}
                      className="flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
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
