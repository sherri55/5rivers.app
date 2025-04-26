// src/resolvers.ts
import { GraphQLScalarType, Kind } from "graphql";
import { AppDataSource } from "./data-source";
import { Company } from "./entities/Company";
import { Dispatcher } from "./entities/Dispatcher";
import { Driver } from "./entities/Driver";
import { JobType } from "./entities/JobType";
import { Unit } from "./entities/Unit";
import { Job } from "./entities/Job";
import { Invoice } from "./entities/Invoice";
import { InvoiceLine } from "./entities/InvoiceLine";

async function ds() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
}

export const resolvers = {
  Query: {
    units: async () => {
      await ds();
      return AppDataSource.getRepository(Unit).find();
    },
    unit: async (_: any, { unitId }: { unitId: string }) => {
      await ds();
      return AppDataSource.getRepository(Unit).findOneBy({ unitId });
    },

    companies: async () => {
      await ds();
      return AppDataSource.getRepository(Company).find();
    },
    company: async (_: any, { companyId }: { companyId: string }) => {
      await ds();
      return AppDataSource.getRepository(Company).findOneBy({ companyId });
    },

    dispatchers: async () => {
      await ds();
      return AppDataSource.getRepository(Dispatcher).find();
    },
    dispatcher: async (_: any, { dispatcherId }: { dispatcherId: string }) => {
      await ds();
      return AppDataSource.getRepository(Dispatcher).findOneBy({
        dispatcherId,
      });
    },

    drivers: async () => {
      await ds();
      return AppDataSource.getRepository(Driver).find();
    },
    driver: async (_: any, { driverId }: { driverId: string }) => {
      await ds();
      return AppDataSource.getRepository(Driver).findOneBy({ driverId });
    },

    jobTypes: async () => {
      await ds();
      return AppDataSource.getRepository(JobType).find();
    },
    jobType: async (_: any, { jobTypeId }: { jobTypeId: string }) => {
      await ds();
      return AppDataSource.getRepository(JobType).findOneBy({ jobTypeId });
    },

    jobs: async () => {
      await ds();
      return AppDataSource.getRepository(Job).find();
    },
    job: async (_: any, { jobId }: { jobId: string }) => {
      await ds();
      return AppDataSource.getRepository(Job).findOneBy({ jobId });
    },

    invoices: async () => {
      await ds();
      return AppDataSource.getRepository(Invoice).find();
    },
    invoice: async (_: any, { invoiceId }: { invoiceId: string }) => {
      await ds();
      return AppDataSource.getRepository(Invoice).findOneBy({ invoiceId });
    },
  },

  Mutation: {
    // Units
    createUnit: async (_: any, { input }: any) => {
      await ds();
      return AppDataSource.getRepository(Unit).save(input);
    },
    updateUnit: async (_: any, { input }: any) => {
      await ds();
      const repo = AppDataSource.getRepository(Unit);
      await repo.update({ unitId: input.unitId }, input);
      return repo.findOneBy({ unitId: input.unitId });
    },
    deleteUnit: async (_: any, { unitId }: { unitId: string }) => {
      await ds();
      const res = await AppDataSource.getRepository(Unit).delete({ unitId });
      return res.affected === 1;
    },

    // Companies
    createCompany: async (_: any, { input }: any) => {
      await ds();
      return AppDataSource.getRepository(Company).save(input);
    },
    updateCompany: async (_: any, { input }: any) => {
      await ds();
      const repo = AppDataSource.getRepository(Company);
      await repo.update({ companyId: input.companyId }, input);
      return repo.findOneBy({ companyId: input.companyId });
    },
    deleteCompany: async (_: any, { companyId }: { companyId: string }) => {
      await ds();
      const res = await AppDataSource.getRepository(Company).delete({
        companyId,
      });
      return res.affected === 1;
    },

    // Dispatchers
    createDispatcher: async (_: any, { input }: any) => {
      await ds();
      return AppDataSource.getRepository(Dispatcher).save(input);
    },
    updateDispatcher: async (_: any, { input }: any) => {
      await ds();
      const repo = AppDataSource.getRepository(Dispatcher);
      await repo.update({ dispatcherId: input.dispatcherId }, input);
      return repo.findOneBy({ dispatcherId: input.dispatcherId });
    },
    deleteDispatcher: async (
      _: any,
      { dispatcherId }: { dispatcherId: string }
    ) => {
      await ds();
      const res = await AppDataSource.getRepository(Dispatcher).delete({
        dispatcherId,
      });
      return res.affected === 1;
    },

    // Drivers
    createDriver: async (_: any, { input }: any) => {
      await ds();
      return AppDataSource.getRepository(Driver).save(input);
    },
    updateDriver: async (_: any, { input }: any) => {
      await ds();
      const repo = AppDataSource.getRepository(Driver);
      await repo.update({ driverId: input.driverId }, input);
      return repo.findOneBy({ driverId: input.driverId });
    },
    deleteDriver: async (_: any, { driverId }: { driverId: string }) => {
      await ds();
      const res = await AppDataSource.getRepository(Driver).delete({
        driverId,
      });
      return res.affected === 1;
    },

    // JobTypes
    createJobType: async (_: any, { input }: any) => {
      await ds();
      return AppDataSource.getRepository(JobType).save(input);
    },
    updateJobType: async (_: any, { input }: any) => {
      await ds();
      const repo = AppDataSource.getRepository(JobType);
      await repo.update({ jobTypeId: input.jobTypeId }, input);
      return repo.findOneBy({ jobTypeId: input.jobTypeId });
    },
    deleteJobType: async (_: any, { jobTypeId }: { jobTypeId: string }) => {
      await ds();
      const res = await AppDataSource.getRepository(JobType).delete({
        jobTypeId,
      });
      return res.affected === 1;
    },

    // Jobs
    createJob: async (_: any, { input }: any) => {
      await ds();
      return AppDataSource.getRepository(Job).save(input);
    },
    updateJob: async (_: any, { input }: any) => {
      await ds();
      const repo = AppDataSource.getRepository(Job);
      await repo.update({ jobId: input.jobId }, input);
      return repo.findOneBy({ jobId: input.jobId });
    },
    updateJobInvoiceStatus: async (_: any, { input }: any) => {
      await ds();
      const repo = AppDataSource.getRepository(Job);
      const { jobId, invoiceStatus } = input;
      await repo.update({ jobId }, { invoiceStatus });
      return repo.findOneBy({ jobId });
    },
    deleteJob: async (_: any, { jobId }: { jobId: string }) => {
      await ds();
      const res = await AppDataSource.getRepository(Job).delete({ jobId });
      return res.affected === 1;
    },

    // Invoices
    createInvoice: async (_: any, { input }: any) => {
      await ds();
      return AppDataSource.getRepository(Invoice).save(input);
    },
    updateInvoice: async (_: any, { input }: any) => {
      await ds();
      const repo = AppDataSource.getRepository(Invoice);
      await repo.update({ invoiceId: input.invoiceId }, input);
      return repo.findOneBy({ invoiceId: input.invoiceId });
    },
    deleteInvoice: async (_: any, { invoiceId }: { invoiceId: string }) => {
      await ds();
      const res = await AppDataSource.getRepository(Invoice).delete({
        invoiceId,
      });
      return res.affected === 1;
    },
  },

  Invoice: {
    lines: async (parent: Invoice) => {
      await ds();
      return AppDataSource.getRepository(InvoiceLine).find({
        where: { invoice: { invoiceId: parent.invoiceId } },
        relations: ["job"],
      });
    },
  },

  InvoiceLine: {
    job: async (parent: any) => {
      await ds();
      return AppDataSource.getRepository(Job).findOneBy({
        jobId: parent.job?.jobId,
      });
    },
    invoice: async (parent: any) => {
      await ds();
      return AppDataSource.getRepository(Invoice).findOneBy({
        invoiceId: parent.invoice?.invoiceId,
      });
    },
  },

  Job: {
    jobType: async (parent: any) => {
      await ds();
      return AppDataSource.getRepository(JobType).findOneBy({
        jobTypeId: parent.jobTypeId,
      });
    },
    driver: async (parent: any) => {
      await ds();
      return AppDataSource.getRepository(Driver).findOneBy({
        driverId: parent.driverId,
      });
    },
    dispatcher: async (parent: any) => {
      await ds();
      return AppDataSource.getRepository(Dispatcher).findOneBy({
        dispatcherId: parent.dispatcherId,
      });
    },
    unit: async (parent: any) => {
      await ds();
      return AppDataSource.getRepository(Unit).findOneBy({
        unitId: parent.unitId,
      });
    },
    invoice: async (parent: any) => {
      await ds();
      return AppDataSource.getRepository(Invoice).findOneBy({
        invoiceId: parent.invoiceId,
      });
    },
  },
};
