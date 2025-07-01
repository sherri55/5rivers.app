"use client";

import { Button } from "@/src/components/ui/button";
import { DollarSign, Mail, User, Calendar, Hash, Briefcase, ArrowRight, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { invoiceApi } from "@/src/lib/api";
import { useRouter } from "next/navigation";
import { Invoice } from "@/src/types/entities";
import { toast } from "sonner";

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
  const [downloadingPdf, setDownloadingPdf] = useState(false);
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

  const handleDownloadPdf = async () => {
    if (!invoice.invoiceId) return;
    
    setDownloadingPdf(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9999';
      const response = await fetch(`${API_URL}/invoices/${invoice.invoiceId}/pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      
      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoiceNumber || invoice.invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="view-field-label">Invoice ID</label>
          <div className="view-field-value font-mono">{invoice.invoiceId}</div>
        </div>

        <div className="space-y-2">
          <label className="view-field-label">Invoice Number</label>
          <div className="view-field-value flex items-center gap-2">
            <Hash className="h-5 w-5 text-emerald-600" />
            {invoice.invoiceNumber}
          </div>
        </div>

        <div className="space-y-2">
          <label className="view-field-label">Invoice Date</label>
          <div className="view-field-value flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            {formatDate(invoice.invoiceDate)}
          </div>
        </div>

        <div className="space-y-2">
          <label className="view-field-label">Status</label>
          <div className="view-field-value">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(invoice.status)}`}>
              {invoice.status || "Draft"}
            </span>
          </div>
        </div>

        {invoice.billedTo && (
          <div className="space-y-2">
            <label className="view-field-label">Billed To</label>
            <div className="view-field-value flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              {invoice.billedTo}
            </div>
          </div>
        )}

        {invoice.billedEmail && (
          <div className="space-y-2">
            <label className="view-field-label">Billing Email</label>
            <div className="view-field-value flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <a href={`mailto:${invoice.billedEmail}`} className="text-blue-600 hover:text-blue-800">
                {invoice.billedEmail}
              </a>
            </div>
          </div>
        )}

        {invoice.dispatcher && (
          <div className="space-y-2">
            <label className="view-field-label">Dispatcher</label>
            <div className="view-field-value">{invoice.dispatcher.name}</div>
          </div>
        )}

        {/* Financial Details */}
        <div className="border-t border-gray-200 pt-4">
          <label className="view-field-label mb-3 block">Financial Breakdown</label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            {invoice.subTotal !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Subtotal</span>
                <span className="text-base font-semibold text-gray-900">{formatCurrency(invoice.subTotal)}</span>
              </div>
            )}
            
            {invoice.commission !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Commission</span>
                <span className="text-base font-semibold text-gray-900">{formatCurrency(invoice.commission)}</span>
              </div>
            )}
            
            {invoice.hst !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">HST (13%)</span>
                <span className="text-base font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(invoice.hst)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center pt-3 border-t border-gray-300 dark:border-gray-600">
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total</span>
              <span className="text-xl font-bold text-green-600 dark:text-green-500 flex items-center gap-1">
                <DollarSign className="h-5 w-5" />
                {formatCurrency(invoice.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Jobs Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <label className="view-field-label mb-3 flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Jobs Included ({jobs.length})
          </label>
          
          {loadingJobs ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading jobs...
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No jobs found for this invoice.
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {jobs.map((job) => (
                <div
                  key={job.jobId}
                  className="p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors group"
                  onClick={() => handleJobClick(job)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatDate(job.jobDate)}
                        </span>
                        {job.unit?.name && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                            {job.unit.name}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {job.driver?.name && (
                          <span className="mr-3">Driver: {job.driver.name}</span>
                        )}
                        {job.company?.name && (
                          <span>Customer: {job.company.name}</span>
                        )}
                      </div>
                      
                      {job.jobType && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {job.jobType.title}
                          {job.jobType.startLocation && job.jobType.endLocation && (
                            <span> • {job.jobType.startLocation} to {job.jobType.endLocation}</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-emerald-600 dark:text-emerald-500">
                        {formatCurrency(job.jobGrossAmount)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="view-field-label">Invoice Summary</label>
          <div className="view-field-value bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-lg">
            <div className="text-sm text-emerald-800 dark:text-emerald-200">
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

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {downloadingPdf ? 'Downloading...' : 'Download PDF'}
        </Button>
        
        <div className="flex space-x-3">
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