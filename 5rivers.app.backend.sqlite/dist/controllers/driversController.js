"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDriver = exports.updateDriver = exports.createDriver = exports.getDriverById = exports.getDrivers = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getDrivers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const search = req.query.search;
        // Build where clause for filtering
        const where = {};
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
        const result = await Promise.all(drivers.map(async (driver) => {
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
        console.error("Error in getDrivers:", error);
        res.status(500).json({ error: "Failed to fetch drivers" });
    }
};
exports.getDrivers = getDrivers;
const getDriverById = async (req, res) => {
    try {
        const driver = await prisma.driver.findUnique({
            where: { driverId: req.params.id },
            include: { jobs: true },
        });
        res.json(driver);
    }
    catch (error) {
        console.error("Error in getDriverById:", error);
        res.status(500).json({ error: "Failed to fetch driver" });
    }
};
exports.getDriverById = getDriverById;
const createDriver = async (req, res) => {
    try {
        const { name, email, phone, hourlyRate, description } = req.body;
        const driver = await prisma.driver.create({
            data: { name, email, phone, hourlyRate, description },
        });
        res.status(201).json(driver);
    }
    catch (error) {
        console.error("Error in createDriver:", error);
        res.status(400).json({ error: "Failed to create driver" });
    }
};
exports.createDriver = createDriver;
const updateDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const driver = await prisma.driver.update({
            where: { driverId: id },
            data: req.body,
        });
        res.json(driver);
    }
    catch (error) {
        console.error("Error in updateDriver:", error);
        res.status(400).json({ error: "Failed to update driver" });
    }
};
exports.updateDriver = updateDriver;
const deleteDriver = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.driver.delete({ where: { driverId: id } });
        res.json({ message: "Driver deleted" });
    }
    catch (error) {
        console.error("Error in deleteDriver:", error);
        res.status(400).json({ error: "Failed to delete driver" });
    }
};
exports.deleteDriver = deleteDriver;
