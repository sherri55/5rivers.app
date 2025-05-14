import { useState, useEffect } from "react";
import { invoiceApi, dispatcherApi, jobApi } from "@/src/lib/api";
import { Button } from "../ui/button";
import { FormField } from "../common/FormField";
import { toast } from "sonner";
import Select from "react-select";
import type { Invoice } from "@/src/types/entities";

interface Dispatcher {
  dispatcherId: string;
  name: string;
  email: string;
  commissionPercent?: number;
  billedTo?: string;
  billedEmail?: string;
}

interface JobType {
  jobTypeId: string;
  title: string;
  startLocation?: string;
  endLocation?: string;
}

interface Job {
  jobId: string;
  jobDate: string;
  jobGrossAmount: number;
  dispatcherId: string;
  invoiceId?: string | null;
  jobType?: JobType;
}

interface InvoiceFormProps {
  invoice?: Invoice;
  onSuccess: () => void;
  onCancel: () => void;
}

function generateInvoiceNumber(date: Date, sequence: number = 1) {
  // Format: INV-YYYYMMDD-XXXX
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const seq = String(sequence).padStart(4, "0");
  return `INV-${y}${m}${d}-${seq}`;
}

export function InvoiceForm({
  invoice,
  onSuccess,
  onCancel,
}: InvoiceFormProps) {
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dispatcherId, setDispatcherId] = useState("");
  const [billedTo, setBilledTo] = useState("");
  const [billedEmail, setBilledEmail] = useState("");
  const [commission, setCommission] = useState("");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("pending");

  // Helper for react-select options
  const jobOptions = jobs.map((j) => ({
    value: j.jobId,
    label: `${j.jobDate ? j.jobDate.slice(0, 10) : ""} | ${
      j.jobType?.startLocation || "?"
    } → ${j.jobType?.endLocation || "?"} | $${j.jobGrossAmount?.toFixed(2)}`,
  }));

  // Fetch dispatchers on mount
  useEffect(() => {
    dispatcherApi
      .fetchAll()
      .then(setDispatchers)
      .catch(() => toast.error("Failed to load dispatchers"));
  }, []);

  // Set defaults for new invoice or editing (except jobs)
  useEffect(() => {
    if (!invoice) {
      const today = new Date();
      setInvoiceDate(today.toISOString().slice(0, 10));
      setInvoiceNumber(generateInvoiceNumber(today));
      setStatus("pending");
    } else {
      setInvoiceNumber(invoice.invoiceNumber || "");
      setInvoiceDate(
        invoice.invoiceDate ? invoice.invoiceDate.slice(0, 10) : ""
      );
      setDispatcherId(invoice.dispatcherId || "");
      setBilledTo(invoice.billedTo || "");
      setBilledEmail(invoice.billedEmail || "");
      setCommission(invoice.commission ? String(invoice.commission) : "");
      setStatus(invoice.status ? invoice.status.toLowerCase() : "pending");
    }
  }, [invoice]);

  // Sync selectedJobIds with invoice.jobs after jobs are loaded
  useEffect(() => {
    if (invoice && invoice.jobs && jobs.length > 0) {
      // Only select jobs that are present in the loaded jobs list
      const validJobIds = invoice.jobs
        .map((j: any) => j.jobId)
        .filter((id: string) => jobs.some((job) => job.jobId === id));
      setSelectedJobIds(validJobIds);
    } else if (!invoice) {
      setSelectedJobIds([]);
    }
  }, [jobs, invoice]);

  // Fetch jobs for selected dispatcher
  useEffect(() => {
    if (dispatcherId) {
      jobApi.fetchAll().then((allJobs: any[]) => {
        let filtered;
        if (invoice && invoice.invoiceId) {
          // Include jobs for this dispatcher that are either not invoiced or belong to this invoice
          filtered = allJobs.filter(
            (j) =>
              j.dispatcherId === dispatcherId &&
              (!j.invoiceId || j.invoiceId === invoice.invoiceId)
          );
        } else {
          // Only jobs for this dispatcher and not already invoiced
          filtered = allJobs.filter(
            (j) => j.dispatcherId === dispatcherId && !j.invoiceId
          );
        }
        setJobs(filtered);
      });
      // Fetch dispatcher details
      dispatcherApi.getById(dispatcherId).then((d: Dispatcher) => {
        setBilledTo(d.name || "");
        setBilledEmail(d.email || "");
        setCommission(d.commissionPercent ? String(d.commissionPercent) : "");
      });
    } else {
      setJobs([]);
      setBilledTo("");
      setBilledEmail("");
      setCommission("");
      setSelectedJobIds([]);
    }
  }, [dispatcherId, invoice]);

  // Calculate subtotal and total when jobs or commission change
  useEffect(() => {
    const selectedJobs = jobs.filter((j) => selectedJobIds.includes(j.jobId));
    const sub = selectedJobs.reduce(
      (sum, j) => sum + (j.jobGrossAmount || 0),
      0
    );
    setSubTotal(sub);
    const comm = commission ? sub * (parseFloat(commission) / 100) : 0;
    const hst = (sub + comm) * 0.13;
    setTotal(sub + comm + hst);
  }, [selectedJobIds, jobs, commission]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!invoiceNumber.trim())
      newErrors.invoiceNumber = "Invoice number is required";
    if (!invoiceDate) newErrors.invoiceDate = "Date is required";
    if (!dispatcherId) newErrors.dispatcherId = "Dispatcher is required";
    if (!billedTo.trim()) newErrors.billedTo = "Billed To is required";
    if (!billedEmail.trim()) newErrors.billedEmail = "Billed Email is required";
    if (!selectedJobIds.length)
      newErrors.jobs = "At least one job must be selected";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const form = {
        invoiceNumber,
        invoiceDate,
        dispatcherId,
        billedTo,
        billedEmail,
        commission: commission ? parseFloat(commission) : undefined,
        jobIds: selectedJobIds,
        status,
      };
      if (invoice && invoice.invoiceId) {
        await invoiceApi.update(invoice.invoiceId, form);
        toast.success("Invoice updated successfully");
      } else {
        await invoiceApi.create(form);
        toast.success("Invoice created successfully");
      }
      onSuccess();
    } catch {
      toast.error("Failed to save invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        id="invoiceNumber"
        label="Invoice Number"
        value={invoiceNumber}
        onChange={setInvoiceNumber}
        placeholder="Auto-generated if left blank"
        required
        error={errors.invoiceNumber}
        disabled
      />
      <FormField
        id="invoiceDate"
        label="Date"
        type="date"
        value={invoiceDate}
        onChange={setInvoiceDate}
        required
        error={errors.invoiceDate}
      />
      <div>
        <label className="block text-sm font-medium mb-1">Dispatcher</label>
        <select
          id="dispatcherId"
          value={dispatcherId}
          onChange={(e) => setDispatcherId(e.target.value)}
          className="w-full border rounded px-2 py-1"
          required
        >
          <option value="">Select dispatcher</option>
          {dispatchers.map((d) => (
            <option key={d.dispatcherId} value={d.dispatcherId}>
              {d.name}
            </option>
          ))}
        </select>
        {errors.dispatcherId && (
          <div className="text-red-500 text-xs">{errors.dispatcherId}</div>
        )}
      </div>
      <FormField
        id="billedTo"
        label="Billed To"
        value={billedTo}
        onChange={setBilledTo}
        placeholder="Auto-filled from dispatcher"
        required
        error={errors.billedTo}
        disabled
      />
      <FormField
        id="billedEmail"
        label="Billed Email"
        type="email"
        value={billedEmail}
        onChange={setBilledEmail}
        placeholder="Auto-filled from dispatcher"
        required
        error={errors.billedEmail}
        disabled
      />
      <FormField
        id="commission"
        label="Commission (%)"
        type="number"
        value={commission}
        onChange={setCommission}
        placeholder="Auto-filled from dispatcher"
        required
        disabled
      />
      <div>
        <label className="block text-sm font-medium mb-1">Jobs</label>
        <Select
          isMulti
          options={jobOptions}
          value={jobOptions.filter((opt) => selectedJobIds.includes(opt.value))}
          onChange={(selected) =>
            setSelectedJobIds(selected.map((opt) => opt.value))
          }
          classNamePrefix="react-select"
          placeholder="Select jobs..."
        />
        {errors.jobs && (
          <div className="text-red-500 text-xs">{errors.jobs}</div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border rounded px-2 py-1"
        >
          <option value="pending">Pending</option>
          <option value="raised">Raised</option>
          <option value="received">Received</option>
        </select>
      </div>
      <div className="flex gap-4">
        <div>
          <label className="block text-xs text-muted-foreground">
            Subtotal
          </label>
          <div className="font-semibold">${subTotal.toFixed(2)}</div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">
            Total (incl. 13% HST)
          </label>
          <div className="font-semibold">${total.toFixed(2)}</div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className={
            invoice
              ? "bg-orange-500 hover:bg-orange-600 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }
        >
          {loading
            ? invoice
              ? "Updating..."
              : "Creating..."
            : invoice
            ? "Update Invoice"
            : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}
