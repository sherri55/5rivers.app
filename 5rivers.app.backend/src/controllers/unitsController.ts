import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getUnits = async (req: Request, res: Response) => {
  try {
    const units = await prisma.unit.findMany({
      include: { jobs: true },
    });
    res.json(units);
  } catch {
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
  } catch {
    res.status(500).json({ error: "Failed to fetch unit" });
  }
};

export const createUnit = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const unit = await prisma.unit.create({
      data: { name, description },
    });
    res.status(201).json(unit);
  } catch {
    res.status(400).json({ error: "Failed to create unit" });
  }
};

export const updateUnit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const unit = await prisma.unit.update({
      where: { unitId: id },
      data: req.body,
    });
    res.json(unit);
  } catch {
    res.status(400).json({ error: "Failed to update unit" });
  }
};

export const deleteUnit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.unit.delete({ where: { unitId: id } });
    res.json({ message: "Unit deleted" });
  } catch {
    res.status(400).json({ error: "Failed to delete unit" });
  }
};
