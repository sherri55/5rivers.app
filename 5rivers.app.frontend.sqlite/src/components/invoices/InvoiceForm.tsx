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
  unit?: { name: string };
  unitId?: string;
  driver?: { name: string };
  driverId?: string;
}

interface InvoiceFormProps {
  invoice?: Invoice;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InvoiceForm({
  invoice,
  onSuccess,
  onCancel,
}: InvoiceFormProps) {
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
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
    label: `${j.jobDate ? new Date(j.jobDate).toLocaleDateString() : 'No Date'} • ${
      j.unit?.name || 'Unit #' + j.unitId || 'No Unit'
    } • ${j.driver?.name || 'Driver #' + j.driverId || 'No Driver'} • $${
      (j.jobGrossAmount || 0).toFixed(2)
    }`,
  }));

  // Fetch dispatchers on mount
  useEffect(() => {
    dispatcherApi
      .fetchAll({ pageSize: 10000 })
      .then((response) => {
        // Handle paginated response format
        const dispatchers = response.data || response;
        setDispatchers(dispatchers);
      })
      .catch(() => toast.error("Failed to load dispatchers"));
  }, []);

  // Set defaults for new invoice or editing (except jobs)
  useEffect(() => {
    if (!invoice) {
      const today = new Date();
      setInvoiceDate(today.toISOString().slice(0, 10));
      setStatus("pending");
    } else {
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
    if (invoice && jobs.length > 0) {
      // For editing: get job IDs from the invoice
      if (invoice.jobs && Array.isArray(invoice.jobs)) {
        // If invoice has jobs directly
        const validJobIds = invoice.jobs
          .map((j: any) => j.jobId)
          .filter((id: string) => jobs.some((job) => job.jobId === id));
        setSelectedJobIds(validJobIds);
      } else if (invoice.invoiceId) {
        // If we need to fetch jobs from the API (already handled in the jobs loading useEffect)
        // The selectedJobIds will be set when the invoice jobs are loaded
      }
    } else if (!invoice) {
      setSelectedJobIds([]);
    }
  }, [jobs, invoice]);

  // Fetch jobs for selected dispatcher
  useEffect(() => {
    if (dispatcherId) {
      const loadJobs = async () => {
        try {
          // Fetch all jobs for this dispatcher
          const response = await jobApi.fetchAll({ pageSize: 10000 });
          const allJobs = response.data || response;
          
          let availableJobs;
          let invoiceJobs: Job[] = [];
          
          if (invoice && invoice.invoiceId) {
            // For editing: fetch jobs that are already in this invoice
            try {
              const invoiceJobsResponse = await invoiceApi.fetchJobs(invoice.invoiceId, { pageSize: 1000 });
              // Extract jobs from the grouped data structure
              if (invoiceJobsResponse.groups) {
                Object.values(invoiceJobsResponse.groups).forEach((monthJobs: any[]) => {
                  if (Array.isArray(monthJobs)) {
                    invoiceJobs.push(...monthJobs);
                  }
                });
              }
            } catch (error) {
              console.error('Error fetching existing invoice jobs:', error);
            }
            
            // Get list of all jobs that are already invoiced (through InvoiceLines)
            // We'll need to check this differently now
            const invoicedJobIds = new Set<string>();
            
            // For now, we'll assume that if a job appears in any invoice's jobs, it's invoiced
            // This is a simplified approach - in a real scenario, you might want to 
            // query all InvoiceLines to get truly invoiced jobs
            try {
              const allInvoicesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices?pageSize=10000`);
              if (allInvoicesResponse.ok) {
                const allInvoicesData = await allInvoicesResponse.json();
                const allInvoices = allInvoicesData.data || [];
                
                for (const inv of allInvoices) {
                  if (inv.invoiceLines && inv.invoiceId !== invoice.invoiceId) {
                    inv.invoiceLines.forEach((line: any) => {
                      invoicedJobIds.add(line.jobId);
                    });
                  }
                }
              }
            } catch (error) {
              console.error('Error fetching invoiced jobs:', error);
            }
            
            // Include jobs for this dispatcher that are either not invoiced or belong to this invoice
            availableJobs = allJobs.filter(
              (j: any) =>
                j.dispatcherId === dispatcherId &&
                (!invoicedJobIds.has(j.jobId) || invoiceJobs.some(invJob => invJob.jobId === j.jobId))
            );
            
            // Merge invoice jobs with available jobs (in case some jobs are not in the filtered list)
            const jobIds = new Set(availableJobs.map((j: any) => j.jobId));
            invoiceJobs.forEach((job) => {
              if (!jobIds.has(job.jobId)) {
                availableJobs.push(job);
              }
            });
          } else {
            // For creating: get all invoiced job IDs first
            const invoicedJobIds = new Set<string>();
            
            try {
              const allInvoicesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices?pageSize=10000`);
              if (allInvoicesResponse.ok) {
                const allInvoicesData = await allInvoicesResponse.json();
                const allInvoices = allInvoicesData.data || [];
                
                for (const inv of allInvoices) {
                  if (inv.invoiceLines) {
                    inv.invoiceLines.forEach((line: any) => {
                      invoicedJobIds.add(line.jobId);
                    });
                  }
                }
              }
            } catch (error) {
              console.error('Error fetching invoiced jobs:', error);
            }
            
            // Only jobs for this dispatcher and not already invoiced
            availableJobs = allJobs.filter(
              (j: any) => j.dispatcherId === dispatcherId && !invoicedJobIds.has(j.jobId)
            );
          }
          
          setJobs(availableJobs);
          
          // If editing and we loaded invoice jobs, set the selected job IDs
          if (invoice && invoice.invoiceId && invoiceJobs.length > 0) {
            const invoiceJobIds = invoiceJobs.map(job => job.jobId);
            setSelectedJobIds(invoiceJobIds);
          }
        } catch (error) {
          console.error('Error fetching jobs:', error);
          toast.error("Failed to load jobs");
        }
      };
      
      loadJobs();
      
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
    const hst = sub * 0.13; // HST on subtotal only
    setTotal(sub + hst - comm); // Total = (Subtotal + HST) - Commission
  }, [selectedJobIds, jobs, commission]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
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
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <FormField
            id="invoiceDate"
            label="Date"
            type="date"
            value={invoiceDate}
            onChange={setInvoiceDate}
            required
            error={errors.invoiceDate}
          />
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Dispatcher</label>
            <select
              id="dispatcherId"
              value={dispatcherId}
              onChange={(e) => setDispatcherId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
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
              <p className="text-red-600 text-xs font-medium">{errors.dispatcherId}</p>
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
          />
          
          <FormField
            id="commission"
            label="Commission (%)"
            type="number"
            value={commission}
            onChange={setCommission}
            placeholder="Auto-filled from dispatcher"
            required
          />
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Jobs for Selected Dispatcher
              {jobs.length > 0 && (
                <span className="text-xs text-gray-500 ml-2 font-normal">
                  ({jobs.length} available)
                </span>
              )}
            </label>
            <div className="relative">
              <Select
                isMulti
                options={jobOptions}
                value={jobOptions.filter((opt) => selectedJobIds.includes(opt.value))}
                onChange={(selected) =>
                  setSelectedJobIds(selected ? selected.map((opt) => opt.value) : [])
                }
                className="react-select-container"
                classNamePrefix="react-select"
                placeholder={jobs.length === 0 ? "Select a dispatcher first..." : "Select jobs to include in invoice..."}
                isDisabled={jobs.length === 0}
                noOptionsMessage={() => "No available jobs for this dispatcher"}
              />
            </div>
            {errors.jobs && (
              <p className="text-red-600 text-xs font-medium">{errors.jobs}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            >
              <option value="pending">Pending</option>
              <option value="raised">Raised</option>
              <option value="received">Received</option>
            </select>
          </div>
          
          {/* Summary Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Subtotal</span>
              <span className="text-base font-semibold text-gray-900">${subTotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Commission ({commission}%)</span>
              <span className="text-base font-semibold text-gray-900">
                ${commission ? (subTotal * (parseFloat(commission) / 100)).toFixed(2) : '0.00'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">HST (13%)</span>
              <span className="text-base font-semibold text-gray-900">
                ${(subTotal * 0.13).toFixed(2)}
              </span>
            </div>
            
            <div className="flex justify-between items-center pt-3 border-t border-gray-300">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-green-600">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
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
            variant={invoice ? "destructive" : "default"}
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
    </div>
  );
}
