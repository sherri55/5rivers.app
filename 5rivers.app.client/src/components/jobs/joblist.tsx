import { useState, useEffect } from "react";
import { format, parseISO, addDays } from "date-fns";
import { Dispatcher, Job, JobType } from "@/app/jobs/page";
import {
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  TruckIcon,
  UserIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ReceiptRefundIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowsUpDownIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

// Props interface
interface JobListSectionProps {
  allJobs: Job[];
  allJobTypes: JobType[];
  allDispatchers: Dispatcher[];
  jobsByMonthAndUnit: Record<string, Record<string, Job[]>>;
  handleEdit: (job: Job) => void;
  handleDelete: (jobId: number) => void;
  updateInvoiceStatus: (
    jobId: number,
    status: "Pending" | "Raised" | "Received"
  ) => void;
}

export default function JobListSection({
  allJobs,
  allJobTypes,
  allDispatchers,
  jobsByMonthAndUnit,
  handleEdit,
  handleDelete,
  updateInvoiceStatus,
}: JobListSectionProps) {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(
    {}
  );
  const [expandedImages, setExpandedImages] = useState<Record<number, boolean>>(
    {}
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Get unique months and units for dropdowns
  const uniqueMonths = Object.keys(jobsByMonthAndUnit).sort().reverse(); // Most recent months first
  const uniqueUnits = [
    ...new Set(
      Object.values(jobsByMonthAndUnit).flatMap((units) => Object.keys(units))
    ),
  ].sort();

  // Initialize all months as expanded
  useEffect(() => {
    const initialExpandedState: Record<string, boolean> = {};
    uniqueMonths.forEach((month) => {
      initialExpandedState[month] = true;
    });
    setExpandedMonths(initialExpandedState);
  }, [uniqueMonths]);

  const toggleMonthExpanded = (month: string) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [month]: !prev[month],
    }));
  };

  const toggleImageExpanded = (jobId: number) => {
    setExpandedImages((prev) => ({
      ...prev,
      [jobId]: !prev[jobId],
    }));
  };

  const toggleSortDirection = () => {
    setSortDirection((prevDirection) =>
      prevDirection === "asc" ? "desc" : "asc"
    );
  };

  const sortJobs = (jobs: Job[]) => {
    return [...jobs].sort((a, b) => {
      const dateA = new Date(a.dateOfJob).getTime();
      const dateB = new Date(b.dateOfJob).getTime();
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    });
  };

  return (
    <div className="text-gray-800">
      {/* Filter Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center">
          <CalendarIcon className="w-5 h-5 text-indigo-600 mr-2" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="p-2 border rounded bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Months</option>
            {uniqueMonths.map((month) => (
              <option key={month} value={month}>
                {format(parseISO(month + "-01"), "MMMM yyyy")}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <TruckIcon className="w-5 h-5 text-indigo-600 mr-2" />
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="p-2 border rounded bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Units</option>
            {uniqueUnits.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center ml-auto">
          <button
            onClick={toggleSortDirection}
            className="flex items-center p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
          >
            <ArrowsUpDownIcon className="w-5 h-5 mr-1" />
            Sort: {sortDirection === "asc" ? "Oldest First" : "Newest First"}
          </button>
        </div>
      </div>

      {/* Filtered Job Listings */}
      {Object.entries(jobsByMonthAndUnit)
        .filter(([month]) => !selectedMonth || month === selectedMonth) // Filter by Month
        .sort(([monthA], [monthB]) => {
          // Always sort months in reverse chronological order (newest first)
          return monthB.localeCompare(monthA);
        })
        .map(([month, units]) => (
          <div
            key={month}
            className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <div
              className="flex items-center justify-between p-4 bg-indigo-50 border-b border-gray-200 cursor-pointer"
              onClick={() => toggleMonthExpanded(month)}
            >
              <h2 className="text-xl font-bold text-indigo-700">
                {format(parseISO(month + "-01"), "MMMM yyyy")}
              </h2>
              <button className="p-1 rounded-full hover:bg-indigo-100">
                {expandedMonths[month] ? (
                  <ChevronUpIcon className="w-5 h-5 text-indigo-700" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-indigo-700" />
                )}
              </button>
            </div>

            <AnimatePresence>
              {expandedMonths[month] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {Object.entries(units)
                    .filter(([unit]) => !selectedUnit || unit === selectedUnit) // Filter by Unit
                    .map(([unit, unitJobs]) => (
                      <div
                        key={unit}
                        className="p-4 border-b border-gray-200 last:border-b-0"
                      >
                        <h3 className="text-lg font-semibold mb-4 px-2 py-1 bg-gray-50 rounded text-gray-700 flex items-center">
                          <TruckIcon className="w-5 h-5 mr-2 text-indigo-600" />
                          Unit: {unit}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {sortJobs(unitJobs).map((job) => {
                            const jobStartTime = job.startTimeForJob
                              ? parseISO(
                                  `${job.dateOfJob}T${job.startTimeForJob}`
                                )
                              : null;
                            const jobEndTime = job.endTimeForJob
                              ? parseISO(
                                  `${job.dateOfJob}T${job.endTimeForJob}`
                                )
                              : null;
                            const isNextDayJob =
                              jobStartTime &&
                              jobEndTime &&
                              jobEndTime < jobStartTime;

                            const driverStartTime = job.startTimeForDriver
                              ? parseISO(
                                  `${job.dateOfJob}T${job.startTimeForDriver}`
                                )
                              : null;
                            const driverEndTime = job.endTimeForDriver
                              ? parseISO(
                                  `${job.dateOfJob}T${job.endTimeForDriver}`
                                )
                              : null;
                            const isNextDayDriver =
                              driverStartTime &&
                              driverEndTime &&
                              driverEndTime < driverStartTime;

                            const adjustedJobDay = isNextDayJob
                              ? format(
                                  addDays(parseISO(job.dateOfJob), 1),
                                  "yyyy-MM-dd"
                                )
                              : job.dateOfJob;
                            const adjustedDriverDay = isNextDayDriver
                              ? format(
                                  addDays(parseISO(job.dateOfJob), 1),
                                  "yyyy-MM-dd"
                                )
                              : job.dateOfJob;

                            // Parse ticket IDs
                            let ticketIds: string[] = [];
                            try {
                              if (job.ticketIds) {
                                const parsed = JSON.parse(job.ticketIds);
                                ticketIds = Array.isArray(parsed) ? parsed : [];
                              }
                            } catch {
                              ticketIds = [];
                            }

                            return (
                              <div
                                key={job.jobId}
                                className={`p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${
                                  job.invoiceStatus === "Received"
                                    ? "bg-green-100 "
                                    : job.invoiceStatus === "Raised"
                                    ? "bg-yellow-100 "
                                    : ""
                                }`}
                              >
                                <h3 className="text-xl font-bold mb-3 text-indigo-700 flex items-start justify-between">
                                  <span className="flex-grow">{job.title}</span>
                                  <span
                                    className={`text-xs font-medium px-2 py-0.5 rounded`}
                                  >
                                    {job.invoiceStatus}
                                  </span>
                                </h3>

                                <div className="space-y-2 mb-4 text-sm">
                                  <div className="flex items-start">
                                    <DocumentTextIcon className="w-4 h-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                                    <div className="flex-grow">
                                      <span className="font-medium">
                                        Job Type:{" "}
                                      </span>
                                      {allJobTypes.find(
                                        (jobType) =>
                                          jobType.jobTypeId === job.jobTypeId
                                      )?.title || "Unknown"}
                                    </div>
                                  </div>

                                  <div className="flex items-start">
                                    <CalendarIcon className="w-4 h-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                                    <div className="flex-grow">
                                      <span className="font-medium">
                                        Date:{" "}
                                      </span>
                                      {format(
                                        parseISO(job.dateOfJob),
                                        "MMM d, yyyy"
                                      )}
                                      {job.dayOfJob && ` (${job.dayOfJob})`}
                                    </div>
                                  </div>

                                  <div className="flex items-start">
                                    <UserIcon className="w-4 h-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                                    <div className="flex-grow">
                                      <span className="font-medium">
                                        Dispatch:{" "}
                                      </span>
                                      {allDispatchers.find(
                                        (dispatcher) =>
                                          dispatcher.dispatcherId ===
                                          job.dispatcherId
                                      )?.name || "Unknown"}
                                    </div>
                                  </div>

                                  <div className="flex items-start">
                                    <UserIcon className="w-4 h-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                                    <div className="flex-grow">
                                      <span className="font-medium">
                                        Driver:{" "}
                                      </span>
                                      {job.driverName || "Unknown"}
                                    </div>
                                  </div>

                                  {job.jobGrossAmount > 0 && (
                                    <div className="flex items-start">
                                      <CurrencyDollarIcon className="w-4 h-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                                      <div className="flex-grow">
                                        <span className="font-medium">
                                          Gross Amount:{" "}
                                        </span>
                                        ${job.jobGrossAmount?.toFixed(2)}
                                      </div>
                                    </div>
                                  )}

                                  {ticketIds.length > 0 && (
                                    <div className="flex items-start">
                                      <ReceiptRefundIcon className="w-4 h-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                                      <div className="flex-grow">
                                        <span className="font-medium">
                                          Tickets:{" "}
                                        </span>
                                        <span className="flex flex-wrap gap-1 mt-1">
                                          {ticketIds.map((ticket) => (
                                            <span
                                              key={ticket}
                                              className="bg-gray-100 px-2 py-0.5 rounded-full text-xs"
                                            >
                                              {ticket}
                                            </span>
                                          ))}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2 mb-4">
                                  {(
                                    ["Pending", "Raised", "Received"] as const
                                  ).map((s) => (
                                    <button
                                      key={s}
                                      onClick={() =>
                                        updateInvoiceStatus(job.jobId, s)
                                      }
                                      className={`
                          px-3 py-1 rounded text-sm
                          ${
                            job.invoiceStatus === s
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }
                        `}
                                    >
                                      {s}
                                    </button>
                                  ))}
                                </div>

                                {/* Show images if available */}
                                {job.imageUrls && job.imageUrls.length > 0 && (
                                  <div className="mt-3">
                                    <button
                                      className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm"
                                      onClick={() =>
                                        toggleImageExpanded(job.jobId)
                                      }
                                    >
                                      <PhotoIcon className="w-4 h-4 mr-1" />
                                      {expandedImages[job.jobId]
                                        ? "Hide"
                                        : "Show"}{" "}
                                      Images ({job.imageUrls.length})
                                    </button>
                                    <AnimatePresence>
                                      {expandedImages[job.jobId] && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{
                                            height: "auto",
                                            opacity: 1,
                                          }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.3 }}
                                          className="mt-2 overflow-hidden"
                                        >
                                          <div className="grid grid-cols-2 gap-2">
                                            {job.imageUrls.map(
                                              (imageUrl, index) => (
                                                <img
                                                  key={index}
                                                  src={imageUrl}
                                                  alt={`Job ${
                                                    job.title
                                                  } image ${index + 1}`}
                                                  className="w-full h-auto rounded border border-gray-200"
                                                />
                                              )
                                            )}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                )}

                                <div className="flex gap-2 mt-4 justify-end">
                                  <button
                                    onClick={() => handleEdit(job)}
                                    className="flex items-center bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded transition-colors"
                                  >
                                    <PencilIcon className="w-4 h-4 mr-1" /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(job.jobId)}
                                    className="flex items-center bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded transition-colors"
                                  >
                                    <TrashIcon className="w-4 h-4 mr-1" />{" "}
                                    Delete
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

      {/* Empty State */}
      {Object.entries(jobsByMonthAndUnit)
        .filter(([month]) => !selectedMonth || month === selectedMonth)
        .filter(
          ([month, units]) =>
            !selectedUnit || Object.keys(units).includes(selectedUnit)
        ).length === 0 && (
        <div className="bg-white p-8 text-center rounded-lg shadow-md border border-gray-200">
          <p className="text-gray-500 text-lg">
            No jobs found matching the selected filters.
          </p>
        </div>
      )}
    </div>
  );
}
