"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDispatcher = exports.updateDispatcher = exports.createDispatcher = exports.getDispatcherById = exports.getDispatchers = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getDispatchers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const search = req.query.search;
        // Build where clause for filtering
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }
        // Get total count for pagination
        const total = await prisma.dispatcher.count({ where });
        // Fetch dispatchers with pagination
        const dispatchers = await prisma.dispatcher.findMany({
            where,
            include: { jobs: true },
            orderBy: { name: "asc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
        // For each dispatcher, count jobs and invoices
        const result = await Promise.all(dispatchers.map(async (dispatcher) => {
            // Jobs count
            const jobsCount = dispatcher.jobs.length;
            // Invoices count: count distinct invoices for this dispatcher
            const invoicesCount = await prisma.invoice.count({
                where: { dispatcherId: dispatcher.dispatcherId },
            });
            // Return dispatcher with counts
            return {
                ...dispatcher,
                jobsCount,
                invoicesCount,
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
        console.error("Error in getDispatchers:", error);
        res.status(500).json({ error: "Failed to fetch dispatchers" });
    }
};
exports.getDispatchers = getDispatchers;
const getDispatcherById = async (req, res) => {
    try {
        const dispatcher = await prisma.dispatcher.findUnique({
            where: { dispatcherId: req.params.id },
            include: { jobs: true },
        });
        res.json(dispatcher);
    }
    catch (error) {
        console.error("Error in getDispatcherById:", error);
        res.status(500).json({ error: "Failed to fetch dispatcher" });
    }
};
exports.getDispatcherById = getDispatcherById;
const createDispatcher = async (req, res) => {
    try {
        const { name, description, email, phone, commissionPercent } = req.body;
        const dispatcher = await prisma.dispatcher.create({
            data: { name, description, email, phone, commissionPercent },
        });
        res.status(201).json(dispatcher);
    }
    catch (error) {
        console.error("Error in createDispatcher:", error);
        res.status(400).json({ error: "Failed to create dispatcher" });
    }
};
exports.createDispatcher = createDispatcher;
const updateDispatcher = async (req, res) => {
    try {
        const { id } = req.params;
        const dispatcher = await prisma.dispatcher.update({
            where: { dispatcherId: id },
            data: req.body,
        });
        res.json(dispatcher);
    }
    catch (error) {
        console.error("Error in updateDispatcher:", error);
        res.status(400).json({ error: "Failed to update dispatcher" });
    }
};
exports.updateDispatcher = updateDispatcher;
const deleteDispatcher = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.dispatcher.delete({ where: { dispatcherId: id } });
        res.json({ message: "Dispatcher deleted" });
    }
    catch (error) {
        console.error("Error in deleteDispatcher:", error);
        res.status(400).json({ error: "Failed to delete dispatcher" });
    }
};
exports.deleteDispatcher = deleteDispatcher;
