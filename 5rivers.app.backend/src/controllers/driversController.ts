// controllers/driversController.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getDrivers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string;

    // Build where clause for filtering
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count for pagination
    const total = await prisma.driver.count({ where });

    // Fetch drivers with pagination
    const drivers = await prisma.driver.findMany({
      where,
      include: { jobs: true },
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // For each driver, count active jobs (invoiceStatus Pending or not Invoiced)
    const result = await Promise.all(
      drivers.map(async (driver) => {
        const activeJobsCount = await prisma.job.count({
          where: {
            driverId: driver.driverId,
            OR: [
              { invoiceStatus: { equals: "Pending" } },
              { invoiceStatus: { not: "Invoiced" } },
            ],
          },
        });
        return {
          ...driver,
          activeJobsCount,
        };
      })
    );

    res.json({
      data: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error in getDrivers:", error);
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
};

export const getDriverById = async (req: Request, res: Response) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { driverId: req.params.id },
      include: { jobs: true },
    });
    res.json(driver);
  } catch (error) {
    console.error("Error in getDriverById:", error);
    res.status(500).json({ error: "Failed to fetch driver" });
  }
};

export const createDriver = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, hourlyRate, description } = req.body;
    const driver = await prisma.driver.create({
      data: { name, email, phone, hourlyRate, description },
    });
    res.status(201).json(driver);
  } catch (error) {
    console.error("Error in createDriver:", error);
    res.status(400).json({ error: "Failed to create driver" });
  }
};

export const updateDriver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const driver = await prisma.driver.update({
      where: { driverId: id },
      data: req.body,
    });
    res.json(driver);
  } catch (error) {
    console.error("Error in updateDriver:", error);
    res.status(400).json({ error: "Failed to update driver" });
  }
};

export const deleteDriver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.driver.delete({ where: { driverId: id } });
    res.json({ message: "Driver deleted" });
  } catch (error) {
    console.error("Error in deleteDriver:", error);
    res.status(400).json({ error: "Failed to delete driver" });
  }
};
