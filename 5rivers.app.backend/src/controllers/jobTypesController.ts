import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getJobTypes = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string;
    const companyId = req.query.companyId as string;
    const dispatchType = req.query.dispatchType as string;

    // Build where clause for filtering
    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { startLocation: { contains: search, mode: 'insensitive' } },
        { endLocation: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (companyId) {
      where.companyId = companyId;
    }
    
    if (dispatchType) {
      where.dispatchType = dispatchType;
    }

    // Get total count for pagination
    const total = await prisma.jobType.count({ where });

    // Fetch job types with pagination
    const jobTypes = await prisma.jobType.findMany({
      where,
      include: { company: true, jobs: true },
      orderBy: { title: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    res.json({
      data: jobTypes,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Error in getJobTypes:', error);
    res.status(500).json({ error: "Failed to fetch job types" });
  }
};

export const getJobTypeById = async (req: Request, res: Response) => {
  try {
    const jobType = await prisma.jobType.findUnique({
      where: { jobTypeId: req.params.id },
      include: { company: true, jobs: true },
    });
    res.json(jobType);
  } catch (error) {
    console.error('Error in getJobTypeById:', error);
    res.status(500).json({ error: "Failed to fetch job type" });
  }
};

export const createJobType = async (req: Request, res: Response) => {
  try {
    const {
      title,
      startLocation,
      endLocation,
      dispatchType,
      rateOfJob,
      companyId,
    } = req.body;
    const jobType = await prisma.jobType.create({
      data: {
        title,
        startLocation,
        endLocation,
        dispatchType,
        rateOfJob,
        companyId,
      },
    });
    res.status(201).json(jobType);
  } catch (error) {
    console.error('Error in createJobType:', error);
    res.status(400).json({ error: "Failed to create job type" });
  }
};

export const updateJobType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const jobType = await prisma.jobType.update({
      where: { jobTypeId: id },
      data: req.body,
    });
    res.json(jobType);
  } catch (error) {
    console.error('Error in updateJobType:', error);
    res.status(400).json({ error: "Failed to update job type" });
  }
};

export const deleteJobType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.jobType.delete({ where: { jobTypeId: id } });
    res.json({ message: "Job type deleted" });
  } catch (error) {
    console.error('Error in deleteJobType:', error);
    res.status(400).json({ error: "Failed to delete job type" });
  }
};
