import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getCompanies = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string;

    // Build where clause for filtering
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count for pagination
    const total = await prisma.company.count({ where });

    // Fetch companies with pagination
    const companies = await prisma.company.findMany({
      where,
      include: { jobTypes: true },
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // For each company, add job types count
    const result = companies.map((company) => ({
      ...company,
      jobTypesCount: company.jobTypes.length,
    }));

    res.json({
      data: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Error in getCompanies:', error);
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
  } catch (error) {
    console.error('Error in getCompanyById:', error);
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
  } catch (error) {
    console.error('Error in createCompany:', error);
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
  } catch (error) {
    console.error('Error in updateCompany:', error);
    res.status(400).json({ error: "Failed to update company" });
  }
};

export const deleteCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.company.delete({ where: { companyId: id } });
    res.json({ message: "Company deleted" });
  } catch (error) {
    console.error('Error in deleteCompany:', error);
    res.status(400).json({ error: "Failed to delete company" });
  }
};
