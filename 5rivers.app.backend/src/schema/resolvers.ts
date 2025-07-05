import { DateTimeResolver } from 'graphql-scalars';
import { GraphQLContext } from '../types/context';
import { companyService } from '../services/companyService';
import CalculationService from '../services/calculationService';
import {
  CreateCompanyInput,
  UpdateCompanyInput,
  CompanyFilters,
  PaginationInput,
} from '../types/company';

export const resolvers = {
  Date: DateTimeResolver,

  Query: {
    companies: async (
      _parent: any,
      args: {
        filters?: CompanyFilters;
        pagination?: PaginationInput;
      },
      _context: GraphQLContext
    ) => {
      return await companyService.getCompanies(args.filters, args.pagination);
    },

    company: async (
      _parent: any,
      args: { id: string },
      _context: GraphQLContext
    ) => {
      return await companyService.getCompanyById(args.id);
    },

    searchCompanies: async (
      _parent: any,
      args: { query: string; limit?: number },
      _context: GraphQLContext
    ) => {
      return await companyService.searchCompanies(args.query, args.limit);
    },

    // Invoice queries for simplified structure
    invoices: async (
      _parent: any,
      _args: any,
      context: GraphQLContext
    ) => {
      const query = `
        MATCH (i:Invoice)
        RETURN i
        ORDER BY i.createdAt DESC
      `;
      const result = await context.neo4jService.runQuery(query);
      return result.map((record: any) => record.i.properties);
    },

    invoice: async (
      _parent: any,
      args: { id: string },
      context: GraphQLContext
    ) => {
      const query = `
        MATCH (i:Invoice {id: $id})
        RETURN i
      `;
      const result = await context.neo4jService.runQuery(query, { id: args.id });
      return result[0]?.i.properties;
    },
  },

  Mutation: {
    createCompany: async (
      _parent: any,
      args: { input: CreateCompanyInput },
      _context: GraphQLContext
    ) => {
      return await companyService.createCompany(args.input);
    },

    updateCompany: async (
      _parent: any,
      args: { input: UpdateCompanyInput },
      _context: GraphQLContext
    ) => {
      const company = await companyService.updateCompany(args.input);
      if (!company) {
        throw new Error(`Company with id ${args.input.id} not found`);
      }
      return company;
    },

    deleteCompany: async (
      _parent: any,
      args: { id: string },
      _context: GraphQLContext
    ) => {
      const deleted = await companyService.deleteCompany(args.id);
      if (!deleted) {
        throw new Error(`Company with id ${args.id} not found`);
      }
      return deleted;
    },
  },

  // Field resolvers for simplified Invoice structure
  Invoice: {
    jobs: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (i:Invoice {id: $invoiceId})<-[r:INVOICED_IN]-(j:Job)
        RETURN j, r.amount as amount, r.createdAt as invoicedAt
        ORDER BY j.jobDate
      `;
      const result = await context.neo4jService.runQuery(query, { invoiceId: parent.id });
      return result.map((record: any) => ({
        job: record.j.properties,
        amount: record.amount,
        invoicedAt: record.invoicedAt
      }));
    },

    dispatcher: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (i:Invoice {id: $invoiceId})-[:BILLED_BY]->(d:Dispatcher)
        RETURN d
      `;
      const result = await context.neo4jService.runQuery(query, { invoiceId: parent.id });
      return result[0]?.d.properties;
    },

    calculations: async (parent: any, _args: any, _context: GraphQLContext) => {
      return await CalculationService.calculateInvoiceAmountsSimplified(parent.id);
    },
  },

  Job: {
    jobType: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (j:Job {id: $jobId})-[:OF_TYPE]->(jt:JobType)
        RETURN jt
      `;
      const result = await context.neo4jService.runQuery(query, { jobId: parent.id });
      return result[0]?.jt.properties;
    },

    driver: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (j:Job {id: $jobId})-[:ASSIGNED_TO]->(d:Driver)
        RETURN d
      `;
      const result = await context.neo4jService.runQuery(query, { jobId: parent.id });
      return result[0]?.d.properties;
    },

    dispatcher: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (j:Job {id: $jobId})-[:MANAGED_BY]->(d:Dispatcher)
        RETURN d
      `;
      const result = await context.neo4jService.runQuery(query, { jobId: parent.id });
      return result[0]?.d.properties;
    },

    unit: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (j:Job {id: $jobId})-[:USES_UNIT]->(u:Unit)
        RETURN u
      `;
      const result = await context.neo4jService.runQuery(query, { jobId: parent.id });
      return result[0]?.u.properties;
    },

    calculatedAmount: async (parent: any, _args: any, _context: GraphQLContext) => {
      return await CalculationService.calculateJobAmount(parent.id);
    },

    calculatedHours: async (parent: any, _args: any, _context: GraphQLContext) => {
      return CalculationService.calculateJobHours(parent);
    },
  },
};
