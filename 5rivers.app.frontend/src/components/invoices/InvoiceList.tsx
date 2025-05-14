import { useEffect, useState } from "react";
import { invoiceApi, downloadInvoicePdf, dispatcherApi } from "@/src/lib/api";
import { Button } from "../ui/button";
import {
  Eye,
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
  Clock3,
  MinusCircle,
  Download,
} from "lucide-react";
import { ConfirmDialog } from "../common/Modal";
import { DateRangePicker } from "../common/DateRangePicker";
import type { Invoice } from "@/src/types/entities";

export function InvoiceList({
  onSelect,
  onEdit,
  onDelete,
  onCreate,
  refresh,
}: {
  onSelect: (inv: Invoice) => void;
  onEdit: (inv: Invoice) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  refresh: any;
}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dispatchers, setDispatchers] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Filter state
  const [status, setStatus] = useState("");
  const [dispatcherId, setDispatcherId] = useState("");
  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });

  useEffect(() => {
    invoiceApi.fetchAll().then(setInvoices);
    dispatcherApi.fetchAll().then(setDispatchers);
  }, [refresh]);

  // Extract unique filter options
  const statusOptions = Array.from(
    new Set(invoices.map((inv) => inv.status).filter(Boolean))
  );
  const dispatcherOptions = Array.from(
    new Map(
      dispatchers
        .filter((d: any) => d.dispatcherId && d.name)
        .map((d: any) => [d.dispatcherId, d.name])
    ).entries()
  );

  // Filtering logic
  const filteredInvoices = invoices.filter((inv) => {
    if (status && inv.status !== status) return false;
    if (dispatcherId && inv.dispatcherId !== dispatcherId) return false;
    if (dateRange.startDate && new Date(inv.invoiceDate) < dateRange.startDate)
      return false;
    if (dateRange.endDate && new Date(inv.invoiceDate) > dateRange.endDate)
      return false;
    return true;
  });

  // Download PDF handler
  const handleDownloadPdf = async (invoiceId: string) => {
    await downloadInvoicePdf(invoiceId);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-4 justify-between mb-4 items-end">
        <h2 className="text-lg font-medium">Invoices</h2>
        <div className="flex gap-2 flex-wrap">
          <select
            className="border rounded px-2 py-1"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="border rounded px-2 py-1"
            value={dispatcherId}
            onChange={(e) => setDispatcherId(e.target.value)}
          >
            <option value="">All Dispatchers</option>
            {dispatcherOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button onClick={onCreate} className="gap-1">
            <Plus className="h-4 w-4" /> Add Invoice
          </Button>
        </div>
      </div>
      <ul className="divide-y">
        {filteredInvoices.map((inv) => (
          <li
            key={inv.invoiceId}
            className="py-2 px-2 rounded flex items-center justify-between hover:bg-muted"
          >
            {/* Status indicator */}
            <span className="mr-2 flex items-center">
              {inv.status === "received" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : inv.status === "raised" ? (
                <Clock3 className="h-5 w-5 text-blue-500" />
              ) : (
                <MinusCircle className="h-5 w-5 text-gray-400" />
              )}
            </span>
            <span
              className="flex-1 cursor-pointer"
              onClick={() => onSelect(inv)}
            >
              {inv.invoiceNumber}
            </span>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onSelect(inv)}
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(inv);
                }}
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setConfirmDelete(inv.invoiceId!)}
                className="text-destructive hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDownloadPdf(inv.invoiceId!)}
                title="Download PDF"
              >
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
