"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUnit = exports.updateUnit = exports.createUnit = exports.getUnitById = exports.getUnits = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getUnits = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const search = req.query.search;
        // Build where clause for filtering
        const where = {};
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
    }
    catch (error) {
        console.error("Error in getUnits:", error);
        res.status(500).json({ error: "Failed to fetch units" });
    }
};
exports.getUnits = getUnits;
const getUnitById = async (req, res) => {
    try {
        const unit = await prisma.unit.findUnique({
            where: { unitId: req.params.id },
            include: { jobs: true },
        });
        res.json(unit);
    }
    catch (error) {
        console.error("Error in getUnitById:", error);
        res.status(500).json({ error: "Failed to fetch unit" });
    }
};
exports.getUnitById = getUnitById;
const createUnit = async (req, res) => {
    try {
        const { name, description, plateNumber, color, vin } = req.body;
        const unit = await prisma.unit.create({
            data: { name, description, plateNumber, color, vin },
        });
        res.status(201).json(unit);
    }
    catch (error) {
        console.error("Error in createUnit:", error);
        res.status(400).json({ error: "Failed to create unit" });
    }
};
exports.createUnit = createUnit;
const updateUnit = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, plateNumber, color, vin } = req.body;
        const unit = await prisma.unit.update({
            where: { unitId: id },
            data: { name, description, plateNumber, color, vin },
        });
        res.json(unit);
    }
    catch (error) {
        console.error("Error in updateUnit:", error);
        res.status(400).json({ error: "Failed to update unit" });
    }
};
exports.updateUnit = updateUnit;
const deleteUnit = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.unit.delete({ where: { unitId: id } });
        res.json({ message: "Unit deleted" });
    }
    catch (error) {
        console.error("Error in deleteUnit:", error);
        res.status(400).json({ error: "Failed to delete unit" });
    }
};
exports.deleteUnit = deleteUnit;
