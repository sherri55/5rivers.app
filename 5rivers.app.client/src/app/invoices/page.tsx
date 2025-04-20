'use client';

import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, addDays } from 'date-fns';
// Import existing UI components
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Toast, ToastProvider } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CollapsiblePanel } from '@/components/ui/CollapsiblePanel';

// Import popular npm packages for UI components
import Modal from 'react-modal'; // For dialog/modal
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'; // For tabs
import 'react-tabs/style/react-tabs.css'; // Styles for react-tabs
import { 
  DocumentIcon, 
  ExclamationCircleIcon, 
  DocumentArrowDownIcon, 
  XCircleIcon, 
  DocumentTextIcon, 
  ViewfinderCircleIcon, 
  TrashIcon
} from '@heroicons/react/24/outline';

// API endpoint
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Type definitions
interface Job {
  jobId: string;
  title: string;
  dateOfJob: string;
  driverId: string;
  driverName: string;
  dispatcherId: string;
  unitId: string;
  unitName: string;
  jobTypeId: string;
  startTimeForJob: string;
  endTimeForJob: string;
  startTimeForDriver: string;
  endTimeForDriver: string;
  hoursOfJob: number;
  hoursOfDriver: number;
  jobGrossAmount: number;
  driverPay: number;
  loads: number;
  weight: string | number[];
  ticketIds: string | string[];
  dayOfJob: string;
  estimatedFuel: number;
  estimatedRevenue: number;
  imageUrls?: string[];
  invoiceId?: string;
}

interface JobType {
  jobTypeId: string;
  name: string;
  dispatchType: string;
  rateOfJob: number;
  startLocation: string;
  endLocation: string;
  companyId: string;
}

interface Company {
  companyId: string;
  name: string;
}

interface Driver {
  driverId: string;
  name: string;
  hourlyRate: number;
}

interface Dispatcher {
  dispatcherId: string;
  name: string;
  email?: string;
}

interface Unit {
  unitId: string;
  name: string;
}

interface InvoiceItem {
  jobId: string;
  date: string;
  unit: string;
  driver: string;
  customer: string;
  jobType: string;
  jobDescription: string;
  tickets: string[] | string;
  hrsTonLoads: string;
  rate: string;
  amount: string | number;
}

interface Invoice {
  invoiceId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  billedTo: string;
  billedEmail: string;
  subTotal: number;
  dispatchPercent?: number;
  comm?: number;
  hst?: number;
  total: number;
  subItems: InvoiceItem[];
  createdAt?: string;
  jobs?: Job[];
}

// Custom hook for fetching data
const useInvoiceData = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const endpoints = ['jobs', 'jobtypes', 'dispatchers', 'companies', 'drivers', 'units', 'invoices'];
        const responses = await Promise.all(
          endpoints.map(endpoint => 
            fetch(`${API_URL}/${endpoint}`)
              .then(res => {
                if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
                return res.json();
              })
          )
        );
        
        setJobs(responses[0]);
        setJobTypes(responses[1]);
        setDispatchers(responses[2]);
        setCompanies(responses[3]);
        setDrivers(responses[4]);
        setUnits(responses[5]);
        setInvoices(responses[6]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  return { 
    jobs, 
    jobTypes, 
    dispatchers, 
    companies, 
    drivers, 
    units, 
    invoices,
    setInvoices,
    loading, 
    error 
  };
};

// Utility functions
const getMonthYear = (dateStr: string): string => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return format(date, "MMMM yyyy");
};

interface TableRow {
  content: string;
  colSpan: number;
  styles: {
    halign: string;
    fontStyle: string;
    fillColor: number[];
  };
}

const groupJobsByMonth = (jobs: Job[]): Record<string, Job[]> => {
  const groupedJobs = jobs.reduce((acc, job) => {
    const monthLabel = getMonthYear(job.dateOfJob);
    if (!acc[monthLabel]) {
      acc[monthLabel] = [];
    }
    acc[monthLabel].push(job);
    return acc;
  }, {} as Record<string, Job[]>);

  // Sort jobs within each month
  Object.keys(groupedJobs).forEach(month => {
    groupedJobs[month].sort((a, b) => 
      new Date(a.dateOfJob).getTime() - new Date(b.dateOfJob).getTime()
    );
  });

  return groupedJobs;
};

const getHrsTonLoads = (job: Job, jobType: JobType | undefined): string => {
  if (!jobType) return `${job.hoursOfJob} / ${job.weight} / ${job.loads}`;
  
  const dispatchType = jobType.dispatchType.toLowerCase();
  
  if (dispatchType === "hourly") {
    // Calculate hours between start and end time
    const start = new Date(`1970-01-01T${job.startTimeForJob}`);
    let end = new Date(`1970-01-01T${job.endTimeForJob}`);
    // If end is before start, assume it is on the next day
    if (start > end) end = new Date(`1970-01-02T${job.endTimeForJob}`);
    let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (diff < 0) diff += 24;
    return diff.toString();
  }
  
  if (dispatchType === "tonnage") {
    // Parse weight data
    let weightArray: number[] = [];
    if (typeof job.weight === "string") {
      try {
        const parsed = JSON.parse(job.weight);
        if (Array.isArray(parsed)) weightArray = parsed;
      } catch (err) {
        console.error("Error parsing weight:", err);
      }
    } else if (Array.isArray(job.weight)) {
      weightArray = job.weight;
    }
    
    if (weightArray.length > 0) {
      const totalWeight = weightArray.reduce((sum, val) => sum + Number(val), 0);
      return `${totalWeight.toFixed(2)}`;
    }
    return `${job.weight}`;
  }
  
  if (dispatchType === "load") return `${job.loads}`;
  
  return `${job.hoursOfJob} / ${job.weight} / ${job.loads}`;
};

const calculateAmount = (job: Job, jobType: JobType | undefined): number => {
  if (!jobType) return job.jobGrossAmount;
  
  const dispatchType = jobType.dispatchType.toLowerCase();
  const rate = jobType.rateOfJob;
  
  if (dispatchType === "hourly") {
    // Calculate hours
    const start = new Date(`1970-01-01T${job.startTimeForJob}`);
    let end = new Date(`1970-01-01T${job.endTimeForJob}`);
    if (start > end) end = new Date(`1970-01-02T${job.endTimeForJob}`);
    let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (diff < 0) diff += 24;
    return diff * rate;
  }
  
  if (dispatchType === "tonnage") {
    // Calculate total tonnage
    let weightArray: number[] = [];
    if (typeof job.weight === "string") {
      try {
        const parsed = JSON.parse(job.weight);
        if (Array.isArray(parsed)) weightArray = parsed;
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

const generateInvoiceNumber = (dispatcher: string | undefined, selectedUnit: string | undefined, units: Unit[], selectedStartDate: string, selectedEndDate: string, selectedJobs: Record<string, boolean>, filteredJobs: Job[]): string => {
  // Get dispatcher initials
  let dispatcherInitials = dispatcher 
    ? dispatcher.replace(/[^A-Za-z\s]/g, "").split(/\s+/).filter(Boolean).map(word => word.charAt(0).toUpperCase()).join("")
    : "XX";
  
  // Get unit number
  let unitNumber = "XX";
  if (selectedUnit) {
    const currentUnit = units.find(unit => unit.unitId == selectedUnit)?.name?.split(" ")[1];
    if (currentUnit) unitNumber = currentUnit;
  } else {
    unitNumber = "MUL";
  }
  
  // Generate date portion
  let datePortion = "XXXXXX-XXXXXX";
  if (selectedStartDate && selectedEndDate) {
    try {
      datePortion = `${format(addDays(new Date(selectedStartDate), 1), "yyMMdd")}-${format(addDays(new Date(selectedEndDate), 1), "yyMMdd")}`;
    } catch (e) {
      console.error("Error formatting dates:", e);
    }
  } else {
    // Get dates from selected jobs
    const selectedJobsList = filteredJobs.filter(job => selectedJobs[job.jobId]);
    
    if (selectedJobsList.length > 0) {
      const jobDates = selectedJobsList.map(job => new Date(job.dateOfJob));
      const earliestDate = new Date(Math.min(...jobDates.map(date => date.getTime())));
      const latestDate = new Date(Math.max(...jobDates.map(date => date.getTime())));
      datePortion = `${format(earliestDate, "yyMMdd")}-${format(latestDate, "yyMMdd")}`;
    }
  }
  
  return `INV-${dispatcherInitials}-${unitNumber}-${datePortion}`;
};

// PDF Generation helper
const generateInvoicePDF = (
  selectedJobs: Record<string, boolean>, 
  filteredJobs: Job[], 
  jobTypes: JobType[], 
  dispatchers: Dispatcher[], 
  companies: Company[], 
  units: Unit[], 
  selectedDispatcher: string, 
  selectedUnit: string, 
  selectedStartDate: string, 
  selectedEndDate: string,
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>
): Invoice | undefined => {
  // Get only selected jobs
  const jobsToInclude = filteredJobs.filter(job => selectedJobs[job.jobId]);
  
  if (jobsToInclude.length === 0) {
    Toast.error("No jobs selected for invoice");
    return;
  }
  
  // Calculate invoice totals
  const subTotal = jobsToInclude.reduce((sum, job) => {
    const jobType = jobTypes.find(jt => jt.jobTypeId === job.jobTypeId);
    return sum + calculateAmount(job, jobType);
  }, 0);
  
  const dispatchPercent = 5; // 5% commission
  const comm = subTotal * (dispatchPercent / 100);
  const hst = subTotal * 0.13; // 13% HST
  const total = subTotal + hst - comm;
  
  const currentDispatcher = dispatchers.find(d => d.dispatcherId == selectedDispatcher);
  
  // Create invoice info object
  const invoiceInfo: Invoice = {
    invoiceNumber: generateInvoiceNumber(
      currentDispatcher?.name, 
      selectedUnit, 
      units, 
      selectedStartDate, 
      selectedEndDate, 
      selectedJobs, 
      filteredJobs
    ),
    invoiceDate: format(new Date(), "MMMM dd, yyyy"),
    billedTo: currentDispatcher?.name || "Unknown",
    billedEmail: "accounting@farmerspride.ca",
    subTotal,
    dispatchPercent,
    comm,
    hst,
    total,
    subItems: [],
  };
  
  // Create PDF document
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "legal",
  });
  
  // Draw header section
  const drawHeader = () => {
    const leftX = 40;
    let y = 40;
    
    // Company info (left side)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("5 Rivers Trucking Inc.", leftX, y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    y += 15; doc.text("140 Cherryhill Place", leftX, y);
    y += 15; doc.text("London, Ontario", leftX, y);
    y += 15; doc.text("N6H4M5", leftX, y);
    y += 15; doc.text("+1 (437) 679 9350", leftX, y);
    y += 15; doc.text("info@5riverstruckinginc.ca", leftX, y);
    y += 15; doc.text("HST #760059956", leftX, y);
    
    // Invoice info (right side)
    const rightX = 960;
    let yRight = 40;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("INVOICE", rightX, yRight, { align: "right" });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    
    yRight += 20; doc.text(invoiceInfo.invoiceNumber, rightX, yRight, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    yRight += 15; doc.text(`Invoice Date: ${invoiceInfo.invoiceDate}`, rightX, yRight, { align: "right" });
    yRight += 15; doc.text(`Billed To: ${invoiceInfo.billedTo}`, rightX, yRight, { align: "right" });
    yRight += 15; doc.text(invoiceInfo.billedEmail, rightX, yRight, { align: "right" });
  };
  
  // Prepare table data
  const prepareTableData = (): { 
    tableColumns: string[]; 
    tableBody: Array<any[]|{content: string; colSpan: number; styles: object}[]>; 
  } => {
    const tableColumns: string[] = [
      "Date", 
      "Unit", 
      "Driver", 
      "Customer", 
      "Type", 
      "Job Description", 
      "Tickets", 
      "HRS/TON/LOADS", 
      "Rate", 
      "Amount"
    ];
    
    // Group jobs by month
    const groupedJobs = groupJobsByMonth(jobsToInclude);
    const tableBody: any[] = [];
    
    // Sort months chronologically
    const months = Object.keys(groupedJobs).sort((a: string, b: string) => {
      // Split into month and year components
      const [monthA, yearA] = a.split(" ");
      const [monthB, yearB] = b.split(" ");
      
      // Compare years first
      if (yearA !== yearB) {
        return parseInt(yearA) - parseInt(yearB);
      }
      
      // If years are the same, compare months
      const monthOrder: string[] = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
    });
    
    // Add job rows grouped by month
    months.forEach(month => {
      // Add month header row
      tableBody.push([{
        content: month,
        colSpan: tableColumns.length,
        styles: {
          halign: "center",
          fontStyle: "bold",
          fillColor: [230, 230, 230],
        },
      } as TableRow]);
      
      // Add jobs for this month
      groupedJobs[month].forEach(job => {
        const [year, mm, dd] = job.dateOfJob.split("-").map(Number);
        const dateObj = new Date(year, mm - 1, dd);
        const dateFormatted = format(dateObj, "MMMM dd, yyyy");
        
        const jobType = jobTypes.find(jt => jt.jobTypeId == job.jobTypeId);
        const company = companies.find(c => c.companyId == jobType?.companyId);
        const jobAmount = calculateAmount(job, jobType).toFixed(2);
        
        if (jobAmount != "0.00") {
          // Handle tickets safely
          let ticketDisplay = '';
          try {
            ticketDisplay = Array.isArray(job.ticketIds) 
              ? job.ticketIds.join(", ") 
              : typeof job.ticketIds === 'string'
                ? JSON.parse(job.ticketIds).join(", ")
                : '';
          } catch (e) {
            ticketDisplay = String(job.ticketIds || '');
          }
          
          const jobRow = [
            dateFormatted,
            job.unitName,
            job.driverName,
            company?.name,
            jobType?.dispatchType,
            `${jobType?.startLocation} to ${jobType?.endLocation}`,
            ticketDisplay,
            getHrsTonLoads(job, jobType),
            jobType?.rateOfJob ? `$${jobType.rateOfJob}` : "",
            jobAmount,
          ];
          
          tableBody.push(jobRow);
          
          // Add to subItems for record-keeping
          invoiceInfo.subItems.push({
            jobId: job.jobId,
            date: dateFormatted,
            unit: job.unitName,
            driver: job.driverName,
            customer: company?.name as string,
            jobType: jobType?.dispatchType as string,
            jobDescription: `${jobType?.startLocation} to ${jobType?.endLocation}`,
            tickets: Array.isArray(job.ticketIds) ? job.ticketIds : job.ticketIds,
            hrsTonLoads: getHrsTonLoads(job, jobType),
            rate: jobType ? `$${jobType.rateOfJob}` : "",
            amount: jobAmount,
          });
        }
      });
    });
    
    return { tableColumns, tableBody };
  };
  
  // Draw invoice details table
  const drawTable = (tableData: { 
    tableColumns: string[]; 
    tableBody: Array<any[]|{content: string; colSpan: number; styles: object}[]>; 
  }): void => {
    autoTable(doc, {
      startY: 150,
      head: [tableData.tableColumns],
      body: tableData.tableBody,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: 20,
        fontStyle: "bold",
      },
      margin: { left: 40, right: 40 },
    });
  };
  
  
  // Save invoice record via API
  fetch(`${API_URL}/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoiceInfo),
  })
    .then(res => res.json())
    .then(data => {
      console.log("Invoice saved:", data);
      Toast.success("Invoice generated and saved successfully");
      
      // Update invoices list with the new invoice
      setInvoices(prev => [data, ...prev]);
    })
    .catch(err => {
      console.error("Error saving invoice:", err);
      Toast.error("Error saving invoice record");
    });
  
  return invoiceInfo;
};

// Function to regenerate a PDF from an existing invoice
const regenerateInvoicePDF = (invoice: Invoice) => {
  // Create PDF document
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "legal",
  });
  
  // Draw header section
  const drawHeader = () => {
    const leftX = 40;
    let y = 40;
    
    // Company info (left side)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("5 Rivers Trucking Inc.", leftX, y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    y += 15; doc.text("140 Cherryhill Place", leftX, y);
    y += 15; doc.text("London, Ontario", leftX, y);
    y += 15; doc.text("N6H4M5", leftX, y);
    y += 15; doc.text("+1 (437) 679 9350", leftX, y);
    y += 15; doc.text("info@5riverstruckinginc.ca", leftX, y);
    y += 15; doc.text("HST #760059956", leftX, y);
    
    // Invoice info (right side)
    const rightX = 960;
    let yRight = 40;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("INVOICE", rightX, yRight, { align: "right" });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    
    yRight += 20; doc.text(invoice.invoiceNumber, rightX, yRight, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    yRight += 15; doc.text(`Invoice Date: ${invoice.invoiceDate}`, rightX, yRight, { align: "right" });
    yRight += 15; doc.text(`Billed To: ${invoice.billedTo}`, rightX, yRight, { align: "right" });
    yRight += 15; doc.text(invoice.billedEmail, rightX, yRight, { align: "right" });
  };
  
  // Prepare table data from subItems
  const prepareTableData = (): { 
    tableColumns: string[]; 
    tableBody: any[]; 
  } => {
    const tableColumns: string[] = [
      "Date", 
      "Unit", 
      "Driver", 
      "Customer", 
      "Type", 
      "Job Description", 
      "Tickets", 
      "HRS/TON/LOADS", 
      "Rate", 
      "Amount"
    ];
    
    // Group items by date (month)
    let groupedItems: Record<string, any[]> = {};
    
    if (Array.isArray(invoice.subItems)) {
      invoice.subItems.forEach(item => {
        // Extract month and year from date
        const dateParts = item.date.split(" ");
        const monthYear = `${dateParts[0]} ${dateParts[2]}`;
        
        if (!groupedItems[monthYear]) {
          groupedItems[monthYear] = [];
        }
        
        groupedItems[monthYear].push(item);
      });
    }
    
    // Sort and build table body
    const tableBody: any[] = [];
    
    // Sort months chronologically
    const months = Object.keys(groupedItems).sort((a: string, b: string) => {
      // Split into month and year components
      const [monthA, yearA] = a.split(" ");
      const [monthB, yearB] = b.split(" ");
      
      // Compare years first
      if (yearA !== yearB) {
        return parseInt(yearA) - parseInt(yearB);
      }
      
      // If years are the same, compare months
      const monthOrder: string[] = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
    });
    
    // Add items grouped by month
    months.forEach(month => {
      // Add month header row
      tableBody.push([{
        content: month,
        colSpan: tableColumns.length,
        styles: {
          halign: "center",
          fontStyle: "bold",
          fillColor: [230, 230, 230],
        },
      }]);
      
      // Add items for this month
      groupedItems[month].forEach(item => {
        // Handle tickets display safely
        let ticketsDisplay = '';
        try {
          if (Array.isArray(item.tickets)) {
            ticketsDisplay = item.tickets.join(", ");
          } else if (typeof item.tickets === 'string') {
            ticketsDisplay = item.tickets;
          } else if (item.tickets) {
            ticketsDisplay = JSON.stringify(item.tickets);
          }
        } catch (e) {
          ticketsDisplay = String(item.tickets || '');
        }
        
        const itemRow = [
          item.date,
          item.unit,
          item.driver,
          item.customer,
          item.jobType,
          item.jobDescription,
          ticketsDisplay,
          item.hrsTonLoads,
          item.rate,
          item.amount,
        ];
        
        tableBody.push(itemRow);
      });
    });
    
    return { tableColumns, tableBody };
  };
  
  // Draw invoice details table
  const drawTable = (tableData: { 
    tableColumns: string[]; 
    tableBody: any[]; 
  }): void => {
    autoTable(doc, {
      startY: 150,
      head: [tableData.tableColumns],
      body: tableData.tableBody,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: 20,
        fontStyle: "bold",
      },
      margin: { left: 40, right: 40 },
    });
  };
  
  // Draw summary section
  const drawSummary = () => {
    const finalY = (doc as any).lastAutoTable.finalY;
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Check if we need a new page for summary
    let summaryY = finalY + 30;
    if (summaryY + 60 > pageHeight) {
      doc.addPage();
      summaryY = 40;
    }
    
    const summaryXLabel = 790;
    const summaryXValue = 960;
    
    doc.setFont("helvetica", "bold");
    doc.text("SUBTOTAL", summaryXLabel, summaryY);
    doc.text(`$${invoice.subTotal.toFixed(2)}`, summaryXValue, summaryY, { align: "right" });
    
    if (invoice.dispatchPercent !== undefined) {
      summaryY += 15;
      doc.text(`DISPATCH ${invoice.dispatchPercent.toFixed(2)}%`, summaryXLabel, summaryY);
    }
    
    if (invoice.comm !== undefined) {
      summaryY += 15;
      doc.text("COMM.", summaryXLabel, summaryY);
      doc.text(`$${invoice.comm.toFixed(2)}`, summaryXValue, summaryY, { align: "right" });
    }
    
    if (invoice.hst !== undefined) {
      summaryY += 15;
      doc.text("HST", summaryXLabel, summaryY);
      doc.text(`$${invoice.hst.toFixed(2)}`, summaryXValue, summaryY, { align: "right" });
    }
    
    summaryY += 15;
    doc.text("TOTAL", summaryXLabel, summaryY);
    doc.text(`$${invoice.total.toFixed(2)}`, summaryXValue, summaryY, { align: "right" });
  };
  
  // Execute PDF generation steps
  drawHeader();
  const tableData = prepareTableData();
  drawTable(tableData);
  drawSummary();
  
  // Save PDF
  doc.save(`${invoice.invoiceNumber}.pdf`);
};

// Configure react-modal
Modal.setAppElement('body'); // Set app element for accessibility

export default function InvoiceManagementPage() {
  // Active tab state
  const [tabIndex, setTabIndex] = useState(0);
  
  // State for invoice details modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  
  // Fetch data using custom hook
  const { 
    jobs, 
    jobTypes, 
    dispatchers, 
    companies, 
    drivers, 
    units, 
    invoices,
    setInvoices,
    loading, 
    error 
  } = useInvoiceData();
  
  // State for job selection and filters
  const [selectedJobs, setSelectedJobs] = useState<Record<string, boolean>>({});
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [selectedDispatcher, setSelectedDispatcher] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  
  // Filter jobs based on selected criteria
  const filteredJobs = useMemo(() => {
    const filtered = jobs.filter(job => {
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
      const jobType = jobTypes.find(jt => jt.jobTypeId === job.jobTypeId);
      if (selectedCompany && jobType) {
        matchesCompany = jobType.companyId === selectedCompany;
      }
      
      const matchesUnit = selectedUnit 
        ? job.unitId === selectedUnit 
        : true;
        
      return (
        matchesStartDate &&
        matchesEndDate &&
        matchesDispatcher &&
        matchesCompany &&
        matchesUnit
      );
    });

    // Sort by date (chronological)
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
  
  // Handle job selection toggle
  const handleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => ({
      ...prev,
      [jobId]: !prev[jobId],
    }));
  };
  
  // Handle select/deselect all
  const handleSelectAll = (select: boolean) => {
    const newSelected: Record<string, boolean> = {};
    if (select) {
      filteredJobs.forEach(job => {
        newSelected[job.jobId] = true;
      });
    }
    setSelectedJobs(newSelected);
  };
  
  // Generate PDF invoice
  const handleGeneratePDF = () => {
    generateInvoicePDF(
      selectedJobs,
      filteredJobs,
      jobTypes,
      dispatchers,
      companies,
      units,
      selectedDispatcher,
      selectedUnit,
      selectedStartDate,
      selectedEndDate,
      setInvoices
    );
  };
  
  // View invoice details
  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };
  
  // Download existing invoice
  const handleDownloadInvoice = (invoice: Invoice) => {
    regenerateInvoicePDF(invoice);
  };

  // Handle invoice deletion
const handleDeleteInvoice = (invoice: Invoice) => {
  setInvoiceToDelete(invoice);
  setIsDeleteModalOpen(true);
};

// Confirm invoice deletion
const confirmDeleteInvoice = async () => {
  if (!invoiceToDelete) return;
  
  try {
    const response = await fetch(`${API_URL}/invoices/${invoiceToDelete.invoiceId}`, {
      method: "DELETE",
    });
    
    if (response.ok) {
      setInvoices(prev => prev.filter(inv => inv.invoiceId !== invoiceToDelete.invoiceId));
      Toast.success("Invoice deleted successfully");
    } else {
      Toast.error("Failed to delete invoice");
    }
  } catch (error) {
    console.error("Error deleting invoice:", error);
    Toast.error("Error deleting invoice");
  } finally {
    setIsDeleteModalOpen(false);
    setInvoiceToDelete(null);
  }
};
  
  // Reset all filters
  const handleResetFilters = () => {
    setSelectedStartDate("");
    setSelectedEndDate("");
    setSelectedDispatcher("");
    setSelectedCompany("");
    setSelectedUnit("");
    setSelectedJobs({});
  };
  
  // Modal close handler
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedInvoice(null);
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <EmptyState
          title="Error Loading Data"
          description={error}
          icon={<ExclamationCircleIcon className="w-12 h-12" />}
          action={
            <Button 
              variant="primary"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          }
        />
      </div>
    );
  }
  
  // Count selected jobs
  const selectedJobsCount = Object.values(selectedJobs).filter(Boolean).length;
  
  // Modal styles for react-modal
  const modalStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: '80%',
      maxHeight: '90%',
      padding: 0,
      border: 'none',
      borderRadius: '0.5rem',
      overflow: 'auto',
    },
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Invoice Management</title>
      </Head>
      
      <div className="container mx-auto p-6">
        <PageHeader 
          title="Invoice Management"
          icon={<DocumentTextIcon className="w-6 h-6" />}
        />
        
        <Tabs selectedIndex={tabIndex} onSelect={index => setTabIndex(index)} className="mb-6">
          <TabList className="flex border-b border-gray-200">
            <Tab 
              className={`py-4 px-6 font-medium text-sm focus:outline-none ${tabIndex === 0 ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Generate Invoice
            </Tab>
            <Tab 
              className={`py-4 px-6 font-medium text-sm focus:outline-none ${tabIndex === 1 ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              View Invoices
            </Tab>
          </TabList>
          
          <TabPanel>
            {/* Generate Invoice Tab Content */}
            <div className="py-4">
              {/* Filter Section */}
              <Card className="mb-8">
                <CollapsiblePanel title="Filters">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Input
                        type="date"
                        label="Start Date"
                        value={selectedStartDate}
                        onChange={e => setSelectedStartDate(e.target.value)}
                        fullWidth
                      />
                    </div>
                    <div>
                      <Input
                        type="date"
                        label="End Date"
                        value={selectedEndDate}
                        onChange={e => setSelectedEndDate(e.target.value)}
                        fullWidth
                      />
                    </div>
                    <div>
                      <Select
                        label="Dispatcher"
                        value={selectedDispatcher}
                        onChange={e => setSelectedDispatcher(e.target.value)}
                        options={[
                          { value: "", label: "All Dispatchers" },
                          ...dispatchers.map(d => ({ 
                            value: d.dispatcherId, 
                            label: d.name 
                          }))
                        ]}
                        fullWidth
                      />
                    </div>
                    <div>
                      <Select
                        label="Company"
                        value={selectedCompany}
                        onChange={e => setSelectedCompany(e.target.value)}
                        options={[
                          { value: "", label: "All Companies" },
                          ...companies.map(c => ({ 
                            value: c.companyId, 
                            label: c.name 
                          }))
                        ]}
                        fullWidth
                      />
                    </div>
                    <div>
                      <Select
                        label="Unit"
                        value={selectedUnit}
                        onChange={e => setSelectedUnit(e.target.value)}
                        options={[
                          { value: "", label: "All Units" },
                          ...units.map(u => ({ 
                            value: u.unitId, 
                            label: u.name 
                          }))
                        ]}
                        fullWidth
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        variant="secondary"
                        onClick={handleResetFilters}
                        fullWidth
                      >
                        <XCircleIcon className="w-5 h-5 mr-2" />
                        Reset Filters
                      </Button>
                    </div>
                  </div>
                </CollapsiblePanel>
              </Card>
              
              {/* Job Selection Table */}
              <Card className="mb-8 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <div className="flex items-center">
                    <Input
                      type="checkbox"
                      checked={filteredJobs.length > 0 && filteredJobs.every(job => selectedJobs[job.jobId])}
                      onChange={() => handleSelectAll(!filteredJobs.every(job => selectedJobs[job.jobId]))}
                      className="mr-2"
                    />
                    <span className="text-gray-700 font-medium">
                      Select All Jobs ({filteredJobs.length})
                    </span>
                  </div>
                  <div>
                    <span className="text-indigo-600 font-medium">
                      {selectedJobsCount} jobs selected
                    </span>
                  </div>
                </div>
                
                {filteredJobs.length > 0 ? (
                  <Table
                  headers={[
                    "Select",
                    "Date",
                    "Unit", 
                    "Driver",
                    "Customer",
                    "Type",
                    "Description",
                    "Tickets",
                    "HRS/TON/LOADS",
                    "Rate",
                    "Amount"
                  ]}
                  isLoading={loading}
                  emptyState={
                    <EmptyState
                      title="No matching jobs found"
                      description="Try adjusting your filters to see more results"
                      icon={<DocumentIcon className="w-12 h-12" />}
                    />
                  }
                >
                  {filteredJobs.map(job => {
                    const [year, month, day] = job.dateOfJob.split("-").map(Number);
                    const dateObj = new Date(year, month - 1, day);
                    const dateFormatted = format(dateObj, "MMM dd, yyyy");
                    
                    const jobType = jobTypes.find(jt => jt.jobTypeId === job.jobTypeId);
                    const company = companies.find(c => c.companyId === jobType?.companyId);
                    const amount = calculateAmount(job, jobType).toFixed(2);
                    
                    // Handle ticket IDs display safely
                    let ticketDisplay = '';
                    try {
                      ticketDisplay = Array.isArray(job.ticketIds) 
                        ? job.ticketIds.join(", ") 
                        : typeof job.ticketIds === 'string'
                          ? JSON.parse(job.ticketIds).join(", ")
                          : '';
                    } catch (e) {
                      ticketDisplay = String(job.ticketIds || '');
                    }
                    
                    return (
                      <tr 
                        key={job.jobId} 
                        className={selectedJobs[job.jobId] ? "bg-indigo-50" : "hover:bg-gray-50"}
                        onClick={() => handleJobSelection(job.jobId)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            type="checkbox"
                            checked={!!selectedJobs[job.jobId]}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleJobSelection(job.jobId);
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{dateFormatted}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{job.unitName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{job.driverName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{company?.name || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{jobType?.dispatchType || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {jobType ? `${jobType.startLocation} to ${jobType.endLocation}` : job.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{ticketDisplay}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getHrsTonLoads(job, jobType)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {jobType?.rateOfJob ? `$${jobType.rateOfJob}` : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">${amount}</td>
                      </tr>
                    );
                  })}
                </Table>
                ) : (
                  <EmptyState
                    title="No matching jobs found"
                    description="Try adjusting your filters to see more results"
                    icon={<DocumentIcon className="w-12 h-12" />}
                  />
                )}
              </Card>
              
              {/* PDF Generation Button - Only at bottom if many jobs are shown */}
              {filteredJobs.length > 5 && (
                <div className="flex justify-end mt-6">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleGeneratePDF}
                    disabled={selectedJobsCount === 0}
                  >
                    <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                    Generate Invoice PDF ({selectedJobsCount} jobs)
                  </Button>
                </div>
              )}
            </div>
          </TabPanel>
          
          <TabPanel>
            {/* View Invoices Tab Content */}
            <div className="py-4">
              <Card className="mb-8 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Generated Invoices</h3>
                  <p className="text-sm text-gray-500">View and download previously generated invoices</p>
                </div>
                
                {invoices.length > 0 ? (
                  <Table
                    headers={[
                      "Invoice Number",
                      "Date",
                      "Billed To",
                      "Subtotal",
                      "HST",
                      "Total",
                      "Actions"
                    ]}
                    isLoading={loading}
                    emptyState={
                      <EmptyState
                        title="No invoices found"
                        description="Generate an invoice first"
                        icon={<DocumentIcon className="w-12 h-12" />}
                      />
                    }
                  >
                    {invoices.map(invoice => {
                      // Parse date string if needed
                      let dateStr = invoice.invoiceDate;
                      if (dateStr.includes("-")) {
                        try {
                          dateStr = format(parseISO(dateStr), "MMMM dd, yyyy");
                        } catch (e) {
                          // Keep original date string if parsing fails
                        }
                      }
                      
                      return (
                        <tr key={invoice.invoiceId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium">{invoice.invoiceNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{dateStr}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{invoice.billedTo}</td>
                          <td className="px-6 py-4 whitespace-nowrap">${invoice.subTotal.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">${invoice.hst?.toFixed(2) || "0.00"}</td>
                          <td className="px-6 py-4 whitespace-nowrap">${invoice.total.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleViewInvoice(invoice)}
                              >
                                <ViewfinderCircleIcon className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDownloadInvoice(invoice)}
                              >
                                <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                              <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDeleteInvoice(invoice)}
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Table>
                ) : (
                  <EmptyState
                    title="No invoices found"
                    description="Generate an invoice first"
                    icon={<DocumentIcon className="w-12 h-12" />}
                  />
                )}
              </Card>
            </div>
          </TabPanel>
        </Tabs>
      </div>
      
      {/* Invoice Details Modal using react-modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        style={modalStyles}
        contentLabel="Invoice Details"
      >
        {selectedInvoice && (
          <div>
            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{selectedInvoice.invoiceNumber}</h3>
                <button
                  type="button"
                  className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={closeModal}
                >
                  <span className="sr-only">Close</span>
                  <XCircleIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="px-6 py-4">
              <div className="space-y-6">
                {/* Invoice Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Invoice Details</h3>
                    <p className="mt-1 text-lg font-semibold">{selectedInvoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">
                      Date: {selectedInvoice.invoiceDate}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Billed To</h3>
                    <p className="mt-1 text-lg font-semibold">{selectedInvoice.billedTo}</p>
                    <p className="text-sm text-gray-500">{selectedInvoice.billedEmail}</p>
                  </div>
                </div>
                
                {/* Invoice Line Items */}
                <div className="overflow-x-auto">
                  <h3 className="text-md font-medium mb-2">Line Items</h3>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hrs/Ton/Loads</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedInvoice.subItems && selectedInvoice.subItems.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{item.date}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{item.unit}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{item.driver}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{item.customer}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{item.jobDescription}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{item.hrsTonLoads}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{item.rate}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                            ${typeof item.amount === 'number' ? item.amount.toFixed(2) : item.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Invoice Summary */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-end">
                    <div className="w-72">
                      <div className="flex justify-between py-2">
                        <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                        <span className="text-sm font-medium text-gray-900">${selectedInvoice.subTotal.toFixed(2)}</span>
                      </div>
                      {selectedInvoice.dispatchPercent !== undefined && (
                        <div className="flex justify-between py-2">
                          <span className="text-sm font-medium text-gray-700">
                            Dispatch ({selectedInvoice.dispatchPercent.toFixed(2)}%):
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            ${selectedInvoice.comm?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                      )}
                      {selectedInvoice.hst !== undefined && (
                        <div className="flex justify-between py-2">
                          <span className="text-sm font-medium text-gray-700">HST (13%):</span>
                          <span className="text-sm font-medium text-gray-900">
                            ${selectedInvoice.hst.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 border-t border-gray-200 font-bold">
                        <span className="text-sm">Total:</span>
                        <span className="text-sm">${selectedInvoice.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="secondary"
                    onClick={closeModal}
                  >
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleDownloadInvoice(selectedInvoice)}
                  >
                    <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onRequestClose={() => setIsDeleteModalOpen(false)}
        style={modalStyles}
        contentLabel="Confirm Delete"
      >
        <div>
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
              <button
                type="button"
                className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                <span className="sr-only">Close</span>
                <XCircleIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>
          
          <div className="px-6 py-4">
            <p className="mb-4">Are you sure you want to delete invoice <strong>{invoiceToDelete?.invoiceNumber}</strong>?</p>
            <p className="mb-6 text-red-600">This action cannot be undone.</p>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDeleteInvoice}
              >
                Delete Invoice
              </Button>
            </div>
          </div>
        </div>
      </Modal>      
      {/* Toast container for notifications */}
      <ToastProvider />
    </div>
  );
}