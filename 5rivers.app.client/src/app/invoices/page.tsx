"use client";
import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { addDays, format } from "date-fns";
import { Job, JobType, Dispatcher, Company, Driver, Unit } from "../jobs/page";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface InvoiceInfo {
  invoiceNumber: string; // e.g. "INV-FP-3112"
  invoiceDate: string; // e.g. "March 01, 2025"
  billedTo: string; // e.g. "Farmer's Pride Haulage"
  billedEmail: string; // e.g. "accounting@farmerspride.ca"
  subTotal: number; // e.g. 10508.45
  dispatchPercent?: number; // e.g. 5
  comm?: number; // e.g. 525.42
  hst?: number; // e.g. 1366.10
  total: number; // e.g. 11349.13
  subItems: any;
}

// Compute the month label (e.g. "December") from job.dateOfJob
function getMonthYear(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return format(date, "MMMM yyyy"); // Changed from "MMMM" to "MMMM yyyy"
}

// 2. Update the groupJobsByMonth function to maintain chronological order within each month group
function groupJobsByMonth(jobs: Job[]): Record<string, Job[]> {
  const groupedJobs = jobs.reduce((acc, job) => {
    const monthLabel = getMonthYear(job.dateOfJob);
    if (!acc[monthLabel]) {
      acc[monthLabel] = [];
    }
    acc[monthLabel].push(job);
    return acc;
  }, {} as Record<string, Job[]>);

  // Sort jobs within each month by dateOfJob
  for (const month in groupedJobs) {
    groupedJobs[month].sort((a, b) => {
      const dateA = new Date(a.dateOfJob);
      const dateB = new Date(b.dateOfJob);
      return dateA.getTime() - dateB.getTime();
    });
  }

  return groupedJobs;
}

// Determine HRS/TON/LOADS based on job type dispatch
const getHrsTonLoads = (job: Job, jobType: JobType | undefined): string => {
  if (!jobType) return `${job.hoursOfJob} / ${job.weight} / ${job.loads}`;
  const dispatchType = jobType.dispatchType.toLowerCase();
  if (dispatchType === "hourly") {
    const start = new Date(`1970-01-01T${job.startTimeForJob}`);
    let end = new Date(`1970-01-01T${job.endTimeForJob}`);
    // If end is before start, assume it is on the next day
    if (start > end) {
      end = new Date(`1970-01-02T${job.endTimeForJob}`);
    }
    let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (diff < 0) diff += 24;
    return diff.toString();
  }
  if (dispatchType === "tonnage") {
    let weightArray: number[] = [];
    if (typeof job.weight === "string") {
      try {
        const parsed = JSON.parse(job.weight);
        if (Array.isArray(parsed)) {
          weightArray = parsed;
        }
      } catch (err) {
        console.error("Error parsing weight:", err);
      }
    } else if (Array.isArray(job.weight)) {
      weightArray = job.weight;
    }
    if (weightArray.length > 0) {
      const totalWeight = weightArray.reduce(
        (sum, val) => sum + Number(val),
        0
      );
      return `${totalWeight.toFixed(2)}`;
    }
    return `${job.weight}`;
  }
  if (dispatchType === "load") return `${job.loads}`;
  return `${job.hoursOfJob} / ${job.weight} / ${job.loads}`;
};

// Calculate the amount based on job type and duration
const calculateAmount = (job: Job, jobType: JobType | undefined): number => {
  if (!jobType) return job.jobGrossAmount;
  const dispatchType = jobType.dispatchType.toLowerCase();
  const rate = jobType.rateOfJob;
  if (dispatchType === "hourly") {
    const start = new Date(`1970-01-01T${job.startTimeForJob}`);
    let end = new Date(`1970-01-01T${job.endTimeForJob}`);
    // If end is before start, assume it is on the next day
    if (start > end) {
      end = new Date(`1970-01-02T${job.endTimeForJob}`);
    }
    let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (diff < 0) diff += 24;
    return diff * rate;
  }
  if (dispatchType === "tonnage") {
    let weightArray: number[] = [];
    if (typeof job.weight === "string") {
      try {
        const parsed = JSON.parse(job.weight);
        if (Array.isArray(parsed)) {
          weightArray = parsed;
        }
      } catch (err) {
        console.error("Error parsing weight:", err);
      }
    } else if (Array.isArray(job.weight)) {
      weightArray = job.weight;
    }
    const totalWeight = weightArray.reduce((sum, val) => sum + Number(val), 0);
    return totalWeight * rate;
  }
  if (dispatchType === "load") {
    return job.loads * rate;
  }
  return job.jobGrossAmount;
};

export default function JobInvoicePage() {
  // Data States (fetched from API)
  // Add this to your existing state declarations
  const [selectedJobs, setSelectedJobs] = useState<Record<string, boolean>>({});
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Filter States
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [selectedDispatcher, setSelectedDispatcher] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");

  // Data Fetching from API
  useEffect(() => {
    fetch(`${API_URL}/jobs`)
      .then((res) => res.json())
      .then((data) => setJobs(data))
      .catch((err) => console.error("Error fetching jobs:", err));

    fetch(`${API_URL}/jobtypes`)
      .then((res) => res.json())
      .then((data) => setJobTypes(data))
      .catch((err) => console.error("Error fetching job types:", err));

    fetch(`${API_URL}/dispatchers`)
      .then((res) => res.json())
      .then((data) => setDispatchers(data))
      .catch((err) => console.error("Error fetching dispatchers:", err));

    fetch(`${API_URL}/companies`)
      .then((res) => res.json())
      .then((data) => setCompanies(data))
      .catch((err) => console.error("Error fetching companies:", err));

    fetch(`${API_URL}/drivers`)
      .then((res) => res.json())
      .then((data) => setDrivers(data))
      .catch((err) => console.error("Error fetching drivers:", err));

    fetch(`${API_URL}/units`)
      .then((res) => res.json())
      .then((data) => setUnits(data))
      .catch((err) => console.error("Error fetching units:", err));
  }, []);

  // Add this function to handle checkbox changes
  const handleJobSelection = (jobId: number) => {
    setSelectedJobs((prev) => ({
      ...prev,
      [jobId]: !prev[jobId],
    }));
  };

  // 1. Update the filteredJobs useMemo to sort jobs by date
  const filteredJobs = useMemo(() => {
    const filtered = jobs.filter((job) => {
      const [year, month, day] = job.dateOfJob.split("-").map(Number);
      const jobDate = new Date(year, month - 1, day);
      const matchesStartDate = selectedStartDate
        ? jobDate >= new Date(selectedStartDate)
        : true;
      const matchesEndDate = selectedEndDate
        ? jobDate <= addDays(new Date(selectedEndDate), 1)
        : true;
      const matchesDispatcher = selectedDispatcher
        ? job.dispatcherId === selectedDispatcher
        : true;
      let matchesCompany = true;
      const jobType = jobTypes.find((jt) => jt.jobTypeId === job.jobTypeId);
      if (selectedCompany && jobType) {
        matchesCompany = jobType.companyId === selectedCompany;
      }
      const matchesUnit = selectedUnit ? job.unitId === selectedUnit : true;
      return (
        matchesStartDate &&
        matchesEndDate &&
        matchesDispatcher &&
        matchesCompany &&
        matchesUnit
      );
    });

    // Sort jobs by date in chronological order
    return filtered.sort((a, b) => {
      const dateA = new Date(a.dateOfJob);
      const dateB = new Date(b.dateOfJob);
      return dateA.getTime() - dateB.getTime();
    });
  }, [
    jobs,
    jobTypes,
    selectedStartDate,
    selectedEndDate,
    selectedDispatcher,
    selectedCompany,
    selectedUnit,
  ]);

  // Updated generateInvoiceNumber function with proper error handling
  const generateInvoiceNumber = (dispatcher: string): string => {
    // Check if dispatcher exists before trying to access properties
    let dispatcherInitials = "XX"; // Default value if no dispatcher name

    if (dispatcher && typeof dispatcher === "string") {
      // Handle case when dispatcher is a string
      dispatcherInitials = dispatcher
        .replace(/[^A-Za-z\s]/g, "") // Remove punctuation, e.g. apostrophes
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");
    }
    // Also add null check for selectedUnit
    let unitNumber = "XX"; // Default value
    if (selectedUnit) {
      const currentUnit = units
        .find((unit) => unit.unitId == selectedUnit)
        ?.name?.split(" ")[1];

      if (currentUnit) {
        unitNumber = currentUnit;
      }
    } else {
      unitNumber = "MUL";
    }

    // Generate date portion only if selectedStartDate and selectedEndDate exist
    let datePortion = "XXXXXX-XXXXXX"; // Default value
    if (selectedStartDate && selectedEndDate) {
      try {
        datePortion = `${format(
          addDays(new Date(selectedStartDate), 1),
          "yyMMdd"
        )}-${format(addDays(new Date(selectedEndDate), 1), "yyMMdd")}`;
      } catch (e) {
        console.error("Error formatting dates:", e);
      }
    } else {
      // Get selected jobs
      const selectedJobsList = filteredJobs.filter(
        (job) => selectedJobs[job.jobId]
      );

      if (selectedJobsList.length > 0) {
        // Find earliest and latest dates among selected jobs
        const jobDates = selectedJobsList.map((job) => new Date(job.dateOfJob));
        const earliestDate = new Date(
          Math.min(...jobDates.map((date) => date.getTime()))
        );
        const latestDate = new Date(
          Math.max(...jobDates.map((date) => date.getTime()))
        );

        // Format dates for invoice number
        datePortion = `${format(earliestDate, "yyMMdd")}-${format(
          latestDate,
          "yyMMdd"
        )}`;
      }
    }

    return `INV-${dispatcherInitials}-${unitNumber}-${datePortion}`;
  };

  // PDF Generation function with updated format and month grouping
  function generatePDF() {
    // Dynamically calculate invoice summary from filteredJobs

    debugger;
    // Get only the selected jobs from filteredJobs
    const jobsToInclude = filteredJobs.filter((job) => selectedJobs[job.jobId]);

    // Use jobsToInclude instead of filteredJobs for calculations
    const subTotal = jobsToInclude.reduce((sum, job) => {
      const jobType = jobTypes.find((jt) => jt.jobTypeId === job.jobTypeId);
      return sum + calculateAmount(job, jobType);
    }, 0);
    const dispatchPercent = 5; // 5% deduction
    const comm = subTotal * (dispatchPercent / 100);
    const hst = subTotal * 0.13;
    const total = subTotal + hst - comm;
    const currentDispatcher = dispatchers.find(
      (dispatcher) => dispatcher.dispatcherId == selectedDispatcher
    );

    // Set invoice date to today's date formatted as "MMMM dd, yyyy"
    const invoiceDate = format(new Date(), "MMMM dd, yyyy");
    const invoiceInfo: InvoiceInfo = {
      invoiceNumber: generateInvoiceNumber(currentDispatcher?.name as string),
      invoiceDate,
      billedTo: currentDispatcher?.name as string,
      billedEmail: "accounting@farmerspride.ca",
      subTotal,
      dispatchPercent,
      comm,
      hst,
      total,
      subItems: [],
    };

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "legal",
    });

    // 1. HEADER – Company Info (Left) & Invoice Info (Right)
    const leftX = 40;
    let y = 40;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("5 Rivers Trucking Inc.", leftX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y += 15;
    doc.text("140 Cherryhill Place", leftX, y);
    y += 15;
    doc.text("London, Ontario", leftX, y);
    y += 15;
    doc.text("N6H4M5", leftX, y);
    y += 15;
    doc.text("+1 (437) 679 9350", leftX, y);
    y += 15;
    doc.text("info@5riverstruckinginc.ca", leftX, y);
    y += 15;
    doc.text("HST #760059956", leftX, y);

    const rightX = 960;
    let yRight = 40;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("INVOICE", rightX, yRight, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    yRight += 20;
    doc.text(invoiceInfo.invoiceNumber, rightX, yRight, { align: "right" });
    doc.setFont("helvetica", "normal");
    yRight += 15;
    doc.text(`Invoice Date: ${invoiceInfo.invoiceDate}`, rightX, yRight, {
      align: "right",
    });
    yRight += 15;
    doc.text(`Billed To: ${invoiceInfo.billedTo}`, rightX, yRight, {
      align: "right",
    });
    yRight += 15;
    doc.text(invoiceInfo.billedEmail, rightX, yRight, { align: "right" });

    // 2. Prepare Table Data with Month Grouping
    const tableColumns = [
      "Date",
      "Unit",
      "Driver",
      "Customer",
      "Type",
      "Job Description",
      "Tickets",
      "HRS/TON/LOADS",
      "Rate",
      "Amount",
    ];

    // Group jobs by month computed from job.dateOfJob
    const groupedJobs = groupJobsByMonth(jobsToInclude);
    const tableBody: any[] = [];
    // with this chronological month sort:
    const months = Object.keys(groupedJobs).sort((a, b) => {
      // Split into month and year components
      const [monthA, yearA] = a.split(" ");
      const [monthB, yearB] = b.split(" ");

      // Compare years first
      if (yearA !== yearB) {
        return parseInt(yearA) - parseInt(yearB);
      }

      // If years are the same, compare months
      const monthOrder = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
    });
    months.forEach((month) => {
      tableBody.push([
        {
          content: month,
          colSpan: tableColumns.length,
          styles: {
            halign: "center",
            fontStyle: "bold",
            fillColor: [230, 230, 230],
          },
        },
      ]);
      groupedJobs[month].forEach((job) => {
        const [year, mm, dd] = job.dateOfJob.split("-").map(Number);
        const dateObj = new Date(year, mm - 1, dd);
        const dateFormatted = format(dateObj, "MMMM dd, yyyy");
        const jobType = jobTypes.find(
          (jobType) => jobType.jobTypeId == job.jobTypeId
        );
        const company = companies.find(
          (company) => company.companyId == jobType?.companyId
        );
        const jobAmount = calculateAmount(
          job,
          jobTypes.find((jt) => jt.jobTypeId === job.jobTypeId)
        ).toFixed(2);

        if (jobAmount != "0.00") {
          tableBody.push([
            dateFormatted,
            job.unitName,
            job.driverName,
            company?.name,
            jobType?.dispatchType,
            jobType?.startLocation + " to " + jobType?.endLocation,
            JSON.parse(job.ticketIds).join(", "),
            getHrsTonLoads(
              job,
              jobTypes.find((jt) => jt.jobTypeId === job.jobTypeId)
            ),
            jobTypes.find((jt) => jt.jobTypeId === job.jobTypeId)?.rateOfJob
              ? `$${
                  jobTypes.find((jt) => jt.jobTypeId === job.jobTypeId)
                    ?.rateOfJob
                }`
              : "",
            jobAmount,

            invoiceInfo.subItems.push({
              jobId: job.jobId,
              date: dateFormatted,
              unit: job.unitName,
              driver: job.driverName,
              customer: company?.name,
              jobType: jobType?.dispatchType,
              jobDescription:
                jobType?.startLocation + " to " + jobType?.endLocation,
              tickets: JSON.parse(job.ticketIds),
              hrsTonLoads: getHrsTonLoads(job, jobType),
              rate: jobType ? `$${jobType.rateOfJob}` : "",
              amount: jobAmount,
            }),
          ]);
        }
      });
    });

    // 3. Draw Table using autoTable
    const startY = 150;
    autoTable(doc, {
      startY,
      head: [tableColumns],
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: 20,
        fontStyle: "bold",
      },
      margin: { left: 40, right: 40 },
    });
    // After drawing the table:
    const finalY = (doc as any).lastAutoTable.finalY;

    // The page height in points
    const pageHeight = doc.internal.pageSize.getHeight();

    // Decide where to place the summary
    let summaryY = finalY + 30;

    // If finalY is too close to the bottom, start a new page
    if (summaryY + 60 > pageHeight) {
      doc.addPage();
      summaryY = 40; // Some top margin on the new page
    }
    // 4. Summary Section (Subtotal, Dispatch, COMM, HST, TOTAL)
    const summaryXLabel = 790;
    const summaryXValue = 960;
    doc.setFont("helvetica", "bold");
    doc.text("SUBTOTAL", summaryXLabel, summaryY);
    doc.text(`$${invoiceInfo.subTotal.toFixed(2)}`, summaryXValue, summaryY, {
      align: "right",
    });
    if (invoiceInfo.dispatchPercent !== undefined) {
      summaryY += 15;
      doc.text(
        `DISPATCH ${invoiceInfo.dispatchPercent.toFixed(2)}%`,
        summaryXLabel,
        summaryY
      );
    }
    if (invoiceInfo.comm !== undefined) {
      summaryY += 15;
      doc.text("COMM.", summaryXLabel, summaryY);
      doc.text(`$${invoiceInfo.comm.toFixed(2)}`, summaryXValue, summaryY, {
        align: "right",
      });
    }
    if (invoiceInfo.hst !== undefined) {
      summaryY += 15;
      doc.text("HST", summaryXLabel, summaryY);
      doc.text(`$${invoiceInfo.hst.toFixed(2)}`, summaryXValue, summaryY, {
        align: "right",
      });
    }
    summaryY += 15;
    doc.text("TOTAL", summaryXLabel, summaryY);
    doc.text(`$${invoiceInfo.total.toFixed(2)}`, summaryXValue, summaryY, {
      align: "right",
    });

    // 6. Save PDF and (optionally) Save Invoice Record via API
    doc.save(`${invoiceInfo.invoiceNumber}.pdf`);
    fetch(API_URL + "/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoiceInfo),
    })
      .then((res) => res.json())
      .then((data) => console.log("Invoice saved:", data))
      .catch((err) => console.error("Error saving invoice:", err));
  }

  return (
    <div className="min-h-screen bg-gray-800">
      <Head>
        <title>Job Invoice Generation</title>
      </Head>
      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-8 text-center text-gray-100">
          Job Invoice Generation
        </h1>

        {/* Filter Section */}
        <div className="bg-white text-gray-900 shadow-md rounded px-8 pt-6 pb-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block mb-1">Start Date</label>
              <input
                type="date"
                value={selectedStartDate}
                onChange={(e) => setSelectedStartDate(e.target.value)}
                className="shadow border rounded w-full py-2 px-3"
              />
            </div>
            <div>
              <label className="block mb-1">End Date</label>
              <input
                type="date"
                value={selectedEndDate}
                onChange={(e) => setSelectedEndDate(e.target.value)}
                className="shadow border rounded w-full py-2 px-3"
              />
            </div>
            <div>
              <label className="block mb-1">Dispatcher</label>
              <select
                value={selectedDispatcher}
                onChange={(e) => setSelectedDispatcher(e.target.value)}
                className="shadow border rounded w-full py-2 px-3"
              >
                <option value="">All</option>
                {dispatchers.map((dispatcher) => (
                  <option
                    key={dispatcher.dispatcherId}
                    value={dispatcher.dispatcherId}
                  >
                    {dispatcher.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1">Company</label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="shadow border rounded w-full py-2 px-3"
              >
                <option value="">All</option>
                {companies.map((company) => (
                  <option key={company.companyId} value={company.companyId}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="block mb-1">Unit Number</label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="shadow border rounded w-full py-2 px-3"
              >
                <option value="">All</option>
                {units.map((unit) => (
                  <option key={unit.unitId} value={unit.unitId}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Preview Table Section */}
        <div className="bg-white shadow-md rounded overflow-x-auto mb-8">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={
                filteredJobs.length > 0 &&
                filteredJobs.every((job) => selectedJobs[job.jobId])
              }
              onChange={() => {
                const newSelected: Record<string, boolean> = {};
                if (!filteredJobs.every((job) => selectedJobs[job.jobId])) {
                  // Select all
                  filteredJobs.forEach((job) => {
                    newSelected[job.jobId] = true;
                  });
                }
                setSelectedJobs(newSelected);
              }}
              className="form-checkbox h-5 w-5 text-blue-600 mr-2"
            />
            <label className="text-gray-900">Select All Jobs</label>
          </div>
          <table className="min-w-full text-gray-900">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 p-2">Select</th>
                <th className="border border-gray-300 p-2">Date</th>
                <th className="border border-gray-300 p-2">Unit</th>
                <th className="border border-gray-300 p-2">Driver</th>
                <th className="border border-gray-300 p-2">Customer</th>
                <th className="border border-gray-300 p-2">Job Type</th>
                <th className="border border-gray-300 p-2">Job Description</th>
                <th className="border border-gray-300 p-2">Tickets</th>
                <th className="border border-gray-300 p-2">HRS/TON/LOADS</th>
                <th className="border border-gray-300 p-2">Rate</th>
                <th className="border border-gray-300 p-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => {
                const [year, month, day] = job.dateOfJob.split("-").map(Number);
                const dateObj = new Date(year, month - 1, day);
                const dateFormatted = format(dateObj, "MMMM dd, yyyy");
                const unit = units.find((u) => u.unitId === job.unitId);
                const truckNumber = unit ? unit.name : job.unitId;
                const driver = drivers.find((d) => d.driverId === job.driverId);
                const driverName = driver ? driver.name : job.driverName;
                const jobType = jobTypes.find(
                  (jt) => jt.jobTypeId === job.jobTypeId
                );
                const jobTypeTitle = jobType ? jobType.dispatchType : "";
                const company = jobType
                  ? companies.find((c) => c.companyId === jobType.companyId)
                  : null;
                const customer = company ? company.name : "";
                const jobDescription = jobType
                  ? `${jobType.startLocation} to ${jobType.endLocation}`
                  : job.title;
                const tickets = JSON.parse(job.ticketIds);
                const hrsTonLoads = getHrsTonLoads(job, jobType);
                const amount = calculateAmount(job, jobType).toFixed(2);
                return (
                  <tr key={job.jobId}>
                    <td className="border border-gray-300 p-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!selectedJobs[job.jobId]}
                        onChange={() => handleJobSelection(job.jobId)}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                    </td>
                    <td className="border border-gray-300 p-2">
                      {dateFormatted}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {dateFormatted}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {truckNumber}
                    </td>
                    <td className="border border-gray-300 p-2">{driverName}</td>
                    <td className="border border-gray-300 p-2">{customer}</td>
                    <td className="border border-gray-300 p-2">
                      {jobTypeTitle}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {jobDescription}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {tickets.join(", ")}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {hrsTonLoads}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {jobType?.rateOfJob}
                    </td>
                    <td className="border border-gray-300 p-2">{amount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PDF Generation Button */}
        <button
          onClick={generatePDF}
          disabled={
            Object.keys(selectedJobs).filter((id) => selectedJobs[id])
              .length === 0
          }
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Generate PDF Invoice (
          {Object.keys(selectedJobs).filter((id) => selectedJobs[id]).length}{" "}
          jobs selected)
        </button>
      </div>
    </div>
  );
}
