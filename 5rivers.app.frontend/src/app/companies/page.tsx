"use client";

import { useState } from "react";
import { CompanyList } from "../../components/companies/CompanyList";
import { CompanyDetails } from "../../components/companies/CompanyDetails";
import { CompanyForm } from "../../components/companies/CompanyForm";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/Modal";
import { companyApi } from "@/src/lib/api";
import { toast } from "sonner";

interface Company {
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  jobTypesCount?: number;
}

export default function CompaniesPage() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Refresh the list when data changes
  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  const handleCreate = () => {
    setEditingCompany(null);
    setIsFormOpen(true);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedCompany) return;

    try {
      await companyApi.delete(selectedCompany.companyId);
      toast.success("Company deleted successfully");
      setSelectedCompany(null);
      refresh();
    } catch (error) {
      toast.error("Failed to delete company" + error.message);
    }
    setConfirmDelete(false);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Companies</h1>
        <p className="text-muted-foreground">
          Manage your client companies and their information.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-1">
          <CompanyList
            onSelect={setSelectedCompany}
            onEdit={handleEdit}
            onCreate={handleCreate}
            refresh={refreshTrigger}
          />
        </div>

        <div className="md:col-span-1">
          {selectedCompany && (
            <CompanyDetails
              company={selectedCompany}
              onDelete={() => setConfirmDelete(true)}
              onEdit={() => selectedCompany && handleEdit(selectedCompany)}
            />
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        title={editingCompany ? "Edit Company" : "Create Company"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      >
        <CompanyForm
          company={editingCompany || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
            if (editingCompany) {
              setSelectedCompany(null);
            }
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        title="Delete Company"
        message="Are you sure you want to delete this company? This action cannot be undone."
        isOpen={confirmDelete}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
