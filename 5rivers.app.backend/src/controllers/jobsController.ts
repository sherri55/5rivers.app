// controllers/jobsController.ts
import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

export const getJobs = async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.job.findMany({
      include: {
        driver: true,
        jobType: true,
        unit: true,
        dispatcher: true,
        tickets: true,
        invoiceLines: true,
        invoice: true,
      },
    });
    res.json(jobs);
  } catch (error) {
     
    console.error('Error in getJobs:', error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
};

export const getJobById = async (req: Request, res: Response) => {
  try {
    const job = await prisma.job.findUnique({
      where: { jobId: req.params.id },
      include: {
        driver: true,
        jobType: true,
        unit: true,
        dispatcher: true,
        tickets: true,
        invoiceLines: true,
        invoice: true,
      },
    });
    res.json(job);
  } catch (error) {
     
    console.error('Error in getJobById:', error);
    res.status(500).json({ error: "Failed to fetch job" });
  }
};

export const createJob = async (req: Request, res: Response) => {
  try {
    const jobDate = req.body.jobDate ? new Date(req.body.jobDate) : new Date();
    // Build JobCreateInput object
    const data: Prisma.JobCreateInput = {
      jobDate,
      jobGrossAmount: req.body.jobGrossAmount ? Number(req.body.jobGrossAmount) : null,
      jobType: req.body.jobTypeId ? { connect: { jobTypeId: req.body.jobTypeId } } : undefined,
      driver: req.body.driverId ? { connect: { driverId: req.body.driverId } } : undefined,
      dispatcher: req.body.dispatcherId ? { connect: { dispatcherId: req.body.dispatcherId } } : undefined,
      unit: req.body.unitId ? { connect: { unitId: req.body.unitId } } : undefined,
      invoice: req.body.invoiceId ? { connect: { invoiceId: req.body.invoiceId } } : undefined,
      invoiceStatus: req.body.invoiceStatus || "Pending",
      weight: req.body.weight ? JSON.stringify(req.body.weight) : null,
      loads: req.body.loads ? Number(req.body.loads) : null,
      startTime: req.body.startTime || null,
      endTime: req.body.endTime || null,
      // createdAt and updatedAt are set automatically
    };
    const job = await prisma.job.create({ data });
    res.status(201).json(job);
  } catch (error) {
     
    console.error('Error in createJob:', error);
    res.status(400).json({ error: "Failed to create job" });
  }
};

export const updateJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const jobDate = req.body.jobDate ? new Date(req.body.jobDate) : new Date();
    const data = {
      jobDate,
      jobGrossAmount: req.body.jobGrossAmount ? Number(req.body.jobGrossAmount) : undefined,
      jobTypeId: req.body.jobTypeId,
      driverId: req.body.driverId,
      dispatcherId: req.body.dispatcherId,
      unitId: req.body.unitId,
      invoiceId: req.body.invoiceId,
      invoiceStatus: req.body.invoiceStatus,
      weight: req.body.weight ? JSON.stringify(req.body.weight) : undefined,
      loads: req.body.loads ? Number(req.body.loads) : undefined,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
    };
    // Remove undefined fields in a type-safe way
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );
    const job = await prisma.job.update({ where: { jobId: id }, data: filteredData });
    res.json(job);
  } catch (error) {
     
    console.error('Error in updateJob:', error);
    res.status(400).json({ error: "Failed to update job" });
  }
};

export const deleteJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.job.delete({ where: { jobId: id } });
    res.json({ message: "Job deleted" });
  } catch (error) {
     
    console.error('Error in deleteJob:', error);
    res.status(400).json({ error: "Failed to delete job" });
  }
};
