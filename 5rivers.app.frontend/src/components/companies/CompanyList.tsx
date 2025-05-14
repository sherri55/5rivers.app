"use client";

import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";
import { companyApi } from "@/src/lib/api";
import { toast } from "sonner";
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

export function CompanyList({
  onSelect,
  onEdit,
  onCreate,
  refresh,
}: CompanyListProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    companyApi.fetchAll().then((data) => {
      setCompanies(data.slice().sort((a, b) => a.name.localeCompare(b.name)));
    });
  }, [refresh]);

  const handleDelete = async (id: string) => {
    try {
      await companyApi.delete(id);
      setCompanies(companies.filter((c) => c.companyId !== id));
      toast.success("Company deleted successfully");
    } catch {
      toast.error("Failed to delete company");
    }
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-medium">Companies</h2>
        <Button onClick={onCreate} className="gap-1">
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </div>
      <ul className="divide-y">
        {companies.map((company) => (
          <li
            key={company.companyId}
            className="py-2 px-2 rounded flex items-center justify-between hover:bg-muted"
          >
            <span
              className="flex-1 cursor-pointer"
              onClick={() => onSelect(company)}
            >
              {company.name}
            </span>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onSelect(company)}
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(company);
                }}
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setConfirmDelete(company.companyId)}
                className="text-destructive hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
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
