"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = exports.DateTime = void 0;
// src/resolvers.ts
const graphql_1 = require("graphql");
const data_source_1 = require("./data-source");
const Company_1 = require("./entities/Company");
const Dispatcher_1 = require("./entities/Dispatcher");
const Driver_1 = require("./entities/Driver");
const JobType_1 = require("./entities/JobType");
const Unit_1 = require("./entities/Unit");
const Job_1 = require("./entities/Job");
const Invoice_1 = require("./entities/Invoice");
const InvoiceLine_1 = require("./entities/InvoiceLine");
async function ds() {
    if (!data_source_1.AppDataSource.isInitialized) {
        await data_source_1.AppDataSource.initialize();
    }
}
// Custom DateTime scalar
exports.DateTime = new graphql_1.GraphQLScalarType({
    name: "DateTime",
    description: "ISO‑8601 DateTime",
    serialize(value) {
        if (!(value instanceof Date)) {
            throw new Error("DateTime can only serialize Date objects");
        }
        return value.toISOString();
    },
    parseValue(value) {
        return new Date(value);
    },
    parseLiteral(ast) {
        return ast.kind === graphql_1.Kind.STRING ? new Date(ast.value) : null;
    },
});
exports.resolvers = {
    DateTime: exports.DateTime,
    Query: {
        units: async () => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Unit_1.Unit).find();
        },
        unit: async (_, { unitId }) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Unit_1.Unit).findOneBy({ unitId });
        },
        companies: async () => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Company_1.Company).find();
        },
        company: async (_, { companyId }) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Company_1.Company).findOneBy({ companyId });
        },
        dispatchers: async () => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Dispatcher_1.Dispatcher).find();
        },
        dispatcher: async (_, { dispatcherId }) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Dispatcher_1.Dispatcher).findOneBy({
                dispatcherId,
            });
        },
        drivers: async () => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Driver_1.Driver).find();
        },
        driver: async (_, { driverId }) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Driver_1.Driver).findOneBy({ driverId });
        },
        jobTypes: async () => {
            await ds();
            return data_source_1.AppDataSource.getRepository(JobType_1.JobType).find();
        },
        jobType: async (_, { jobTypeId }) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(JobType_1.JobType).findOneBy({ jobTypeId });
        },
        jobs: async () => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Job_1.Job).find();
        },
        job: async (_, { jobId }) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Job_1.Job).findOneBy({ jobId });
        },
        invoices: async () => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Invoice_1.Invoice).find();
        },
        invoice: async (_, { invoiceId }) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Invoice_1.Invoice).findOneBy({ invoiceId });
        },
    },
    Mutation: {
        // Units
        createUnit: async (_, { input }) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Unit_1.Unit).save(input);
        },
        updateUnit: async (_, { input }) => {
            await ds();
            const repo = data_source_1.AppDataSource.getRepository(Unit_1.Unit);
            await repo.update({ unitId: input.unitId }, input);
            return repo.findOneBy({ unitId: input.unitId });
        },
        deleteUnit: async (_, { unitId }) => {
            await ds();
            const res = await data_source_1.AppDataSource.getRepository(Unit_1.Unit).delete({ unitId });
            return res.affected === 1;
        },
        // Companies
        createCompany: async (_, { input }) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Company_1.Company).save(input);
        },
        updateCompany: async (_, { input }) => {
            await ds();
            const repo = data_source_1.AppDataSource.getRepository(Company_1.Company);
            await repo.update({ companyId: input.companyId }, input);
            return repo.findOneBy({ companyId: input.companyId });
        },
        deleteCompany: async (_, { companyId }) => {
            await ds();
            const res = await data_source_1.AppDataSource.getRepository(Company_1.Company).delete({
                companyId,
            });
            return res.affected === 1;
        },
        // Dispatchers
        createDispatcher: async (_, { input }) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Dispatcher_1.Dispatcher).save(input);
        },
        updateDispatcher: async (_, { input }) => {
            await ds();
            const repo = data_source_1.AppDataSource.getRepository(Dispatcher_1.Dispatcher);
            await repo.update({ dispatcherId: input.dispatcherId }, input);
            return repo.findOneBy({ dispatcherId: input.dispatcherId });
        },
        deleteDispatcher: async (_, { dispatcherId }) => {
            await ds();
            const res = await data_source_1.AppDataSource.getRepository(Dispatcher_1.Dispatcher).delete({
                dispatcherId,
            });
            return res.affected === 1;
        },
        // Drivers
        createDriver: async (_, { input }) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Driver_1.Driver).save(input);
        },
        updateDriver: async (_, { input }) => {
            await ds();
            const repo = data_source_1.AppDataSource.getRepository(Driver_1.Driver);
            await repo.update({ driverId: input.driverId }, input);
            return repo.findOneBy({ driverId: input.driverId });
        },
        deleteDriver: async (_, { driverId }) => {
            await ds();
            const res = await data_source_1.AppDataSource.getRepository(Driver_1.Driver).delete({
                driverId,
            });
            return res.affected === 1;
        },
        // JobTypes
        createJobType: async (_, { input }) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(JobType_1.JobType).save(input);
        },
        updateJobType: async (_, { input }) => {
            await ds();
            const repo = data_source_1.AppDataSource.getRepository(JobType_1.JobType);
            await repo.update({ jobTypeId: input.jobTypeId }, input);
            return repo.findOneBy({ jobTypeId: input.jobTypeId });
        },
        deleteJobType: async (_, { jobTypeId }) => {
            await ds();
            const res = await data_source_1.AppDataSource.getRepository(JobType_1.JobType).delete({
                jobTypeId,
            });
            return res.affected === 1;
        },
        // Jobs
        createJob: async (_, { input }) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Job_1.Job).save(input);
        },
        updateJob: async (_, { input }) => {
            await ds();
            const repo = data_source_1.AppDataSource.getRepository(Job_1.Job);
            await repo.update({ jobId: input.jobId }, input);
            return repo.findOneBy({ jobId: input.jobId });
        },
        deleteJob: async (_, { jobId }) => {
            await ds();
            const res = await data_source_1.AppDataSource.getRepository(Job_1.Job).delete({ jobId });
            return res.affected === 1;
        },
        // Invoices
        createInvoice: async (_, { input }) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Invoice_1.Invoice).save(input);
        },
        updateInvoice: async (_, { input }) => {
            await ds();
            const repo = data_source_1.AppDataSource.getRepository(Invoice_1.Invoice);
            await repo.update({ invoiceId: input.invoiceId }, input);
            return repo.findOneBy({ invoiceId: input.invoiceId });
        },
        deleteInvoice: async (_, { invoiceId }) => {
            await ds();
            const res = await data_source_1.AppDataSource.getRepository(Invoice_1.Invoice).delete({
                invoiceId,
            });
            return res.affected === 1;
        },
    },
    Invoice: {
        lines: async (parent) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(InvoiceLine_1.InvoiceLine).find({
                where: { invoice: { invoiceId: parent.invoiceId } },
                relations: ["job"],
            });
        },
    },
    InvoiceLine: {
        job: async (parent) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Job_1.Job).findOneBy({
                jobId: parent.job?.jobId,
            });
        },
        invoice: async (parent) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Invoice_1.Invoice).findOneBy({
                invoiceId: parent.invoice?.invoiceId,
            });
        },
    },
    Job: {
        jobType: async (parent) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(JobType_1.JobType).findOneBy({
                jobTypeId: parent.jobTypeId,
            });
        },
        driver: async (parent) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Driver_1.Driver).findOneBy({
                driverId: parent.driverId,
            });
        },
        dispatcher: async (parent) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Dispatcher_1.Dispatcher).findOneBy({
                dispatcherId: parent.dispatcherId,
            });
        },
        unit: async (parent) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Unit_1.Unit).findOneBy({
                unitId: parent.unitId,
            });
        },
        invoice: async (parent) => {
            await ds();
            return data_source_1.AppDataSource.getRepository(Invoice_1.Invoice).findOneBy({
                invoiceId: parent.invoiceId,
            });
        },
    },
};
