"use client";

import { useState } from "react";
import { InvoiceList } from "../../components/invoices/InvoiceList";
import { InvoiceDetails } from "../../components/invoices/InvoiceDetails";
import { InvoiceForm } from "../../components/invoices/InvoiceForm";
import { Modal, ConfirmDialog } from "../../components/common/Modal";
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

  const handleDelete = async () => {
    if (!selectedInvoice) return;
    try {
      await invoiceApi.delete(selectedInvoice.invoiceId);
      toast.success("Invoice deleted successfully");
      setSelectedInvoice(null);
      refresh();
    } catch (error) {
      toast.error("Failed to delete invoice" + error.message);
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-1">
          <InvoiceList
            onSelect={setSelectedInvoice}
            onEdit={handleEdit}
            onCreate={handleCreate}
            refresh={refreshTrigger}
          />
        </div>
        <div className="md:col-span-1">
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
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
