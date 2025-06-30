"use client";

import { useState, useEffect } from "react";
import { InvoiceList } from "@/src/components/invoices/InvoiceList";
import { InvoiceForm } from "@/src/components/invoices/InvoiceForm";
import { ConfirmDialog } from "@/src/components/common/Modal";
import { SlideOver } from "@/src/components/common/SlideOver";
import { invoiceApi } from "@/src/lib/api";
import { toast } from "sonner";
import { Invoice } from "@/src/types/entities";

export default function InvoicesPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState<number>(0);

  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  // Fetch invoice count
  useEffect(() => {
    const fetchInvoiceCount = async () => {
      try {
        const response = await invoiceApi.fetchAll({ pageSize: 1 });
        setInvoiceCount(response.total || 0);
      } catch (error) {
        console.error("Failed to fetch invoice count:", error);
      }
    };
    fetchInvoiceCount();
  }, [refreshTrigger]);

  const handleCreate = () => {
    setEditingInvoice(null);
    setIsFormOpen(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsFormOpen(true);
  };

  const handleDelete = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setConfirmDelete(true);
  };

  const confirmDeleteAction = async () => {
    if (!selectedInvoice) return;

    try {
      await invoiceApi.delete(selectedInvoice.invoiceId);
      toast.success("Invoice deleted successfully");
      setSelectedInvoice(null);
      refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to delete invoice: " + message);
    }
    setConfirmDelete(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Invoices</h1>
            <p className="text-green-100 text-lg">
              Manage billing, track payments, and generate invoices
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-medium">Total Invoices</span>
              <div className="text-2xl font-bold">{invoiceCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <div className="w-full">
        <InvoiceList
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreate={handleCreate}
          refresh={refreshTrigger}
        />
      </div>

      {/* Create/Edit SlideOver */}
      <SlideOver
        title={editingInvoice ? "Edit Invoice" : "Create New Invoice"}
        subtitle={
          editingInvoice
            ? "Update invoice information and details"
            : "Create a new invoice and set billing details"
        }
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="lg"
      >
        <InvoiceForm
          invoice={editingInvoice || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </SlideOver>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        isOpen={confirmDelete}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
