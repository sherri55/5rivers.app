"use client";

import { useState } from "react";
import { InvoiceList } from "@/src/components/invoices/InvoiceList";
import { InvoiceDetails } from "@/src/components/invoices/InvoiceDetails";
import { InvoiceForm } from "@/src/components/invoices/InvoiceForm";
import { Modal, ConfirmDialog } from "@/src/components/common/Modal";
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
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Invoices</h1>
        <p className="text-muted-foreground">
          Manage invoices and their information.
        </p>
      </div>
      <div className="flex flex-col min-h-[80vh] w-full max-w-screen-2xl mx-auto px-4 md:flex-row md:gap-8">
        {/* Sidebar/List */}
        <div className="lg:w-full md:w-2/5 md:pr-6">
          <InvoiceList
            onSelect={setSelectedInvoice}
            onEdit={handleEdit}
            onCreate={handleCreate}
            refresh={refreshTrigger}
          />
        </div>
        {/* Details Panel */}
        <div className="flex-1">
          {selectedInvoice && (
            <InvoiceDetails
              invoice={selectedInvoice}
              onDelete={() => setConfirmDelete(true)}
              onEdit={() => selectedInvoice && handleEdit(selectedInvoice)}
            />
          )}
        </div>
      </div>
      <Modal
        title={editingInvoice ? "Edit Invoice" : "Create Invoice"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      >
        <InvoiceForm
          invoice={editingInvoice || undefined}
          onSuccess={() => {
            setIsFormOpen(false);
            refresh();
            if (editingInvoice) {
              setSelectedInvoice(null);
            }
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
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
