// controllers/jobsController.ts
import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import path from "path";
import fs from "fs";
const prisma = new PrismaClient();

// Helper to save base64 images and return relative paths
async function saveBase64Images(
  base64Images: string[],
  jobId: string
): Promise<string[]> {
  const uploadDir = path.join(
    __dirname,
    "../../../5rivers.app.frontend/public/uploads/jobs"
  );
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const imagePaths: string[] = [];
  for (let i = 0; i < base64Images.length; i++) {
    const base64 = base64Images[i];
    const matches = base64.match(
      /^data:(image\/(png|jpeg|jpg|gif));base64,(.+)$/
    );
    if (!matches) continue;
    const ext = matches[2] === "jpeg" ? "jpg" : matches[2];
    const buffer = Buffer.from(matches[3], "base64");
    const filename = `job-${jobId}-${Date.now()}-${i}.${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    imagePaths.push(`/uploads/jobs/${filename}`);
  }
  return imagePaths;
}

// Helper to parse FormData fields (arrays/objects)
function parseMaybeJSON(val: any) {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

// Helper to normalize values to arrays
function normalizeToArray(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (val === undefined || val === null) return [];
  // If it's a string that looks like a JSON array, parse it
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
      if (parsed !== undefined && parsed !== null) return [parsed];
    } catch {
      // Not a JSON string, treat as single value
      return [val];
    }
  }
  // For numbers or other types
  return [val];
}

// Helper to save uploaded images and return relative paths
function saveUploadedImages(
  files: Express.Multer.File[],
  jobId: string
): string[] {
  if (!files || files.length === 0) return [];
  const uploadDir = path.join(
    __dirname,
    "../../../5rivers.app.frontend/public/uploads/jobs"
  );
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const imagePaths: string[] = [];
  files.forEach((file, i) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const filename = `job-${jobId}-${Date.now()}-${i}${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);
    imagePaths.push(`/uploads/jobs/${filename}`);
  });
  return imagePaths;
}

export const getJobs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string;
    const dispatcherId = req.query.dispatcherId as string;
    const unitId = req.query.unitId as string;
    const driverId = req.query.driverId as string;
    const status = req.query.status as string;

    // Build where clause for filtering
    const where: any = {};
    
    if (search) {
      where.OR = [
        { jobType: { title: { contains: search, mode: 'insensitive' } } },
        { driver: { name: { contains: search, mode: 'insensitive' } } },
        { unit: { name: { contains: search, mode: 'insensitive' } } },
        { dispatcher: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }
    
    if (dispatcherId) {
      where.dispatcherId = dispatcherId;
    }
    
    if (unitId) {
      where.unitId = unitId;
    }
    
    if (driverId) {
      where.driverId = driverId;
    }
    
    if (status) {
      where.invoiceStatus = status;
    }

    // Get total count for pagination
    const total = await prisma.job.count({ where });

    // Fetch jobs with pagination
    const jobs = await prisma.job.findMany({
      where,
      include: {
        driver: true,
        jobType: true,
        unit: true,
        dispatcher: true,
        invoiceLines: true,
        invoice: true,
      },
      orderBy: { jobDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    res.json({
      data: jobs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error in getJobs:", error);
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
        invoiceLines: true,
        invoice: true,
      },
    });
    res.json(job);
  } catch (error) {
    console.error("Error in getJobById:", error);
    res.status(500).json({ error: "Failed to fetch job" });
  }
};

export const createJob = async (req: Request, res: Response) => {
  try {
    const data: Prisma.JobCreateInput = {
      jobDate: req.body.jobDate,
      jobGrossAmount: req.body.jobGrossAmount
        ? Number(req.body.jobGrossAmount)
        : null,
      jobType: req.body.jobTypeId
        ? { connect: { jobTypeId: req.body.jobTypeId } }
        : undefined,
      driver: req.body.driverId
        ? { connect: { driverId: req.body.driverId } }
        : undefined,
      dispatcher: req.body.dispatcherId
        ? { connect: { dispatcherId: req.body.dispatcherId } }
        : undefined,
      unit: req.body.unitId
        ? { connect: { unitId: req.body.unitId } }
        : undefined,
      invoice: req.body.invoiceId
        ? { connect: { invoiceId: req.body.invoiceId } }
        : undefined,
      invoiceStatus: req.body.invoiceStatus || "Pending",
      weight: req.body.weight ? parseMaybeJSON(req.body.weight) : null,
      loads: req.body.loads ? Number(req.body.loads) : null,
      startTime: req.body.startTime || null,
      endTime: req.body.endTime || null,
      ticketIds: req.body.ticketIds
        ? JSON.stringify(normalizeToArray(req.body.ticketIds))
        : JSON.stringify([]),
      imageUrls: undefined, // handled below
    };
    const job = await prisma.job.create({ data });
    // Handle uploaded images
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const imageUrls = saveUploadedImages(
        req.files as Express.Multer.File[],
        job.jobId
      );
      await prisma.job.update({
        where: { jobId: job.jobId },
        data: { imageUrls: JSON.stringify(imageUrls) },
      });
      (job as any).imageUrls = imageUrls;
    }
    res.status(201).json(job);
  } catch (error) {
    console.error("Error in createJob:", error);
    res.status(400).json({ error: "Failed to create job" });
  }
};

export const updateJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: any = {
      jobDate: req.body.jobDate,
      jobGrossAmount: req.body.jobGrossAmount
        ? Number(req.body.jobGrossAmount)
        : undefined,
      jobTypeId: req.body.jobTypeId,
      driverId: req.body.driverId,
      dispatcherId: req.body.dispatcherId,
      unitId: req.body.unitId,
      invoiceId: req.body.invoiceId,
      invoiceStatus: req.body.invoiceStatus,
      weight: req.body.weight ? parseMaybeJSON(req.body.weight) : undefined,
      loads: req.body.loads ? Number(req.body.loads) : undefined,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      ticketIds: req.body.ticketIds
        ? JSON.stringify(normalizeToArray(req.body.ticketIds))
        : undefined,
      // imageUrls handled below
    };
    // Remove undefined fields
    Object.keys(data).forEach(
      (key) => data[key] === undefined && delete data[key]
    );
    // Handle uploaded images
    let imageUrls: string[] = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      imageUrls = saveUploadedImages(req.files as Express.Multer.File[], id);
      data.imageUrls = JSON.stringify(imageUrls);
    }
    const job = await prisma.job.update({
      where: { jobId: id },
      data,
    });
    if (imageUrls.length > 0) (job as any).imageUrls = imageUrls;
    res.json(job);
  } catch (error) {
    console.error("Error in updateJob:", error);
    res.status(400).json({ error: "Failed to update job" });
  }
};

export const deleteJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.job.delete({ where: { jobId: id } });
    res.json({ message: "Job deleted" });
  } catch (error) {
    console.error("Error in deleteJob:", error);
    res.status(400).json({ error: "Failed to delete job" });
  }
};

export const togglePaymentReceived = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await prisma.job.findUnique({ where: { jobId: id } });
    // Toggle paymentReceived (if field exists)
    const updated = await prisma.job.update({
      where: { jobId: id },
      data: { paymentReceived: !(job as any).paymentReceived },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error in togglePaymentReceived:", error);
    res.status(400).json({ error: "Failed to toggle payment status" });
  }
};

export const toggleDriverPaid = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await prisma.job.findUnique({ where: { jobId: id } });
    // Toggle driverPaid
    const updated = await prisma.job.update({
      where: { jobId: id },
      data: { driverPaid: !(job as any).driverPaid },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error in toggleDriverPaid:", error);
    res.status(400).json({ error: "Failed to toggle driver payment status" });
  }
};
