// controllers/invoicesController.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import sharp from "sharp";
import fs from "fs";
import path from "path";
(pdfMake as any).vfs = pdfFonts.vfs;

// Helper to parse a YYYY-MM-DD string as a local date (no time zone shift)
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date('Invalid Date');
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const prisma = new PrismaClient();

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string;
    const dispatcherId = req.query.dispatcherId as string;
    const status = req.query.status as string;

    // Build where clause for filtering
    const where: any = {};
    
    if (dispatcherId) {
      where.dispatcherId = dispatcherId;
    }
    
    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { billedTo: { contains: search, mode: 'insensitive' } },
        { billedEmail: { contains: search, mode: 'insensitive' } },
        { dispatcher: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Get total count for pagination
    const total = await prisma.invoice.count({ where });

    // Fetch invoices with pagination
    const invoices = await prisma.invoice.findMany({
      where,
      include: { dispatcher: true, invoiceLines: true, jobs: true },
      orderBy: { invoiceDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    res.json({
      data: invoices,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error in getInvoices:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceId: req.params.id },
      include: { dispatcher: true, invoiceLines: true, jobs: true },
    });
    res.json(invoice);
  } catch (error) {
    console.error("Error in getInvoiceById:", error);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  /*
    Expects req.body to contain:
    - invoiceDate
    - invoiceNumber (optional)
    - billedTo (optional)
    - billedEmail (optional)
    - dispatchPercent (optional, will use dispatcher default if not provided)
    - jobIds: string[]
  */
  try {
    const invoiceDate = req.body.invoiceDate;
    let invoiceNumber = req.body.invoiceNumber;
    let billedTo = req.body.billedTo;
    let billedEmail = req.body.billedEmail;
    const dispatchPercent = req.body.dispatchPercent;
    const jobIds = req.body.jobIds;
    // Fetch jobs
    const jobs = await prisma.job.findMany({
      where: { jobId: { in: jobIds }, invoiceId: null },
      include: { dispatcher: true, unit: true },
    });
    if (jobs.length !== jobIds.length) {
      res
        .status(400)
        .json({ error: "Some jobs are invalid or already invoiced" });
      return;
    }
    // Ensure all jobs have the same dispatcher
    const dispatcherIds = [...new Set(jobs.map((j) => j.dispatcherId))];
    if (dispatcherIds.length !== 1) {
      res.status(400).json({ error: "All jobs must have the same dispatcher" });
      return;
    }
    const dispatcherId = dispatcherIds[0];
    const dispatcher = jobs[0].dispatcher;
    if (!dispatcherId || !dispatcher) {
      res
        .status(400)
        .json({ error: "Dispatcher not found for the selected jobs" });
      return;
    }
    // Auto-generate invoice number if not provided
    if (!invoiceNumber) {
      // Dispatcher initials
      const nameParts = dispatcher.name.split(/\s+/).filter(Boolean);
      const initials = nameParts.map((n: string) => n[0].toUpperCase()).join("");
      // Get all unique truck/unit numbers from jobs
      const unitNumbers = Array.from(new Set(jobs.map((job) => job.unit?.name || job.unitId || job.unit || "")));
      let truckPart = "MUL";
      if (unitNumbers.length === 1 && unitNumbers[0]) {
        const match = unitNumbers[0].toString().match(/\d+/);
        truckPart = match ? match[0] : "MUL";
      }
      // Get all job dates, sort ascending
      const jobDates = jobs.map((job) => parseLocalDate(job.jobDate)).filter((d) => !isNaN(d.getTime()));
      jobDates.sort((a, b) => a.getTime() - b.getTime());
      const formatYYMMDD = (date: Date) => {
        const y = String(date.getFullYear()).slice(-2);
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}${m}${d}`;
      };
      const firstDate = jobDates[0] ? formatYYMMDD(jobDates[0]) : "";
      const lastDate = jobDates[jobDates.length - 1] ? formatYYMMDD(jobDates[jobDates.length - 1]) : "";
      invoiceNumber = `INV-${initials}-${truckPart}-${firstDate}-${lastDate}`;
    }
    // Fill billedTo and billedEmail from dispatcher if not provided
    if (!billedTo) billedTo = dispatcher.name;
    if (!billedEmail) billedEmail = dispatcher.email;
    // Calculate subTotal
    const subTotal = jobs.reduce(
      (sum, job) => sum + (job.jobGrossAmount || 0),
      0
    );
    // Use dispatchPercent from body or dispatcher
    const percent =
      dispatchPercent !== undefined
        ? Number(dispatchPercent)
        : dispatcher.commissionPercent;
    const commission = subTotal * (percent / 100);
    const hst = (subTotal + commission) * 0.13; // 13% HST
    const total = subTotal + commission + hst;
    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceDate: parseLocalDate(invoiceDate),
        dispatcherId,
        status: "Pending",
        subTotal,
        dispatchPercent: percent,
        commission,
        hst,
        total,
        billedTo,
        billedEmail,
        invoiceLines: {
          create: jobs.map((job) => ({
            jobId: job.jobId,
            lineAmount: job.jobGrossAmount || 0,
          })),
        },
        jobs: {
          connect: jobs.map((job) => ({ jobId: job.jobId })),
        },
      },
      include: { dispatcher: true, invoiceLines: true, jobs: true },
    });
    // Update jobs to reference invoiceId
    await prisma.job.updateMany({
      where: { jobId: { in: jobIds } },
      data: { invoiceId: invoice.invoiceId, invoiceStatus: "Invoiced" },
    });
    res.status(201).json(invoice);
  } catch (err: any) {
    console.error("Error in createInvoice:", err);
    res.status(400).json({
      error: "Failed to create invoice",
      details: err && err.message ? err.message : err,
    });
  }
};

export const updateInvoice = async (req: Request, res: Response) => {
  /*
    Expects req.body to contain:
    - invoiceDate
    - invoiceNumber
    - billedTo
    - billedEmailz
    - dispatchPercent (optional)
    - jobIds: string[] (optional)
    - status (optional)
  */
  try {
    const { id } = req.params;
    // Fetch current invoice and jobs
    const currentInvoice = await prisma.invoice.findUnique({
      where: { invoiceId: id },
      include: { jobs: true },
    });
    if (!currentInvoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    // Use existing values if not provided
    const invoiceDate = req.body.invoiceDate ?? currentInvoice.invoiceDate;
    const invoiceNumber =
      req.body.invoiceNumber ?? currentInvoice.invoiceNumber;
    const billedTo = req.body.billedTo ?? currentInvoice.billedTo;
    const billedEmail = req.body.billedEmail ?? currentInvoice.billedEmail;
    const dispatchPercent =
      req.body.dispatchPercent ?? currentInvoice.dispatchPercent;
    const status = req.body.status ?? currentInvoice.status;
    const jobIds = req.body.jobIds ?? currentInvoice.jobs.map((j) => j.jobId);
    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      res.status(400).json({ error: "No jobs provided for invoice" });
      return;
    }
    // Fetch jobs
    const jobs = await prisma.job.findMany({
      where: { jobId: { in: jobIds } },
      include: { dispatcher: true },
    });
    if (jobs.length !== jobIds.length) {
      res.status(400).json({ error: "Some jobs are invalid" });
      return;
    }
    // Ensure all jobs have the same dispatcher
    const dispatcherIds = [...new Set(jobs.map((j) => j.dispatcherId))];
    if (dispatcherIds.length !== 1) {
      res.status(400).json({ error: "All jobs must have the same dispatcher" });
      return;
    }
    const dispatcherId = dispatcherIds[0];
    const dispatcher = jobs[0].dispatcher;
    if (!dispatcherId || !dispatcher) {
      res
        .status(400)
        .json({ error: "Dispatcher not found for the selected jobs" });
      return;
    }
    // Calculate subTotal
    const subTotal = jobs.reduce(
      (sum, job) => sum + (job.jobGrossAmount || 0),
      0
    );
    const percent =
      dispatchPercent !== undefined
        ? Number(dispatchPercent)
        : dispatcher.commissionPercent;
    const commission = subTotal * (percent / 100);
    const hst = (subTotal + commission) * 0.13;
    const total = subTotal + commission + hst;
    // Update invoice
    const invoice = await prisma.invoice.update({
      where: { invoiceId: id },
      data: {
        invoiceNumber,
        invoiceDate: parseLocalDate(invoiceDate),
        dispatcherId,
        status,
        subTotal,
        dispatchPercent: percent,
        commission,
        hst,
        total,
        billedTo,
        billedEmail,
        invoiceLines: {
          deleteMany: {},
          create: jobs.map((job) => ({
            jobId: job.jobId,
            lineAmount: job.jobGrossAmount || 0,
          })),
        },
        jobs: { set: jobs.map((job) => ({ jobId: job.jobId })) },
      },
      include: { dispatcher: true, invoiceLines: true, jobs: true },
    });
    // Only update jobs' invoiceStatus if status was provided
    if (req.body.status !== undefined) {
      await prisma.job.updateMany({
        where: { jobId: { in: jobIds } },
        data: { invoiceId: invoice.invoiceId, invoiceStatus: status },
      });
    } else {
      await prisma.job.updateMany({
        where: { jobId: { in: jobIds } },
        data: { invoiceId: invoice.invoiceId },
      });
    }
    res.json(invoice);
  } catch (err: any) {
    console.error("Error in updateInvoice:", err);
    res.status(400).json({
      error: "Failed to update invoice",
      details: err && err.message ? err.message : err,
    });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Remove invoiceId from jobs and set status to Pending
    await prisma.job.updateMany({
      where: { invoiceId: id },
      data: { invoiceId: null, invoiceStatus: "Pending" },
    });
    // Delete invoice lines
    await prisma.invoiceLine.deleteMany({ where: { invoiceId: id } });
    // Double-check: Are there any invoice lines left?
    const remainingLines = await prisma.invoiceLine.count({
      where: { invoiceId: id },
    });
    if (remainingLines > 0) {
      throw new Error(
        "Could not delete all invoice lines. Aborting invoice delete."
      );
    }
    // Delete invoice
    await prisma.invoice.delete({ where: { invoiceId: id } });
    res.json({ message: "Invoice deleted" });
  } catch (error: any) {
    console.error("Error in deleteInvoice:", error);
    res
      .status(400)
      .json({ error: "Failed to delete invoice", details: error.message });
  }
};

export const downloadInvoicePdf = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceId: id },
      include: {
        dispatcher: true,
        jobs: {
          include: {
            driver: true,
            unit: true,
            jobType: { include: { company: true } },
          },
        },
      },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    // Table header
    const tableHeader = [
      { text: "Date", style: "tableHeaderCell" },
      { text: "Unit", style: "tableHeaderCell" },
      { text: "Driver", style: "tableHeaderCell" },
      { text: "Customer", style: "tableHeaderCell" },
      { text: "Job Description", style: "tableHeaderCell" },
      { text: "Tickets", style: "tableHeaderCell" },
      { text: "HRS/TON/LOADS", style: "tableHeaderCell" },
      { text: "Rate", style: "tableHeaderCell" },
      { text: "Amount", style: "tableHeaderCell" },
    ];

    // Table rows (NO images in table)
    const tableRows = invoice.jobs.map((job: any) => {
      let value = "";
      const dispatchType =
        job.jobType?.dispatchType || job.jobType?.type || job.jobType?.title;
      if (dispatchType && typeof dispatchType === "string") {
        if (dispatchType.toLowerCase() === "hourly") {
          let hours = 0;
          if (job.startTime && job.endTime) {
            const [sh, sm] = job.startTime.split(":").map(Number);
            const [eh, em] = job.endTime.split(":").map(Number);
            const start = sh * 60 + sm;
            let end = eh * 60 + em;
            if (end < start) end += 24 * 60;
            hours = (end - start) / 60;
          } else if (job.hoursOfJob) {
            hours = job.hoursOfJob;
          }
          value = hours ? hours.toFixed(2) : "";
        } else if (dispatchType.toLowerCase() === "tonnage") {
          let tonnage = 0;
          let weights: number[] = [];
          if (Array.isArray(job.weight)) {
            weights = job.weight.map((w: any) => parseFloat(w) || 0);
          } else if (typeof job.weight === "string") {
            try {
              const arr = JSON.parse(job.weight);
              if (Array.isArray(arr)) {
                weights = arr.map((w) => parseFloat(w) || 0);
              } else {
                weights = [parseFloat(arr) || 0];
              }
            } catch {
              weights = [parseFloat(job.weight) || 0];
            }
          }
          tonnage = weights.reduce((sum, w) => sum + w, 0);
          value = tonnage ? tonnage.toFixed(2) : "";
        } else if (["load", "loads"].includes(dispatchType.toLowerCase())) {
          value = job.loads ? job.loads.toString() : "";
        } else if (dispatchType.toLowerCase() === "fixed") {
          value = "1";
        }
      }
      return [
        {
          text: job.jobDate ? parseLocalDate(job.jobDate).toLocaleDateString() : "",
          style: "tableCell",
        },
        { text: job.unit?.name || "", style: "tableCell" },
        { text: job.driver?.name || "", style: "tableCell" },
        { text: job.jobType?.company?.name || "", style: "tableCell" },
        {
          text:
            job.jobType?.startLocation && job.jobType?.endLocation
              ? `${job.jobType.startLocation} to ${job.jobType.endLocation}`
              : "",
          style: "tableCell",
        },
        {
          text: (() => {
            if (!job.ticketIds) return "";
            let arr = job.ticketIds;
            if (typeof arr === "string") {
              try { arr = JSON.parse(arr); } catch { /* ignore */ }
            }
            return Array.isArray(arr) ? arr.join(", ") : arr;
          })(),
          style: "tableCell",
        },
        { text: value, style: "tableCell" },
        {
          text: job.jobType?.rateOfJob ? `$${job.jobType.rateOfJob}` : "",
          style: "tableCell",
        },
        { text: job.jobGrossAmount?.toFixed(2) || "", style: "tableCell" },
      ];
    });

    // --- Build PDF content ---
    const content: any[] = [
      {
        columns: [
          [
            { text: "5 Rivers Trucking Inc.", style: "companyName" },
            {
              text: "140 Cherryhill Place\nLondon, Ontario\nN6H4M5\n+1 (437) 679 9350\ninfo@5riverstruckinginc.ca\nHST #760059956",
              style: "companyInfo",
              margin: [0, 0, 0, 20],
            },
          ],
          [
            { text: "INVOICE", style: "invoiceTitle", alignment: "right" },
            {
              text: `${
                invoice.invoiceNumber
              }\nInvoice Date: ${invoice.invoiceDate.toLocaleDateString()}\nBilled To: ${
                invoice.billedTo
              }\n${invoice.billedEmail}`,
              alignment: "right",
              style: "invoiceInfo",
              margin: [0, 10, 0, 0],
            },
          ],
        ],
        columnGap: 40,
        margin: [0, 0, 0, 30],
      },
      {
        style: "mainTable",
        table: {
          headerRows: 1,
          widths: [
            "auto",
            "auto",
            "auto",
            "auto",
            "*",
            "auto",
            "auto",
            "auto",
            "auto",
          ],
          body: [
            tableHeader,
            ...tableRows,
            [
              { text: "", colSpan: 8, border: [false, false, false, false] },
              {},
              {},
              {},
              {},
              {},
              {},
              {
                text: "SUBTOTAL",
                style: "totalsLabel",
                alignment: "right",
                border: [false, true, false, false],
              },
              {
                text: `$${Number(invoice.subTotal).toFixed(2)}`,
                style: "totalsValue",
                alignment: "right",
                border: [false, true, false, false],
              },
            ],
            [
              { text: "", colSpan: 8, border: [false, false, false, false] },
              {},
              {},
              {},
              {},
              {},
              {},
              {
                text: `DISPATCH ${
                  invoice.dispatchPercent?.toFixed(2) || ""
                }%`,
                style: "totalsLabel",
                alignment: "right",
                border: [false, false, false, false],
              },
              {
                text: `$${Number(invoice.commission).toFixed(2)}`,
                style: "totalsValue",
                alignment: "right",
                border: [false, false, false, false],
              },
            ],
            [
              { text: "", colSpan: 8, border: [false, false, false, false] },
              {},
              {},
              {},
              {},
              {},
              {},
              {
                text: "COMM.",
                style: "totalsLabel",
                alignment: "right",
                border: [false, false, false, false],
              },
              {
                text: `$${Number(invoice.commission).toFixed(2)}`,
                style: "totalsValue",
                alignment: "right",
                border: [false, false, false, false],
              },
            ],
            [
              { text: "", colSpan: 8, border: [false, false, false, false] },
              {},
              {},
              {},
              {},
              {},
              {},
              {
                text: "HST",
                style: "totalsLabel",
                alignment: "right",
                border: [false, false, false, false],
              },
              {
                text: `$${Number(invoice.hst).toFixed(2)}`,
                style: "totalsValue",
                alignment: "right",
                border: [false, false, false, false],
              },
            ],
            [
              { text: "", colSpan: 8, border: [false, false, false, false] },
              {},
              {},
              {},
              {},
              {},
              {},
              {
                text: "TOTAL",
                style: "totalsLabelBold",
                alignment: "right",
                border: [false, true, false, false],
              },
              {
                text: `$${Number(invoice.total).toFixed(2)}`,
                style: "totalsValueBold",
                alignment: "right",
                border: [false, true, false, false],
              },
            ],
          ],
        },
        layout: {
          fillColor: function (rowIndex: number) {
            return rowIndex === 0 ? "#f2f2f2" : null;
          },
          hLineWidth: function (i: number) {
            return i === 1 ? 2 : 0.5;
          },
          vLineWidth: function () {
            return 0.5;
          },
          hLineColor: function (i: number) {
            return i === 1 ? "#222" : "#aaa";
          },
          vLineColor: function () {
            return "#aaa";
          },
          paddingLeft: function () {
            return 6;
          },
          paddingRight: function () {
            return 6;
          },
          paddingTop: function () {
            return 4;
          },
          paddingBottom: function () {
            return 4;
          },
        },
        margin: [0, 0, 0, 30],
      },
    ];

    // --- Add a single 'Tickets' page after the table, then all job images (no page breaks) ---
    let allImageEntries: { absPath: string }[] = [];
    for (const job of invoice.jobs) {
      let imageUrls: string[] = [];
      if (job.imageUrls) {
        if (typeof job.imageUrls === "string") {
          try {
            imageUrls = JSON.parse(job.imageUrls);
          } catch {
            imageUrls = [];
          }
        } else if (Array.isArray(job.imageUrls)) {
          imageUrls = job.imageUrls;
        }
      }
      for (const imgRelPath of imageUrls) {
        const absPath = path.join(
          __dirname,
          "../../../5rivers.app.frontend/public",
          imgRelPath.replace(/^\/+/, "")
        );
        if (fs.existsSync(absPath)) {
          allImageEntries.push({ absPath });
        }
      }
    }
    if (allImageEntries.length > 0) {
      // Add 'Tickets' page only if not already at top (pdfmake will handle this)
      content.push({
        text: "Tickets",
        fontSize: 40,
        bold: true,
        alignment: "center",
        pageBreak: "before",
        margin: [0, 200, 0, 0],
      });
      for (let i = 0; i < allImageEntries.length; i++) {
        const { absPath } = allImageEntries[i];
        try {
          const metadata = await sharp(absPath).metadata();
          let resizeOptions;
          if (metadata.width && metadata.height) {
            if (metadata.height > metadata.width) {
              // Portrait: fit height
              resizeOptions = { height: 500 };
            } else {
              // Landscape: fit width
              resizeOptions = { width: 700 };
            }
          } else {
            // Fallback
            resizeOptions = { width: 700 };
          }
          const resized = await sharp(absPath)
            .resize(resizeOptions)
            .jpeg({ quality: 80 })
            .toBuffer();
          const base64 = resized.toString("base64");
          content.push({
            image: `data:image/jpeg;base64,${base64}`,
            width: resizeOptions.width || undefined,
            height: resizeOptions.height || undefined,
            alignment: "center",
            margin: [0, 20, 0, 20],
          });
        } catch {
          continue;
        }
      }
      // Remove any trailing empty content (pdfmake bug workaround)
      while (content.length > 0 && content[content.length - 1] && content[content.length - 1].text === "") {
        content.pop();
      }
    }

    const docDefinition = {
      pageOrientation: "landscape",
      pageMargins: [30, 60, 30, 60],
      content,
      styles: {
        companyName: { fontSize: 20, bold: true, margin: [0, 0, 0, 6] },
        companyInfo: { fontSize: 10, margin: [0, 0, 0, 10] },
        invoiceTitle: {
          fontSize: 18,
          bold: true,
          color: "#222",
          margin: [0, 0, 0, 10],
        },
        invoiceInfo: { fontSize: 11, margin: [0, 0, 0, 10] },
        mainTable: { margin: [0, 5, 0, 15] },
        tableHeaderCell: {
          bold: true,
          fontSize: 11,
          color: "black",
          fillColor: "#f2f2f2",
          alignment: "center",
        },
        tableCell: {
          fontSize: 10,
          color: "#222",
          alignment: "left",
          margin: [0, 2, 0, 2],
          noWrap: false,
        },
        totalsLabel: { fontSize: 11, alignment: "right", color: "#222" },
        totalsValue: { fontSize: 11, alignment: "right", color: "#222" },
        totalsLabelBold: {
          fontSize: 12,
          bold: true,
          alignment: "right",
          color: "#222",
        },
        totalsValueBold: {
          fontSize: 12,
          bold: true,
          alignment: "right",
          color: "#222",
        },
      },
      defaultStyle: {
        font: "Roboto",
      },
      fonts: {
        Roboto: {
          normal: "Roboto-Regular.ttf",
          bold: "Roboto-Medium.ttf",
          italics: "Roboto-Italic.ttf",
          bolditalics: "Roboto-MediumItalic.ttf",
        },
      },
    };

    const pdfDocGenerator = pdfMake.createPdf(docDefinition as any);
    pdfDocGenerator.getBuffer((buffer: Buffer) => {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice-${invoice.invoiceNumber || id}.pdf`
      );
      res.end(buffer);
    });
  } catch (err) {
    console.error("Error generating invoice PDF:", err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
};

export const getInvoiceJobs = async (req: Request, res: Response) => {
  /*
    Query params:
      - page (default 1)
      - pageSize (default 20)
      - dispatcherId (optional)
      - month (optional, 1-12)
      - year (optional, 4-digit)
  */
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const dispatcherId = req.query.dispatcherId as string | undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    // Build filter
    const where: any = { invoiceId: id };
    if (dispatcherId) where.dispatcherId = dispatcherId;
    if (month && year) {
      // Filter jobs by month/year
      where.jobDate = {
        gte: parseLocalDate(`${year}-${String(month).padStart(2, '0')}-01`),
        lt: parseLocalDate(`${year}-${String(month + 1).padStart(2, '0')}-01`),
      };
    } else if (year) {
      where.jobDate = {
        gte: parseLocalDate(`${year}-01-01`),
        lt: parseLocalDate(`${year + 1}-01-01`),
      };
    }

    // Count total jobs for pagination
    const total = await prisma.job.count({ where });

    // Fetch jobs, sorted reverse chronologically
    const jobs = await prisma.job.findMany({
      where,
      orderBy: { jobDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { driver: true, unit: true, jobType: true },
    });

    // Group jobs by month/year
    const grouped: Record<string, any[]> = {};
    jobs.forEach((job) => {
      const date = parseLocalDate(job.jobDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(job);
    });

    res.json({
      total,
      page,
      pageSize,
      groups: grouped,
    });
  } catch (err) {
    console.error('Error in getInvoiceJobs:', err);
    res.status(500).json({ error: 'Failed to fetch jobs for invoice' });
  }
};
