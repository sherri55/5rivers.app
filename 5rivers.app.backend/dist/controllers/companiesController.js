"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCompany = exports.updateCompany = exports.createCompany = exports.getCompanyById = exports.getCompanies = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getCompanies = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const search = req.query.search;
        // Build where clause for filtering
        const where = {};
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
    }
    catch (error) {
        console.error('Error in getCompanies:', error);
        res.status(500).json({ error: "Failed to fetch companies" });
    }
};
exports.getCompanies = getCompanies;
const getCompanyById = async (req, res) => {
    try {
        const company = await prisma.company.findUnique({
            where: { companyId: req.params.id },
            include: { jobTypes: true },
        });
        res.json(company);
    }
    catch (error) {
        console.error('Error in getCompanyById:', error);
        res.status(500).json({ error: "Failed to fetch company" });
    }
};
exports.getCompanyById = getCompanyById;
const createCompany = async (req, res) => {
    try {
        const { name, description, email, phone } = req.body;
        const company = await prisma.company.create({
            data: { name, description, email, phone },
        });
        res.status(201).json(company);
    }
    catch (error) {
        console.error('Error in createCompany:', error);
        res.status(400).json({ error: "Failed to create company" });
    }
};
exports.createCompany = createCompany;
const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const company = await prisma.company.update({
            where: { companyId: id },
            data: req.body,
        });
        res.json(company);
    }
    catch (error) {
        console.error('Error in updateCompany:', error);
        res.status(400).json({ error: "Failed to update company" });
    }
};
exports.updateCompany = updateCompany;
const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.company.delete({ where: { companyId: id } });
        res.json({ message: "Company deleted" });
    }
    catch (error) {
        console.error('Error in deleteCompany:', error);
        res.status(400).json({ error: "Failed to delete company" });
    }
};
exports.deleteCompany = deleteCompany;
