"use client";

import { Button } from "@/src/components/ui/button";
import { DollarSign, Mail, User, Calendar, Hash, Briefcase, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { invoiceApi } from "@/src/lib/api";
import { useRouter } from "next/navigation";

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
  dispatcher?: { name: string };
}

interface Job {
  jobId: string;
  jobDate: string;
  jobGrossAmount: number;
  unit?: { name: string };
  driver?: { name: string };
  jobType?: {
    title: string;
    startLocation?: string;
    endLocation?: string;
  };
  company?: { name: string };
}

interface InvoiceJobsData {
  groups: Record<string, Job[]>;
  total: number;
  page: number;
  pageSize: number;
}

interface InvoiceViewProps {
  invoice: Invoice;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function InvoiceView({
  invoice,
  onEdit,
  onDelete,
  onClose,
}: InvoiceViewProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const router = useRouter();

  // Fetch jobs for this invoice
  useEffect(() => {
    if (!invoice.invoiceId) return;
    
    setLoadingJobs(true);
    invoiceApi
      .fetchJobs(invoice.invoiceId, { page: 1, pageSize: 100 })
      .then((data: InvoiceJobsData) => {
        // Extract jobs from the grouped data structure
        const allJobs: Job[] = [];
        if (data.groups) {
          Object.values(data.groups).forEach((monthJobs: Job[]) => {
            if (Array.isArray(monthJobs)) {
              allJobs.push(...monthJobs);
            }
          });
        }
        setJobs(allJobs);
      })
      .catch((error) => {
        console.error('Failed to fetch invoice jobs:', error);
      })
      .finally(() => {
        setLoadingJobs(false);
      });
  }, [invoice.invoiceId]);

  const formatCurrency = (value?: number | string) => {
    if (value === undefined || value === null) return "—";
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return "—";
    return `$${numValue.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    try {
      // Handle different date formats
      let date: Date;
      if (dateString.includes('T')) {
        // ISO format
        date = new Date(dateString);
      } else if (dateString.includes('-')) {
        // Local date format (YYYY-MM-DD)
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        return dateString; // Return original if parsing fails
      }
      
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'text-green-800 bg-green-100 border-green-200';
      case 'sent':
        return 'text-blue-800 bg-blue-100 border-blue-200';
      case 'draft':
      default:
        return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  const handleJobClick = (job: Job) => {
    // Navigate to jobs page with the selected job
    const searchParams = new URLSearchParams();
    searchParams.set('jobId', job.jobId);
    router.push(`/gated/jobs?${searchParams.toString()}`);
  };

  return (
    <div className="slide-over-form">
      <div className="form-section">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Invoice ID
            </div>
            <div className="font-mono text-base">{invoice.invoiceId}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Invoice Number
            </div>
            <div className="text-base font-medium flex items-center gap-2">
              <Hash className="h-5 w-5 text-emerald-600" />
              {invoice.invoiceNumber}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Invoice Date
            </div>
            <div className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              {formatDate(invoice.invoiceDate)}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Status
            </div>
            <div className="text-base">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(invoice.status)}`}>
                {invoice.status || "Draft"}
              </span>
            </div>
          </div>

          {invoice.billedTo && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Billed To
              </div>
              <div className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                {invoice.billedTo}
              </div>
            </div>
          )}

          {invoice.billedEmail && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Billing Email
              </div>
              <div className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <a href={`mailto:${invoice.billedEmail}`} className="text-blue-600 hover:text-blue-800">
                  {invoice.billedEmail}
                </a>
              </div>
            </div>
          )}

          {invoice.dispatcher && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Dispatcher
              </div>
              <div className="text-base">{invoice.dispatcher.name}</div>
            </div>
          )}

          {/* Financial Details */}
          <div className="border-t pt-4">
            <div className="text-xs text-muted-foreground uppercase mb-3">
              Financial Breakdown
            </div>
            <div className="space-y-3">
              {invoice.subTotal !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(invoice.subTotal)}</span>
                </div>
              )}
              
              {invoice.commission !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Commission:</span>
                  <span className="font-medium">{formatCurrency(invoice.commission)}</span>
                </div>
              )}
              
              {invoice.hst !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">HST/Tax:</span>
                  <span className="font-medium">{formatCurrency(invoice.hst)}</span>
                </div>
              )}
              
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-base font-medium">Total Amount:</span>
                  <span className="text-lg font-bold text-emerald-600 flex items-center gap-1">
                    <DollarSign className="h-5 w-5" />
                    {formatCurrency(invoice.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Jobs Section */}
          <div className="border-t pt-4">
            <div className="text-xs text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Jobs Included ({jobs.length})
            </div>
            
            {loadingJobs ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading jobs...
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No jobs found for this invoice.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {jobs.map((job) => (
                  <div
                    key={job.jobId}
                    className="p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors group"
                    onClick={() => handleJobClick(job)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {formatDate(job.jobDate)}
                          </span>
                          {job.unit?.name && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {job.unit.name}
                            </span>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          {job.driver?.name && (
                            <span className="mr-3">Driver: {job.driver.name}</span>
                          )}
                          {job.company?.name && (
                            <span>Customer: {job.company.name}</span>
                          )}
                        </div>
                        
                        {job.jobType && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {job.jobType.title}
                            {job.jobType.startLocation && job.jobType.endLocation && (
                              <span> • {job.jobType.startLocation} to {job.jobType.endLocation}</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-emerald-600">
                          {formatCurrency(job.jobGrossAmount)}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Invoice Summary
            </div>
            <div className="text-base bg-emerald-50 p-3 rounded-lg">
              <div className="text-sm text-emerald-800">
                Invoice <strong>{invoice.invoiceNumber}</strong> was created on <strong>{formatDate(invoice.invoiceDate)}</strong>
                {invoice.billedTo && (
                  <span> for <strong>{invoice.billedTo}</strong></span>
                )}
                {invoice.total && (
                  <span> with a total amount of <strong>{formatCurrency(invoice.total)}</strong></span>
                )}
                . Current status: <strong>{invoice.status || "Draft"}</strong>.
                {invoice.dispatcher && (
                  <span> Managed by dispatcher <strong>{invoice.dispatcher.name}</strong>.</span>
                )}
                {jobs.length > 0 && (
                  <span> This invoice includes <strong>{jobs.length}</strong> job{jobs.length !== 1 ? 's' : ''}.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="form-actions sticky">
        <div className="btn-group">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button type="button" variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}