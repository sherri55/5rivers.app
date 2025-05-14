import React, { useEffect, useState } from "react";
import { invoiceApi } from "@/src/lib/api";

export function InvoiceDetails({ invoice, onDelete, onEdit }: any) {
  const [jobsData, setJobsData] = useState<any>({ groups: {}, total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [dispatcherId, setDispatcherId] = useState<string>("");

  useEffect(() => {
    if (!invoice?.invoiceId) return;
    setLoading(true);
    setError(null);
    invoiceApi
      .fetchJobs(invoice.invoiceId, { page, dispatcherId: dispatcherId || undefined })
      .then(setJobsData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [invoice?.invoiceId, page, dispatcherId]);

  if (!invoice) return null;

  return (
    <div className="border rounded p-4 bg-card">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-bold">Invoice #{invoice.invoiceNumber}</h3>
        <div>
          <button className="btn btn-sm btn-outline mr-2" onClick={onEdit}>Edit</button>
          <button className="btn btn-sm btn-destructive" onClick={onDelete}>Delete</button>
        </div>
      </div>
      <div className="text-sm text-muted-foreground mb-4">
        <div>Date: {invoice.invoiceDate}</div>
        <div>Status: {invoice.status}</div>
        <div>Dispatcher: {invoice.dispatcherId}</div>
        <div>Billed To: {invoice.billedTo}</div>
        <div>Billed Email: {invoice.billedEmail}</div>
        <div>SubTotal: {invoice.subTotal}</div>
        <div>Commission: {invoice.commission}</div>
        <div>HST: {invoice.hst}</div>
        <div>Total: {invoice.total}</div>
      </div>
      <div className="mb-2 flex gap-2 items-center">
        <label>Dispatcher Filter:</label>
        <input
          className="border rounded px-2 py-1"
          placeholder="Dispatcher ID"
          value={dispatcherId}
          onChange={e => setDispatcherId(e.target.value)}
        />
      </div>
      <div className="mb-2">
        <button
          className="btn btn-xs btn-outline mr-2"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </button>
        <span>Page {jobsData.page} / {Math.ceil(jobsData.total / jobsData.pageSize) || 1}</span>
        <button
          className="btn btn-xs btn-outline ml-2"
          disabled={jobsData.page * jobsData.pageSize >= jobsData.total}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
      {loading && <div>Loading jobs...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div>
        {Object.keys(jobsData.groups || {}).length === 0 && !loading && <div>No jobs found.</div>}
        {Object.entries(jobsData.groups || {}).map(([month, jobs]: any) => (
          <div key={month} className="mb-4">
            <div className="font-semibold mb-1">{month}</div>
            <table className="w-full text-xs border">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Unit</th>
                  <th>Driver</th>
                  <th>Type</th>
                  <th>Gross</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job: any) => (
                  <tr key={job.jobId} className="border-t">
                    <td>{job.jobDate}</td>
                    <td>{job.unit?.name}</td>
                    <td>{job.driver?.name}</td>
                    <td>{job.jobType?.title}</td>
                    <td>{job.jobGrossAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
