import { useEffect, useState } from "react";
import { invoiceApi, downloadInvoicePdf } from "@/src/lib/api";
import { Button } from "../ui/button";
import { Eye, Pencil, Trash2, Plus, CheckCircle2, Clock3, MinusCircle, Download } from "lucide-react";
import { ConfirmDialog } from "../common/Modal";

export function InvoiceList({ onSelect, onEdit, onDelete, onCreate, refresh }: any) {
  const [invoices, setInvoices] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    invoiceApi.fetchAll().then(setInvoices);
  }, [refresh]);

  // Download PDF handler
  const handleDownloadPdf = async (invoiceId: string) => {
    await downloadInvoicePdf(invoiceId);
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-medium">Invoices</h2>
        <Button onClick={onCreate} className="gap-1">
          <Plus className="h-4 w-4" /> Add Invoice
        </Button>
      </div>
      <ul className="divide-y">
        {invoices.map((inv: any) => (
          <li
            key={inv.invoiceId}
            className="py-2 px-2 rounded flex items-center justify-between hover:bg-muted"
          >
            {/* Status indicator */}
            <span className="mr-2 flex items-center">
              {inv.status === "Paid" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" title="Paid" />
              ) : inv.status === "Pending" ? (
                <Clock3 className="h-5 w-5 text-yellow-500" title="Pending" />
              ) : (
                <MinusCircle className="h-5 w-5 text-gray-400" title={inv.status || "Unknown"} />
              )}
            </span>
            <span className="flex-1 cursor-pointer" onClick={() => onSelect(inv)}>
              {inv.invoiceNumber}
            </span>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" onClick={() => onSelect(inv)} title="View Details">
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); onEdit(inv); }} title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(inv.invoiceId)} className="text-destructive hover:text-destructive" title="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDownloadPdf(inv.invoiceId)} title="Download PDF">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        isOpen={!!confirmDelete}
        onConfirm={() => {
          if (confirmDelete) onDelete(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
