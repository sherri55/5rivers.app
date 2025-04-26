// pages/companies.tsx
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
  CREATE_COMPANY,
  DELETE_COMPANY,
  fetchGraphQL,
  GET_COMPANIES,
  mutateGraphQL,
  UPDATE_COMPANY,
} from "@/lib/graphql-client";

interface Company {
  companyId: string;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
}

type SortField = "name" | "email" | "phone";
type SortOrder = "asc" | "desc";

export default function CompaniesPage() {
  const [loading, setLoading] = useState(true);

  const loadCompanies = async () => {
    setLoading(true);
    const data = await fetchGraphQL(GET_COMPANIES);
    if (data?.companies) {
      setCompanies(data.companies);
      setFiltered(data.companies);
    }
    setLoading(false);
  };

  // Replace createCompany mutation call
  const createCompany = async () => {
    await mutateGraphQL(CREATE_COMPANY, { input: form });
    await loadCompanies();
  };

  // Replace updateCompany mutation call
  const updateCompany = async () => {
    if (!form.companyId) return;
    await mutateGraphQL(UPDATE_COMPANY, {
      input: { ...form, companyId: form.companyId },
    });
    await loadCompanies();
  };

  // Replace deleteCompany mutation call
  const deleteCompany = async (companyId: string) => {
    await mutateGraphQL(DELETE_COMPANY, { companyId });
    await loadCompanies();
  };

  // Call loadCompanies() in useEffect to initialize data
  useEffect(() => {
    loadCompanies();
  }, []);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [filtered, setFiltered] = useState<Company[]>([]);
  const [form, setForm] = useState<Partial<Company>>({});
  const [editing, setEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    hasEmail: false,
    hasPhone: false,
    hasDescription: false,
  });

  // Filter, search, sort
  useEffect(() => {
    let result = [...companies];
    if (filters.hasEmail) result = result.filter((c) => !!c.email);
    if (filters.hasPhone) result = result.filter((c) => !!c.phone);
    if (filters.hasDescription) result = result.filter((c) => !!c.description);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.phone?.toLowerCase().includes(term) ||
          c.description?.toLowerCase().includes(term)
      );
    }
    result.sort((a, b) => {
      const aVal = (a[sortField] || "").toLowerCase();
      const bVal = (b[sortField] || "").toLowerCase();
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
    setFiltered(result);
  }, [companies, filters, searchTerm, sortField, sortOrder]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editing && form.companyId) {
        await updateCompany();
        toast.success("Company updated");
      } else {
        await createCompany();
        toast.success("Company added");
      }
      setForm({});
      setEditing(false);
    } catch {
      toast.error("Save failed");
    }
  };

  const handleEdit = (c: Company) => {
    setForm(c);
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this company?")) return;
    try {
      await deleteCompany(id);
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

  const toggleFilter = (name: keyof typeof filters) =>
    setFilters((prev) => ({ ...prev, [name]: !prev[name] }));

  if (loading) return <div className="py-12 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Head>
        <title>Companies</title>
      </Head>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-8 text-center text-indigo-600">
          Companies
        </h1>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white shadow rounded p-6 mb-8 border border-gray-200"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <PlusIcon className="w-5 h-5 mr-2" />{" "}
            {editing ? "Update Company" : "Add Company"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-bold mb-1">
                Name
              </label>
              <input
                name="name"
                value={form.name || ""}
                onChange={handleChange}
                required
                className="w-full border rounded p-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-bold mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email || ""}
                onChange={handleChange}
                className="w-full border rounded p-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-bold mb-1">
                Phone
              </label>
              <input
                name="phone"
                value={form.phone || ""}
                onChange={handleChange}
                className="w-full border rounded p-2 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label
                htmlFor="description"
                className="block text-sm font-bold mb-1"
              >
                Description
              </label>
              <textarea
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
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute top-1/2 left-3 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search companies..."
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
                {filtered.length} companies
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
                    {(["hasEmail", "hasPhone", "hasDescription"] as const).map(
                      (key) => (
                        <label key={key} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={filters[key]}
                            onChange={() => toggleFilter(key)}
                            className="form-checkbox h-4 w-4 text-indigo-600"
                          />
                          <span className="ml-2 capitalize">
                            {key.replace("has", "")}
                          </span>
                        </label>
                      )
                    )}
                  </div>
                  <h3 className="font-medium mb-2">Sort By:</h3>
                  <div className="flex flex-wrap gap-2">
                    {(["name", "email", "phone"] as SortField[]).map(
                      (field) => (
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
                            : null}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Company List */}
        {filtered.length === 0 ? (
          <div className="bg-white p-6 text-center rounded shadow border border-gray-200">
            <p className="text-gray-500">No companies found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filtered.map((company) => (
                <motion.div
                  key={company.companyId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white p-6 rounded shadow hover:shadow-lg border border-gray-200"
                >
                  <h3 className="text-xl font-bold mb-2 text-indigo-700">
                    {company.name}
                  </h3>
                  {company.description && (
                    <p className="text-gray-600 mb-2">{company.description}</p>
                  )}
                  <div className="text-gray-700 mb-4 space-y-1">
                    {company.email && (
                      <p>
                        <strong>Email:</strong>{" "}
                        <a
                          href={`mailto:${company.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {company.email}
                        </a>
                      </p>
                    )}
                    {company.phone && (
                      <p>
                        <strong>Phone:</strong>{" "}
                        <a
                          href={`tel:${company.phone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {company.phone}
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(company)}
                      className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      <PencilIcon className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(company.companyId)}
                      className="flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
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
