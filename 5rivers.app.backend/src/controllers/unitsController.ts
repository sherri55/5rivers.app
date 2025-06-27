import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getUnits = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string;

    // Build where clause for filtering
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { plateNumber: { contains: search, mode: "insensitive" } },
        { vin: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count for pagination
    const total = await prisma.unit.count({ where });

    // Fetch units with pagination
    const units = await prisma.unit.findMany({
      where,
      include: { jobs: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // For each unit, count jobs
    const result = units.map((unit) => ({
      ...unit,
      jobsCount: unit.jobs.length,
    }));

    res.json({
      data: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error in getUnits:", error);
    res.status(500).json({ error: "Failed to fetch units" });
  }
};

export const getUnitById = async (req: Request, res: Response) => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { unitId: req.params.id },
      include: { jobs: true },
    });
    res.json(unit);
  } catch (error) {
    console.error("Error in getUnitById:", error);
    res.status(500).json({ error: "Failed to fetch unit" });
  }
};

export const createUnit = async (req: Request, res: Response) => {
  try {
    const { name, description, plateNumber, color, vin } = req.body;
    const unit = await prisma.unit.create({
      data: { name, description, plateNumber, color, vin },
    });
    res.status(201).json(unit);
  } catch (error) {
    console.error("Error in createUnit:", error);
    res.status(400).json({ error: "Failed to create unit" });
  }
};

export const updateUnit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, plateNumber, color, vin } = req.body;
    const unit = await prisma.unit.update({
      where: { unitId: id },
      data: { name, description, plateNumber, color, vin },
    });
    res.json(unit);
  } catch (error) {
    console.error("Error in updateUnit:", error);
    res.status(400).json({ error: "Failed to update unit" });
  }
};

export const deleteUnit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.unit.delete({ where: { unitId: id } });
    res.json({ message: "Unit deleted" });
  } catch (error) {
    console.error("Error in deleteUnit:", error);
    res.status(400).json({ error: "Failed to delete unit" });
  }
};
