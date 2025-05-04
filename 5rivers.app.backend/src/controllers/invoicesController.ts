// controllers/invoicesController.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { dispatcher: true, invoiceLines: true, jobs: true },
    });
    res.json(invoices);
  } catch (error) {
    console.error('Error in getInvoices:', error);
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
    console.error('Error in getInvoiceById:', error);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  /*
    Expects req.body to contain:
    - invoiceDate
    - invoiceNumber
    - billedTo
    - billedEmail
    - dispatchPercent (optional, will use dispatcher default if not provided)
    - jobIds: string[]
  */
  try {
    const {
      invoiceDate,
      invoiceNumber,
      billedTo,
      billedEmail,
      dispatchPercent,
      jobIds,
    } = req.body;
    // Fetch jobs
    const jobs = await prisma.job.findMany({
      where: { jobId: { in: jobIds }, invoiceId: null },
      include: { dispatcher: true },
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
        invoiceDate: new Date(invoiceDate),
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
    console.error('Error in createInvoice:', err);
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
    - billedEmail
    - dispatchPercent (optional)
    - jobIds: string[]
  */
  try {
    const { id } = req.params;
    const {
      invoiceDate,
      invoiceNumber,
      billedTo,
      billedEmail,
      dispatchPercent,
      jobIds,
    } = req.body;
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
    // Use dispatchPercent from body or dispatcher
    const percent =
      dispatchPercent !== undefined
        ? Number(dispatchPercent)
        : dispatcher.commissionPercent;
    const commission = subTotal * (percent / 100);
    const hst = (subTotal + commission) * 0.13; // 13% HST
    const total = subTotal + commission + hst;
    // Update invoice
    const invoice = await prisma.invoice.update({
      where: { invoiceId: id },
      data: {
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        dispatcherId,
        status: "Pending",
        subTotal,
        dispatchPercent: percent,
        commission,
        hst,
        total,
        billedTo,
        billedEmail,
        // Remove all previous invoiceLines and jobs, then add new ones
        invoiceLines: {
          deleteMany: {},
          create: jobs.map((job) => ({
            jobId: job.jobId,
            lineAmount: job.jobGrossAmount || 0,
          })),
        },
        jobs: {
          set: jobs.map((job) => ({ jobId: job.jobId })),
        },
      },
      include: { dispatcher: true, invoiceLines: true, jobs: true },
    });
    // Update jobs to reference invoiceId
    await prisma.job.updateMany({
      where: { jobId: { in: jobIds } },
      data: { invoiceId: invoice.invoiceId, invoiceStatus: "Invoiced" },
    });
    res.json(invoice);
  } catch (err: any) {
    console.error('Error in updateInvoice:', err);
    res.status(400).json({
      error: "Failed to update invoice",
      details: err && err.message ? err.message : err,
    });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.invoice.delete({ where: { invoiceId: id } });
    res.json({ message: "Invoice deleted" });
  } catch (error) {
    console.error('Error in deleteInvoice:', error);
    res.status(400).json({ error: "Failed to delete invoice" });
  }
};
