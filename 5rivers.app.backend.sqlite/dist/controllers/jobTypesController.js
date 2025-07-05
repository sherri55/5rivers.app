"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteJobType = exports.updateJobType = exports.createJobType = exports.getJobTypeById = exports.getJobTypes = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getJobTypes = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const search = req.query.search;
        const companyId = req.query.companyId;
        const dispatchType = req.query.dispatchType;
        // Build where clause for filtering
        const where = {};
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
    }
    catch (error) {
        console.error('Error in getJobTypes:', error);
        res.status(500).json({ error: "Failed to fetch job types" });
    }
};
exports.getJobTypes = getJobTypes;
const getJobTypeById = async (req, res) => {
    try {
        const jobType = await prisma.jobType.findUnique({
            where: { jobTypeId: req.params.id },
            include: { company: true, jobs: true },
        });
        res.json(jobType);
    }
    catch (error) {
        console.error('Error in getJobTypeById:', error);
        res.status(500).json({ error: "Failed to fetch job type" });
    }
};
exports.getJobTypeById = getJobTypeById;
const createJobType = async (req, res) => {
    try {
        const { title, startLocation, endLocation, dispatchType, rateOfJob, companyId, } = req.body;
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
    }
    catch (error) {
        console.error('Error in createJobType:', error);
        res.status(400).json({ error: "Failed to create job type" });
    }
};
exports.createJobType = createJobType;
const updateJobType = async (req, res) => {
    try {
        const { id } = req.params;
        const jobType = await prisma.jobType.update({
            where: { jobTypeId: id },
            data: req.body,
        });
        res.json(jobType);
    }
    catch (error) {
        console.error('Error in updateJobType:', error);
        res.status(400).json({ error: "Failed to update job type" });
    }
};
exports.updateJobType = updateJobType;
const deleteJobType = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.jobType.delete({ where: { jobTypeId: id } });
        res.json({ message: "Job type deleted" });
    }
    catch (error) {
        console.error('Error in deleteJobType:', error);
        res.status(400).json({ error: "Failed to delete job type" });
    }
};
exports.deleteJobType = deleteJobType;
