"use client";

import { useState } from "react";
import { InvoiceList } from "@/src/components/invoices/InvoiceList";
import { InvoiceDetails } from "@/src/components/invoices/InvoiceDetails";
import { InvoiceForm } from "@/src/components/invoices/InvoiceForm";
import { Modal, ConfirmDialog } from "@/src/components/common/Modal";
import { SlideOver } from "@/src/components/common/SlideOver";
import { invoiceApi } from "@/src/lib/api";
import { toast } from "sonner";

interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dispatcherId?: string;
  billedTo?: string;
  billedEmail?: string;
  status?: string;
  subTotal?: number;
  commission?: number;
  hst?: number;
  total?: number;
}

export default function InvoicesPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  const handleCreate = () => {
    setEditingInvoice(null);
    setIsFormOpen(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsFormOpen(true);
  };

  const handleDelete = async (invoiceId: string) => {
    try {
      await invoiceApi.delete(invoiceId);
      toast.success("Invoice deleted successfully");
      setSelectedInvoice(null);
      refresh();
    } catch (error: any) {
      toast.error("Failed to delete invoice: " + (error?.message || error));
    }
    setConfirmDelete(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Invoices</h1>
            <p className="text-emerald-100 text-lg">
              Manage invoices and billing information
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-medium">Total Invoices</span>
              <div className="text-2xl font-bold">42</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[80vh]">
        {/* Sidebar/List */}
        <div className="lg:w-2/5 xl:w-1/3">
          <div className="sticky top-6">
            <InvoiceList
              onSelect={(inv: any) => setSelectedInvoice(inv)}
              onEdit={(inv: any) => handleEdit(inv)}
              onDelete={(id) => handleDelete(id)}
              onCreate={handleCreate}
              refresh={refreshTrigger}
            />
          </div>
        </div>
        
        {/* Details Panel */}
        <div className="flex-1">
          {selectedInvoice ? (
            <div className="animate-fade-in">
              <InvoiceDetails
                invoice={selectedInvoice}
                onDelete={() => setConfirmDelete(true)}
                onEdit={() => selectedInvoice && handleEdit(selectedInvoice)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No Invoice Selected</h3>
                <p className="text-sm max-w-sm mx-auto">
                  Select an invoice from the list to view its details and manage billing information.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Create/Edit SlideOver */}
      <SlideOver
        title={editingInvoice ? "Edit Invoice" : "Create New Invoice"}
        subtitle={editingInvoice ? "Update invoice information" : "Generate a new invoice"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="lg"
      >
        <InvoiceForm
          invoice={editingInvoice as any || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
            if (editingInvoice) {
              setSelectedInvoice(null);
            }
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </SlideOver>
      <ConfirmDialog
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        isOpen={confirmDelete}
        onConfirm={() =>
          selectedInvoice && handleDelete(selectedInvoice.invoiceId)
        }
        onCancel={() => setConfirmDelete(false)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
