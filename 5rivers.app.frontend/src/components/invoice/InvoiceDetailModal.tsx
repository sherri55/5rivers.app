"use client";
import Modal from "react-modal";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { format, parseISO } from "date-fns";

interface LineItem {
  lineAmount: number;
  job: {
    jobId: string;
    dateOfJob: string;
    unitName: string;
    driverName: string;
    title: string;
  };
}
interface InvoiceDetailModalProps {
  invoice: {
    invoiceNumber: string;
    createdAt: string;
    subTotal: number;
    dispatchPercent?: number;
    comm?: number;
    hst?: number;
    total: number;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  invoiceLines: any[];
  loadingInvoiceLines: boolean;
  errorInvoiceLines: any;
}

export function InvoiceDetailModal({
  invoice,
  isOpen,
  onClose,
  invoiceLines,
  loadingInvoiceLines,
  errorInvoiceLines,
}: InvoiceDetailModalProps) {
  if (!invoice) return null;
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={{ content: { maxWidth: "80%", margin: "auto" } }}
    >
      <div className="p-4">
        <h2 className="text-xl font-bold mb-2">{invoice.invoiceNumber}</h2>
        <p className="text-sm text-gray-600 mb-4">
          Date: {format(parseISO(invoice.createdAt), "MMM dd, yyyy")}
        </p>
        {loadingInvoiceLines ? (
          <div>Loading invoice lines...</div>
        ) : errorInvoiceLines ? (
          <div className="text-red-500">Error loading invoice lines</div>
        ) : (
          <Table headers={["Date", "Unit", "Driver", "Description", "Amount"]}>
            {invoiceLines.map((item, idx) => (
              <tr key={idx}>
                <td>
                  {item.job?.dateOfJob
                    ? format(parseISO(item.job.dateOfJob), "MMM dd, yyyy")
                    : "-"}
                </td>
                <td>{item.job?.unitName || "-"}</td>
                <td>{item.job?.driverName || "-"}</td>
                <td>{item.job?.title || "-"}</td>
                <td>${item.lineAmount?.toFixed(2) ?? "0.00"}</td>
              </tr>
            ))}
          </Table>
        )}
        <div className="mt-4 text-right">
          <p>Subtotal: ${invoice.subTotal.toFixed(2)}</p>
          {invoice.dispatchPercent !== undefined && (
            <p>
              Commission ({invoice.dispatchPercent}%): -$
              {invoice.comm?.toFixed(2)}
            </p>
          )}
          {invoice.hst !== undefined && <p>HST: +${invoice.hst.toFixed(2)}</p>}
          <p className="font-bold">Total: ${invoice.total.toFixed(2)}</p>
        </div>
        <div className="mt-4 text-right">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
