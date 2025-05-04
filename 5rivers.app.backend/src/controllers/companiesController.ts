import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      include: { jobTypes: true },
    });
    res.json(companies);
  } catch {
    res.status(500).json({ error: "Failed to fetch companies" });
  }
};

export const getCompanyById = async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.findUnique({
      where: { companyId: req.params.id },
      include: { jobTypes: true },
    });
    res.json(company);
  } catch {
    res.status(500).json({ error: "Failed to fetch company" });
  }
};

export const createCompany = async (req: Request, res: Response) => {
  try {
    const { name, description, email, phone } = req.body;
    const company = await prisma.company.create({
      data: { name, description, email, phone },
    });
    res.status(201).json(company);
  } catch {
    res.status(400).json({ error: "Failed to create company" });
  }
};

export const updateCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const company = await prisma.company.update({
      where: { companyId: id },
      data: req.body,
    });
    res.json(company);
  } catch {
    res.status(400).json({ error: "Failed to update company" });
  }
};

export const deleteCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.company.delete({ where: { companyId: id } });
    res.json({ message: "Company deleted" });
  } catch {
    res.status(400).json({ error: "Failed to delete company" });
  }
};
