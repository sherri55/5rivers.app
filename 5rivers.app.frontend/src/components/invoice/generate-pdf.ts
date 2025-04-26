import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface Job {
  monthYear: string;
  dateOfJob: string;
  truckNumber: string;
  driver: string;
  customer: string;
  jobDescription: string;
  ticketIds: string[];
  jobType: string;
  hrsTonLoads: string;
  rate: number;
  amount: number;
}

// Helper: Group jobs by month (or monthYear)
function groupJobsByMonth(jobs: Job[]): Record<string, Job[]> {
  return jobs.reduce((acc, job) => {
    if (!acc[job.monthYear]) {
      acc[job.monthYear] = [];
    }
    acc[job.monthYear].push(job);
    return acc;
  }, {} as Record<string, Job[]>);
}

export function generateCustomInvoicePDF(jobs: Job[]) {
  // Create a new jsPDF instance (letter size)
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  // -------------------------------------------------------------
  // 1. HEADER – Company Info (Left) & Invoice Info (Right)
  // -------------------------------------------------------------
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
  doc.text("London, Ontario, N6H4M5", leftX, y);
  y += 15;
  doc.text("+1 (437) 679-9350", leftX, y);
  y += 15;
  doc.text("info@5riverstruckinginc.ca", leftX, y);
  y += 15;
  doc.text("HST #760059956", leftX, y);

  // Right-side Invoice Info (right-aligned)
  const rightX = 520;
  let yRight = 40;
  doc.setFont("helvetica", "bold");
  doc.text("Invoice # INV-FP-3112", rightX, yRight, { align: "right" });
  doc.setFont("helvetica", "normal");
  yRight += 15;
  doc.text("Invoice Date: January 22, 2025", rightX, yRight, {
    align: "right",
  });

  // -------------------------------------------------------------
  // 2. Billing Info ("Billed To")
  // -------------------------------------------------------------
  y += 30;
  doc.setFont("helvetica", "bold");
  doc.text("Billed To:", leftX, y);
  doc.setFont("helvetica", "normal");
  y += 15;
  doc.text("Farmer's Pride Haulage", leftX, y);
  y += 15;
  doc.text("accounting@farmerspride.ca", leftX, y);

  // -------------------------------------------------------------
  // 3. Build Table Data (Grouped by Month)
  // -------------------------------------------------------------
  const tableColumns = [
    "DATE",
    "TRUCK #",
    "DRIVER",
    "CUSTOMER",
    "JOB DESCRIPTION",
    "TICKET #",
    "JOB TYPE",
    "HRS/TON/LOADS",
    "RATE",
    "AMOUNT",
  ];

  // Assume jobs are enriched with a monthYear field (e.g., "December")
  const groupedJobs = groupJobsByMonth(jobs);
  const tableBody: any[] = [];
  // Get month names sorted as needed (here, we assume alphabetical order)
  const months = Object.keys(groupedJobs).sort();
  months.forEach((month) => {
    // Month header row (spanning all columns)
    tableBody.push([
      {
        content: month,
        colSpan: tableColumns.length,
        styles: {
          halign: "left",
          fontStyle: "bold",
          fillColor: [220, 220, 220],
        },
      },
    ]);
    // Add each job row for this month
    groupedJobs[month].forEach((job) => {
      tableBody.push([
        job.dateOfJob,
        job.truckNumber,
        job.driver,
        job.customer,
        job.jobDescription,
        job.ticketIds.join(", "),
        job.jobType,
        job.hrsTonLoads,
        job.rate,
        job.amount,
      ]);
    });
  });

  // -------------------------------------------------------------
  // 4. Draw the Table using autoTable
  // -------------------------------------------------------------
  const startY = 180; // Adjust to position table below header
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
    margin: { left: leftX, right: 40 },
  });

  // Get the final Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY;

  // -------------------------------------------------------------
  // 5. Summary Section (Subtotal, Dispatch %, Comm, HST, Total)
  // -------------------------------------------------------------
  const summaryXLabel = 400;
  const summaryXValue = 550;
  let summaryY = finalY + 30;
  doc.setFont("helvetica", "bold");
  doc.text("SUBTOTAL", summaryXLabel, summaryY);
  // Replace with your actual calculations
  const subTotal = 10508.45;
  doc.text(`$${subTotal.toFixed(2)}`, summaryXValue, summaryY, {
    align: "right",
  });
  summaryY += 15;
  doc.text("DISPATCH 5.00%", summaryXLabel, summaryY);
  // For example, assume COMM is calculated separately:
  const comm = 525.42;
  summaryY += 15;
  doc.text("COMM.", summaryXLabel, summaryY);
  doc.text(`$${comm.toFixed(2)}`, summaryXValue, summaryY, { align: "right" });
  summaryY += 15;
  const hst = 1366.1;
  doc.text("HST", summaryXLabel, summaryY);
  doc.text(`$${hst.toFixed(2)}`, summaryXValue, summaryY, { align: "right" });
  summaryY += 15;
  const total = 11349.13;
  doc.text("TOTAL", summaryXLabel, summaryY);
  doc.text(`$${total.toFixed(2)}`, summaryXValue, summaryY, { align: "right" });

  // -------------------------------------------------------------
  // 6. Footer – Additional Notes or Contact Info
  // -------------------------------------------------------------
  summaryY += 40;
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your business!", leftX, summaryY);
  summaryY += 15;
  doc.text("HST #760059956", leftX, summaryY);

  // -------------------------------------------------------------
  // 7. Save the PDF
  // -------------------------------------------------------------
  doc.save("invoice.pdf");
}
