"use client";

import { useState, useEffect } from "react";
import { CompanyList } from "@/src/components/companies/CompanyList";
import { CompanyForm } from "@/src/components/companies/CompanyForm";
import { CompanyView } from "@/src/components/companies/CompanyView";
import { ConfirmDialog } from "@/src/components/common/Modal";
import { SlideOver } from "@/src/components/common/SlideOver";
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
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [companyCount, setCompanyCount] = useState<number>(0);

  // Refresh the list when data changes
  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  // Fetch company count
  useEffect(() => {
    const fetchCompanyCount = async () => {
      try {
        const response = await companyApi.fetchAll({ pageSize: 1 });
        setCompanyCount(response.total || 0);
      } catch (error) {
        console.error("Failed to fetch company count:", error);
      }
    };
    fetchCompanyCount();
  }, [refreshTrigger]);

  const handleCreate = () => {
    setEditingCompany(null);
    setIsFormOpen(true);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setIsViewOpen(false);
    setIsFormOpen(true);
  };

  const handleView = (company: Company) => {
    setSelectedCompany(company);
    setIsViewOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedCompany) return;

    try {
      await companyApi.delete(selectedCompany.companyId);
      toast.success("Company deleted successfully");
      setSelectedCompany(null);
      setIsViewOpen(false);
      refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to delete company: " + message);
    }
    setConfirmDelete(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Companies</h1>
            <p className="text-blue-100 text-lg">
              Manage your client companies and their information
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-medium">Total Companies</span>
              <div className="text-2xl font-bold">{companyCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <div className="w-full">
        <CompanyList
          onView={handleView}
          onEdit={handleEdit}
          onCreate={handleCreate}
          refresh={refreshTrigger}
        />
      </div>

      {/* View SlideOver */}
      <SlideOver
        title="Company Details"
        subtitle="View company information"
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        size="lg"
      >
        {selectedCompany && (
          <CompanyView
            company={selectedCompany}
            onEdit={() => handleEdit(selectedCompany)}
            onDelete={() => setConfirmDelete(true)}
            onClose={() => setIsViewOpen(false)}
          />
        )}
      </SlideOver>

      {/* Create/Edit SlideOver */}
      <SlideOver
        title={editingCompany ? "Edit Company" : "Create New Company"}
        subtitle={editingCompany ? "Update company information" : "Add a new company to your system"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="lg"
      >
        <CompanyForm
          company={editingCompany || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
            if (editingCompany) {
              setSelectedCompany(null);
              setIsViewOpen(false);
            }
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </SlideOver>

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
