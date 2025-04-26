"use client";
import { Table } from "@/components/ui/Table";
import { format } from "date-fns";
import { Input } from "@/components/ui/Input";

interface JobRow {
  jobId: string;
  dateOfJob: string;
  unitName: string;
  driverName: string;
  dispatchType: string;
  dispatcher: string;
  location: string;
  amount: number;
}
interface Props {
  jobs: JobRow[];
  selected: Record<string, boolean>;
  toggleSelect: (id: string) => void;
  generateDisabled: boolean;
  onGenerate: () => void;
}
export function InvoiceTable({
  jobs,
  selected,
  toggleSelect,
  generateDisabled,
  onGenerate,
}: Props) {
  return (
    <>
      <div className="p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="text-lg font-semibold text-gray-700">
          <span className="text-indigo-600">{jobs.length}</span> jobs
        </div>
        <button
          onClick={onGenerate}
          disabled={generateDisabled}
          className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white px-6 py-2 rounded-lg shadow-md hover:from-indigo-600 hover:to-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Generate PDF{" "}
          <span className="ml-2 bg-white/20 rounded px-2 py-0.5 text-xs">
            {Object.values(selected).filter(Boolean).length}
          </span>
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg shadow border border-gray-200 bg-white">
        <Table
          headers={[
            "Select",
            "Date",
            "Unit",
            "Driver",
            "Type",
            "Dispatcher",
            "Location",
            "Amount",
          ]}
          isLoading={false}
          emptyState={
            <div className="py-8 text-center text-gray-400">
              <strong className="block text-lg mb-2">No jobs</strong>
              <p>Adjust filters</p>
            </div>
          }
        >
          {jobs.map((job) => (
            <tr
              key={job.jobId}
              className={`transition-colors duration-150 ${
                selected[job.jobId] ? "bg-indigo-50" : "hover:bg-gray-50"
              }`}
            >
              <td className="px-4 py-3 text-center">
                <Input
                  type="checkbox"
                  checked={selected[job.jobId] || false}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelect(job.jobId);
                  }}
                  className="accent-indigo-600 w-5 h-5 cursor-pointer"
                />
              </td>
              <td
                className="px-4 py-3 whitespace-nowrap text-gray-700 font-medium cursor-pointer hover:underline"
                onClick={() => {
                  window.location.href = `/jobs?jobId=${job.jobId}`;
                }}
              >
                {format(new Date(job.dateOfJob), "MMM dd, yyyy")}
              </td>
              <td
                className="px-4 py-3 whitespace-nowrap text-gray-600 cursor-pointer hover:underline"
                onClick={() => {
                  window.location.href = `/jobs?jobId=${job.jobId}`;
                }}
              >
                {job.unitName}
              </td>
              <td
                className="px-4 py-3 whitespace-nowrap text-gray-600 cursor-pointer hover:underline"
                onClick={() => {
                  window.location.href = `/jobs?jobId=${job.jobId}`;
                }}
              >
                {job.driverName}
              </td>
              <td
                className="px-4 py-3 whitespace-nowrap text-gray-500 cursor-pointer hover:underline"
                onClick={() => {
                  window.location.href = `/jobs?jobId=${job.jobId}`;
                }}
              >
                {job.dispatchType}
              </td>
              <td
                className="px-4 py-3 whitespace-nowrap text-gray-600 cursor-pointer hover:underline"
                onClick={() => {
                  window.location.href = `/jobs?jobId=${job.jobId}`;
                }}
              >
                {job.dispatcher}
              </td>
              <td
                className="px-4 py-3 whitespace-nowrap text-gray-600 cursor-pointer hover:underline"
                onClick={() => {
                  window.location.href = `/jobs?jobId=${job.jobId}`;
                }}
              >
                {job.location}
              </td>
              <td
                className="px-4 py-3 whitespace-nowrap text-right font-semibold text-indigo-700 cursor-pointer hover:underline"
                onClick={() => {
                  window.location.href = `/jobs?jobId=${job.jobId}`;
                }}
              >
                ${job.amount.toFixed(2)}
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </>
  );
}
