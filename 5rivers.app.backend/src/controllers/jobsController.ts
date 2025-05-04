// controllers/jobsController.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
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
    const job = await prisma.job.create({
      data: {
        ...req.body,
        jobDate: new Date(req.body.jobDate),
      },
    });
    res.status(201).json(job);
  } catch (error) {
    console.error('Error in createJob:', error);
    res.status(400).json({ error: "Failed to create job" });
  }
};

export const updateJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await prisma.job.update({
      where: { jobId: id },
      data: req.body,
    });
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
