"use client";

import { useState } from "react";
import { CompanyList } from "@/src/components/companies/CompanyList";
import { CompanyDetails } from "@/src/components/companies/CompanyDetails";
import { CompanyForm } from "@/src/components/companies/CompanyForm";
import { Modal, ConfirmDialog } from "@/src/components/common/Modal";
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
    } catch (error: any) {
      toast.error("Failed to delete company: " + error.message);
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
              <div className="text-2xl font-bold">12</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[80vh]">
        {/* Sidebar/List */}
        <div className="lg:w-2/5 xl:w-1/3">
          <div className="sticky top-6">
            <CompanyList
              onSelect={setSelectedCompany}
              onEdit={handleEdit}
              onCreate={handleCreate}
              refresh={refreshTrigger}
            />
          </div>
        </div>
        
        {/* Details Panel */}
        <div className="flex-1">
          {selectedCompany ? (
            <div className="animate-fade-in">
              <CompanyDetails
                company={selectedCompany}
                onDelete={() => setConfirmDelete(true)}
                onEdit={() => selectedCompany && handleEdit(selectedCompany)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No Company Selected</h3>
                <p className="text-sm max-w-sm mx-auto">
                  Select a company from the list to view its details and manage information.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

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
