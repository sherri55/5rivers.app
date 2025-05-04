"use client";

import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";
import { companyApi } from "@/lib/api";
import { toast } from "sonner";
import { DataTable, Column } from "../../components/common/DataTable";
import { ConfirmDialog } from "../../components/common/Modal";

interface Company {
  companyId: string;
  name: string;
  email: string;
  phone: string;
  jobTypesCount: number;
}

interface CompanyListProps {
  onSelect: (company: Company) => void;
  onEdit: (company: Company) => void;
  onCreate: () => void;
  refresh: number;
}

export function CompanyList({ onSelect, onEdit, onCreate, refresh }: CompanyListProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    companyApi.fetchAll()
      .then((data) => {
        setCompanies(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load companies");
        setLoading(false);
      });
  }, [refresh]);

  const handleDelete = async (id: string) => {
    try {
      await companyApi.delete(id);
      setCompanies(companies.filter(c => c.companyId !== id));
      toast.success("Company deleted successfully");
    } catch {
      setError("Failed to delete company");
      toast.error("Failed to delete company");
    }
  };

  const columns: Column<Company>[] = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Email",
      accessorKey: "email",
    },
    {
      header: "Phone",
      accessorKey: "phone",
      cell: (row) => row.phone || "—"
    },
    {
      header: "Job Types",
      accessorKey: "jobTypesCount",
      cell: (row) => row.jobTypesCount || 0
    },
    {
      header: "Actions",
      accessorKey: (row) => row,
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onSelect(row)}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit(row)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setConfirmDelete(row.companyId)}
            className="text-destructive hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-medium">All Companies</h2>
        <Button onClick={onCreate} className="gap-1">
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </div>
      
      <DataTable
        data={companies}
        columns={columns}
        loading={loading}
        error={error}
        searchField="name"
        searchPlaceholder="Search by company name..."
        emptyTitle="No Companies"
        emptyDescription="There are no companies to display. Add a new company to get started."
      />

      <ConfirmDialog
        title="Delete Company"
        message="Are you sure you want to delete this company? This action cannot be undone."
        isOpen={!!confirmDelete}
        onConfirm={() => {
          if (confirmDelete) handleDelete(confirmDelete);
        }}
        onCancel={() => setConfirmDelete(null)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}