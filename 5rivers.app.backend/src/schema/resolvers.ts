import { DateTimeResolver } from 'graphql-scalars';
import { GraphQLContext } from '../types/context';
import { companyService } from '../services/companyService';
import CalculationService from '../services/calculationService';
import neo4j from 'neo4j-driver';
import {
  CreateCompanyInput,
  UpdateCompanyInput,
  CompanyFilters,
  PaginationInput,
} from '../types/company';

// Helper function to safely parse dates and return ISO strings
const parseDate = (dateValue: any): string | null => {
  if (!dateValue) return null;
  
  try {
    // If it's already a Date object, convert to ISO string
    if (dateValue instanceof Date) {
      return dateValue.toISOString();
    }
    
    // If it's a string, try to parse it
    if (typeof dateValue === 'string') {
      // Handle date-only strings by adding time component
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(`${dateValue}T00:00:00.000Z`).toISOString();
      }
      
      // Handle other date formats
      const parsedDate = new Date(dateValue);
      if (isNaN(parsedDate.getTime())) {
        console.warn(`Invalid date format: ${dateValue}`);
        return null;
      }
      return parsedDate.toISOString();
    }
    
    // Handle Neo4j Date objects or other formats
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn(`Could not parse date: ${dateValue}`);
      return null;
    }
    return date.toISOString();
  } catch (error) {
    console.warn(`Error parsing date ${dateValue}:`, error);
    return null;
  }
};

// Helper function to convert ticketIds from string to array format for backward compatibility
const parseTicketIds = (ticketIds: any): string[] => {
  if (!ticketIds) return [];
  
  // If it's already an array, return as is
  if (Array.isArray(ticketIds)) {
    return ticketIds.filter((id: any) => id && typeof id === 'string' && id.trim() !== '');
  }
  
  // If it's a string, split by spaces and filter out empty values
  if (typeof ticketIds === 'string') {
    return ticketIds.split(' ').filter((id: string) => id.trim() !== '');
  }
  
  // If it's some other type, try to convert to string and then split
  try {
    const stringValue = String(ticketIds);
    return stringValue.split(' ').filter((id: string) => id.trim() !== '');
  } catch (error) {
    console.warn(`Could not parse ticketIds: ${ticketIds}`, error);
    return [];
  }
};

export const resolvers = {
  Date: DateTimeResolver,

  Company: {
    jobTypes: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (c:Company {id: $companyId})-[:HAS_JOB_TYPE]->(jt:JobType)
        RETURN jt
        ORDER BY jt.title ASC
      `;
      const result = await context.neo4jService.runQuery(query, { companyId: parent.id });
      return result.map((record: any) => ({
        ...record.jt.properties,
        createdAt: new Date(record.jt.properties.createdAt),
        updatedAt: new Date(record.jt.properties.updatedAt),
      }));
    },
    jobs: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (c:Company {id: $companyId})-[:HAS_JOB_TYPE]->(jt:JobType)<-[:OF_TYPE]-(j:Job)
        RETURN j
        ORDER BY j.jobDate DESC
      `;
      const result = await context.neo4jService.runQuery(query, { companyId: parent.id });
      return result.map((record: any) => ({
        ...record.j.properties,
        ticketIds: parseTicketIds(record.j.properties.ticketIds), // Convert string to array
        createdAt: new Date(record.j.properties.createdAt),
        updatedAt: new Date(record.j.properties.updatedAt),
      }));
    },
  },

  Driver: {
    jobs: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (d:Driver {id: $driverId})<-[:ASSIGNED_TO]-(j:Job)
        RETURN j
        ORDER BY j.jobDate DESC
      `;
      const result = await context.neo4jService.runQuery(query, { driverId: parent.id });
      return result.map((record: any) => ({
        ...record.j.properties,
        ticketIds: parseTicketIds(record.j.properties.ticketIds), // Convert string to array
        createdAt: new Date(record.j.properties.createdAt),
        updatedAt: new Date(record.j.properties.updatedAt),
      }));
    },
    driverRates: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (d:Driver {id: $driverId})-[:HAS_RATE]->(dr:DriverRate)
        RETURN dr
        ORDER BY dr.createdAt DESC
      `;
      const result = await context.neo4jService.runQuery(query, { driverId: parent.id });
      return result.map((record: any) => ({
        ...record.dr.properties,
        createdAt: new Date(record.dr.properties.createdAt),
        updatedAt: new Date(record.dr.properties.updatedAt),
      }));
    },
  },

  Dispatcher: {
    jobs: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (d:Dispatcher {id: $dispatcherId})<-[:MANAGED_BY]-(j:Job)
        RETURN j
        ORDER BY j.jobDate DESC
      `;
      const result = await context.neo4jService.runQuery(query, { dispatcherId: parent.id });
      return result.map((record: any) => ({
        ...record.j.properties,
        ticketIds: parseTicketIds(record.j.properties.ticketIds), // Convert string to array
        createdAt: new Date(record.j.properties.createdAt),
        updatedAt: new Date(record.j.properties.updatedAt),
      }));
    },
    invoices: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (d:Dispatcher {id: $dispatcherId})<-[:BILLED_BY]-(i:Invoice)
        RETURN i
        ORDER BY i.createdAt DESC
      `;
      const result = await context.neo4jService.runQuery(query, { dispatcherId: parent.id });
      return result.map((record: any) => {
        const props = record.i.properties;
        return {
          ...props,
          createdAt: parseDate(props.createdAt),
          updatedAt: parseDate(props.updatedAt),
          invoiceDate: parseDate(props.invoiceDate),
        };
      });
    },
  },

  Unit: {
    jobs: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (u:Unit {id: $unitId})<-[:USES_UNIT]-(j:Job)
        RETURN j
        ORDER BY j.jobDate DESC
      `;
      const result = await context.neo4jService.runQuery(query, { unitId: parent.id });
      return result.map((record: any) => ({
        ...record.j.properties,
        ticketIds: parseTicketIds(record.j.properties.ticketIds), // Convert string to array
        createdAt: new Date(record.j.properties.createdAt),
        updatedAt: new Date(record.j.properties.updatedAt),
      }));
    },
  },

  JobType: {
    company: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (jt:JobType {id: $jobTypeId})<-[:HAS_JOB_TYPE]-(c:Company)
        RETURN c
      `;
      const result = await context.neo4jService.runQuery(query, { jobTypeId: parent.id });
      if (result[0]) {
        return {
          ...result[0].c.properties,
          createdAt: new Date(result[0].c.properties.createdAt),
          updatedAt: new Date(result[0].c.properties.updatedAt),
        };
      }
      return null;
    },
    jobs: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (jt:JobType {id: $jobTypeId})<-[:OF_TYPE]-(j:Job)
        RETURN j
        ORDER BY j.jobDate DESC
      `;
      const result = await context.neo4jService.runQuery(query, { jobTypeId: parent.id });
      return result.map((record: any) => ({
        ...record.j.properties,
        ticketIds: parseTicketIds(record.j.properties.ticketIds), // Convert string to array
        createdAt: new Date(record.j.properties.createdAt),
        updatedAt: new Date(record.j.properties.updatedAt),
      }));
    },
    driverRates: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (jt:JobType {id: $jobTypeId})-[:RATE_FOR]->(dr:DriverRate)
        RETURN dr
        ORDER BY dr.createdAt DESC
      `;
      const result = await context.neo4jService.runQuery(query, { jobTypeId: parent.id });
      return result.map((record: any) => ({
        ...record.dr.properties,
        createdAt: new Date(record.dr.properties.createdAt),
        updatedAt: new Date(record.dr.properties.updatedAt),
      }));
    },
  },

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

    // Driver queries
    drivers: async (
      _parent: any,
      args: { pagination?: PaginationInput },
      context: GraphQLContext
    ) => {
      const page = args.pagination?.page || 1;
      const limit = args.pagination?.limit || 10;
      const offset = args.pagination?.offset || (page - 1) * limit;

      const query = `
        MATCH (d:Driver)
        RETURN d
        ORDER BY d.name ASC
        SKIP $offset LIMIT $limit
      `;
      const result = await context.neo4jService.runQuery(query, { 
        offset: neo4j.int(offset), 
        limit: neo4j.int(limit) 
      });
      return result.map((record: any) => ({
        ...record.d.properties,
        createdAt: new Date(record.d.properties.createdAt),
        updatedAt: new Date(record.d.properties.updatedAt),
      }));
    },

    driver: async (
      _parent: any,
      args: { id: string },
      context: GraphQLContext
    ) => {
      const query = `
        MATCH (d:Driver {id: $id})
        RETURN d
      `;
      const result = await context.neo4jService.runQuery(query, { id: args.id });
      if (result[0]) {
        return {
          ...result[0].d.properties,
          createdAt: new Date(result[0].d.properties.createdAt),
          updatedAt: new Date(result[0].d.properties.updatedAt),
        };
      }
      return null;
    },

    // Dispatcher queries
    dispatchers: async (
      _parent: any,
      args: { pagination?: PaginationInput },
      context: GraphQLContext
    ) => {
      const page = args.pagination?.page || 1;
      const limit = args.pagination?.limit || 10;
      const offset = args.pagination?.offset || (page - 1) * limit;

      const query = `
        MATCH (d:Dispatcher)
        RETURN d
        ORDER BY d.name ASC
        SKIP $offset LIMIT $limit
      `;
      const result = await context.neo4jService.runQuery(query, { 
        offset: neo4j.int(offset), 
        limit: neo4j.int(limit) 
      });
      return result.map((record: any) => ({
        ...record.d.properties,
        createdAt: new Date(record.d.properties.createdAt),
        updatedAt: new Date(record.d.properties.updatedAt),
      }));
    },

    dispatcher: async (
      _parent: any,
      args: { id: string },
      context: GraphQLContext
    ) => {
      const query = `
        MATCH (d:Dispatcher {id: $id})
        RETURN d
      `;
      const result = await context.neo4jService.runQuery(query, { id: args.id });
      if (result[0]) {
        return {
          ...result[0].d.properties,
          createdAt: new Date(result[0].d.properties.createdAt),
          updatedAt: new Date(result[0].d.properties.updatedAt),
        };
      }
      return null;
    },

    // Unit queries
    units: async (
      _parent: any,
      args: { pagination?: PaginationInput },
      context: GraphQLContext
    ) => {
      const page = args.pagination?.page || 1;
      const limit = args.pagination?.limit || 10;
      const offset = args.pagination?.offset || (page - 1) * limit;

      const query = `
        MATCH (u:Unit)
        RETURN u
        ORDER BY u.name ASC
        SKIP $offset LIMIT $limit
      `;
      const result = await context.neo4jService.runQuery(query, { 
        offset: neo4j.int(offset), 
        limit: neo4j.int(limit) 
      });
      return result.map((record: any) => ({
        ...record.u.properties,
        createdAt: new Date(record.u.properties.createdAt),
        updatedAt: new Date(record.u.properties.updatedAt),
      }));
    },

    unit: async (
      _parent: any,
      args: { id: string },
      context: GraphQLContext
    ) => {
      const query = `
        MATCH (u:Unit {id: $id})
        RETURN u
      `;
      const result = await context.neo4jService.runQuery(query, { id: args.id });
      if (result[0]) {
        return {
          ...result[0].u.properties,
          createdAt: new Date(result[0].u.properties.createdAt),
          updatedAt: new Date(result[0].u.properties.updatedAt),
        };
      }
      return null;
    },

    // JobType queries
    jobTypes: async (
      _parent: any,
      args: { companyId?: string; pagination?: PaginationInput },
      context: GraphQLContext
    ) => {
      const page = args.pagination?.page || 1;
      const limit = args.pagination?.limit || 10;
      const offset = args.pagination?.offset || (page - 1) * limit;

      let query: string;
      let parameters: any = { 
        offset: neo4j.int(offset), 
        limit: neo4j.int(limit) 
      };

      if (args.companyId) {
        query = `
          MATCH (c:Company {id: $companyId})-[:HAS_JOB_TYPE]->(jt:JobType)
          RETURN jt
          ORDER BY jt.title ASC
          SKIP $offset LIMIT $limit
        `;
        parameters.companyId = args.companyId;
      } else {
        query = `
          MATCH (jt:JobType)
          RETURN jt
          ORDER BY jt.title ASC
          SKIP $offset LIMIT $limit
        `;
      }

      const result = await context.neo4jService.runQuery(query, parameters);
      return result.map((record: any) => ({
        ...record.jt.properties,
        createdAt: new Date(record.jt.properties.createdAt),
        updatedAt: new Date(record.jt.properties.updatedAt),
      }));
    },

    jobType: async (
      _parent: any,
      args: { id: string },
      context: GraphQLContext
    ) => {
      const query = `
        MATCH (jt:JobType {id: $id})
        RETURN jt
      `;
      const result = await context.neo4jService.runQuery(query, { id: args.id });
      if (result[0]) {
        return {
          ...result[0].jt.properties,
          createdAt: new Date(result[0].jt.properties.createdAt),
          updatedAt: new Date(result[0].jt.properties.updatedAt),
        };
      }
      return null;
    },

    // Job queries
    jobs: async (
      _parent: any,
      args: { filters?: any; pagination?: PaginationInput },
      context: GraphQLContext
    ) => {
      const page = args.pagination?.page || 1;
      const limit = args.pagination?.limit || 10;
      const offset = args.pagination?.offset || (page - 1) * limit;

      // Build match pattern and where clauses based on filters
      let matchClauses = ['MATCH (j:Job)'];
      const whereClauses = [];
      const params: any = { 
        offset: neo4j.int(offset), 
        limit: neo4j.int(limit) 
      };

      if (args.filters?.dispatcherId) {
        matchClauses.push('MATCH (j)-[:MANAGED_BY]->(d:Dispatcher {id: $dispatcherId})');
        params.dispatcherId = args.filters.dispatcherId;
      }

      if (args.filters?.driverId) {
        matchClauses.push('MATCH (j)-[:ASSIGNED_TO]->(dr:Driver {id: $driverId})');
        params.driverId = args.filters.driverId;
      }

      if (args.filters?.unitId) {
        matchClauses.push('MATCH (j)-[:USES_UNIT]->(u:Unit {id: $unitId})');
        params.unitId = args.filters.unitId;
      }

      if (args.filters?.jobTypeId) {
        matchClauses.push('MATCH (j)-[:OF_TYPE]->(jt:JobType {id: $jobTypeId})');
        params.jobTypeId = args.filters.jobTypeId;
      }

      if (args.filters?.companyId) {
        matchClauses.push('MATCH (j)-[:OF_TYPE]->(jt:JobType)-[:BELONGS_TO]->(c:Company {id: $companyId})');
        params.companyId = args.filters.companyId;
      }

      if (args.filters?.invoiceStatus) {
        whereClauses.push('j.invoiceStatus = $invoiceStatus');
        params.invoiceStatus = args.filters.invoiceStatus;
      }

      if (args.filters?.paymentReceived !== undefined) {
        whereClauses.push('j.paymentReceived = $paymentReceived');
        params.paymentReceived = args.filters.paymentReceived;
      }

      if (args.filters?.driverPaid !== undefined) {
        whereClauses.push('j.driverPaid = $driverPaid');
        params.driverPaid = args.filters.driverPaid;
      }

      if (args.filters?.dateFrom) {
        whereClauses.push('j.jobDate >= $dateFrom');
        params.dateFrom = args.filters.dateFrom;
      }

      if (args.filters?.dateTo) {
        whereClauses.push('j.jobDate <= $dateTo');
        params.dateTo = args.filters.dateTo;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const matchClause = matchClauses.join('\n        ');

      const query = `
        ${matchClause}
        ${whereClause}
        RETURN j
        ORDER BY j.jobDate DESC
        SKIP $offset LIMIT $limit
      `;
      
      const countQuery = `
        ${matchClause}
        ${whereClause}
        RETURN count(j) as totalCount
      `;

      const [jobsResult, countResult] = await Promise.all([
        context.neo4jService.runQuery(query, params),
        context.neo4jService.runQuery(countQuery, params),
      ]);

      const jobs = jobsResult.map((record: any) => ({
        ...record.j.properties,
        ticketIds: parseTicketIds(record.j.properties.ticketIds), // Convert string to array
        createdAt: new Date(record.j.properties.createdAt),
        updatedAt: new Date(record.j.properties.updatedAt),
      }));

      const totalCount = countResult[0]?.totalCount || 0;
      const hasNextPage = offset + limit < totalCount;
      const hasPreviousPage = offset > 0;

      return {
        nodes: jobs,
        totalCount,
        hasNextPage,
        hasPreviousPage,
      };
    },

    job: async (
      _parent: any,
      args: { id: string },
      context: GraphQLContext
    ) => {
      const query = `
        MATCH (j:Job {id: $id})
        RETURN j
      `;
      const result = await context.neo4jService.runQuery(query, { id: args.id });
      if (result[0]) {
        return {
          ...result[0].j.properties,
          ticketIds: parseTicketIds(result[0].j.properties.ticketIds), // Convert string to array
          createdAt: new Date(result[0].j.properties.createdAt),
          updatedAt: new Date(result[0].j.properties.updatedAt),
        };
      }
      return null;
    },

    // Dashboard/Analytics
    dashboardStats: async (
      _parent: any,
      _args: any,
      context: GraphQLContext
    ) => {
      // Placeholder implementation - you can expand this with real analytics
      return {
        jobStats: {
          totalJobs: 0,
          totalRevenue: 0,
          averageJobValue: 0,
          pendingJobs: 0,
          completedJobs: 0,
        },
        driverStats: {
          totalDrivers: 0,
          activeDrivers: 0,
          totalHours: 0,
          totalEarnings: 0,
        },
        recentJobs: [],
        topCompanies: [],
      };
    },

    // Search jobs
    searchJobs: async (
      _parent: any,
      args: { query: string; limit?: number },
      context: GraphQLContext
    ) => {
      const limit = Math.max(1, Math.floor(args.limit || 10));
      const searchQuery = `
        MATCH (j:Job)
        WHERE toLower(j.jobDate) CONTAINS toLower($searchTerm)
           OR toLower(j.weight) CONTAINS toLower($searchTerm)
        RETURN j
        ORDER BY j.jobDate DESC
        LIMIT $limit
      `;
      
      const result = await context.neo4jService.runQuery(searchQuery, { 
        searchTerm: args.query, 
        limit: neo4j.int(limit)
      });
      
      return result.map((record: any) => ({
        ...record.j.properties,
        ticketIds: parseTicketIds(record.j.properties.ticketIds), // Convert string to array
        createdAt: new Date(record.j.properties.createdAt),
        updatedAt: new Date(record.j.properties.updatedAt),
      }));
    },

    // Invoice queries for simplified structure
    invoices: async (
      _parent: any,
      args: { pagination?: PaginationInput },
      context: GraphQLContext
    ) => {
      const page = args.pagination?.page || 1;
      const limit = args.pagination?.limit || 10;
      const offset = args.pagination?.offset || (page - 1) * limit;

      const query = `
        MATCH (i:Invoice)
        RETURN i
        ORDER BY i.createdAt DESC
        SKIP $offset LIMIT $limit
      `;
      const result = await context.neo4jService.runQuery(query, { 
        offset: neo4j.int(offset), 
        limit: neo4j.int(limit) 
      });
      return result.map((record: any) => {
        const props = record.i.properties;
        return {
          ...props,
          createdAt: parseDate(props.createdAt),
          updatedAt: parseDate(props.updatedAt),
          invoiceDate: parseDate(props.invoiceDate),
        };
      });
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
      if (!result[0]?.i.properties) return null;
      
      const props = result[0].i.properties;
      return {
        ...props,
        createdAt: parseDate(props.createdAt),
        updatedAt: parseDate(props.updatedAt),
        invoiceDate: parseDate(props.invoiceDate),
      };
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

    createJob: async (
      _parent: any,
      args: { input: any },
      context: GraphQLContext
    ) => {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const query = `
        CREATE (j:Job {
          id: $id,
          jobDate: $jobDate,
          invoiceStatus: $invoiceStatus,
          weight: $weight,
          loads: $loads,
          startTime: $startTime,
          endTime: $endTime,
          ticketIds: $ticketIds,
          paymentReceived: $paymentReceived,
          driverPaid: $driverPaid,
          imageUrls: $imageUrls,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        RETURN j
      `;
      
      const params = {
        id: jobId,
        jobDate: args.input.jobDate || null,
        invoiceStatus: args.input.invoiceStatus || "pending",
        weight: args.input.weight || null,
        loads: neo4j.int(args.input.loads || 0),
        startTime: args.input.startTime || null,
        endTime: args.input.endTime || null,
        ticketIds: args.input.ticketIds || [],
        paymentReceived: args.input.paymentReceived || false,
        driverPaid: args.input.driverPaid || false,
        imageUrls: args.input.imageUrls || []
      };

      const result = await context.neo4jService.runQuery(query, params);
      
      // Create relationships if provided
      if (args.input.jobTypeId) {
        await context.neo4jService.runQuery(
          `MATCH (j:Job {id: $jobId}), (jt:JobType {id: $jobTypeId})
           CREATE (j)-[:OF_TYPE]->(jt)`,
          { jobId, jobTypeId: args.input.jobTypeId }
        );
      }
      
      if (args.input.driverId) {
        await context.neo4jService.runQuery(
          `MATCH (j:Job {id: $jobId}), (d:Driver {id: $driverId})
           CREATE (j)-[:ASSIGNED_TO]->(d)`,
          { jobId, driverId: args.input.driverId }
        );
      }
      
      if (args.input.dispatcherId) {
        await context.neo4jService.runQuery(
          `MATCH (j:Job {id: $jobId}), (d:Dispatcher {id: $dispatcherId})
           CREATE (j)-[:MANAGED_BY]->(d)`,
          { jobId, dispatcherId: args.input.dispatcherId }
        );
      }
      
      if (args.input.unitId) {
        await context.neo4jService.runQuery(
          `MATCH (j:Job {id: $jobId}), (u:Unit {id: $unitId})
           CREATE (j)-[:USES_UNIT]->(u)`,
          { jobId, unitId: args.input.unitId }
        );
      }

      return {
        ...result[0].j.properties,
        createdAt: new Date(result[0].j.properties.createdAt),
        updatedAt: new Date(result[0].j.properties.updatedAt),
      };
    },

    updateJob: async (
      _parent: any,
      args: { input: any },
      context: GraphQLContext
    ) => {
      const { id, ...updates } = args.input;
      
      // Build dynamic update query
      const updateFields = [];
      const params: any = { id };
      
      if (updates.jobDate !== undefined) {
        updateFields.push('j.jobDate = $jobDate');
        params.jobDate = updates.jobDate;
      }
      if (updates.weight !== undefined) {
        updateFields.push('j.weight = $weight');
        params.weight = updates.weight;
      }
      if (updates.loads !== undefined) {
        updateFields.push('j.loads = $loads');
        params.loads = neo4j.int(updates.loads);
      }
      if (updates.startTime !== undefined) {
        updateFields.push('j.startTime = $startTime');
        params.startTime = updates.startTime;
      }
      if (updates.endTime !== undefined) {
        updateFields.push('j.endTime = $endTime');
        params.endTime = updates.endTime;
      }
      if (updates.invoiceStatus !== undefined) {
        updateFields.push('j.invoiceStatus = $invoiceStatus');
        params.invoiceStatus = updates.invoiceStatus;
      }
      if (updates.paymentReceived !== undefined) {
        updateFields.push('j.paymentReceived = $paymentReceived');
        params.paymentReceived = updates.paymentReceived;
      }
      if (updates.driverPaid !== undefined) {
        updateFields.push('j.driverPaid = $driverPaid');
        params.driverPaid = updates.driverPaid;
      }
      if (updates.ticketIds !== undefined) {
        updateFields.push('j.ticketIds = $ticketIds');
        params.ticketIds = updates.ticketIds;
      }
      if (updates.imageUrls !== undefined) {
        updateFields.push('j.imageUrls = $imageUrls');
        params.imageUrls = updates.imageUrls;
      }
      if (updates.amount !== undefined) {
        updateFields.push('j.amount = $amount');
        params.amount = updates.amount;
      }
      
      updateFields.push('j.updatedAt = datetime()');
      
      const query = `
        MATCH (j:Job {id: $id})
        SET ${updateFields.join(', ')}
        RETURN j
      `;
      
      const result = await context.neo4jService.runQuery(query, params);
      
      // Handle relationship updates
      if (updates.jobTypeId) {
        await context.neo4jService.runQuery(
          `MATCH (j:Job {id: $id})
           OPTIONAL MATCH (j)-[r:OF_TYPE]->()
           DELETE r`,
          { id }
        );
        await context.neo4jService.runQuery(
          `MATCH (j:Job {id: $id}), (jt:JobType {id: $jobTypeId})
           CREATE (j)-[:OF_TYPE]->(jt)`,
          { id, jobTypeId: updates.jobTypeId }
        );
      }
      
      if (updates.driverId) {
        await context.neo4jService.runQuery(
          `MATCH (j:Job {id: $id})
           OPTIONAL MATCH (j)-[r:ASSIGNED_TO]->()
           DELETE r`,
          { id }
        );
        await context.neo4jService.runQuery(
          `MATCH (j:Job {id: $id}), (d:Driver {id: $driverId})
           CREATE (j)-[:ASSIGNED_TO]->(d)`,
          { id, driverId: updates.driverId }
        );
      }
      
      if (updates.dispatcherId) {
        await context.neo4jService.runQuery(
          `MATCH (j:Job {id: $id})
           OPTIONAL MATCH (j)-[r:MANAGED_BY]->()
           DELETE r`,
          { id }
        );
        await context.neo4jService.runQuery(
          `MATCH (j:Job {id: $id}), (d:Dispatcher {id: $dispatcherId})
           CREATE (j)-[:MANAGED_BY]->(d)`,
          { id, dispatcherId: updates.dispatcherId }
        );
      }
      
      if (updates.unitId) {
        await context.neo4jService.runQuery(
          `MATCH (j:Job {id: $id})
           OPTIONAL MATCH (j)-[r:USES_UNIT]->()
           DELETE r`,
          { id }
        );
        await context.neo4jService.runQuery(
          `MATCH (j:Job {id: $id}), (u:Unit {id: $unitId})
           CREATE (j)-[:USES_UNIT]->(u)`,
          { id, unitId: updates.unitId }
        );
      }

      return {
        ...result[0].j.properties,
        ticketIds: parseTicketIds(result[0].j.properties.ticketIds), // Convert string to array
        createdAt: new Date(result[0].j.properties.createdAt),
        updatedAt: new Date(result[0].j.properties.updatedAt),
      };
    },

    updateJobStatus: async (
      _parent: any,
      args: { id: string; status: string },
      context: GraphQLContext
    ) => {
      const query = `
        MATCH (j:Job {id: $id})
        SET j.invoiceStatus = $status, j.updatedAt = datetime()
        RETURN j
      `;
      const result = await context.neo4jService.runQuery(query, args);
      return {
        ...result[0].j.properties,
        createdAt: new Date(result[0].j.properties.createdAt),
        updatedAt: new Date(result[0].j.properties.updatedAt),
      };
    },

    markJobPaid: async (
      _parent: any,
      args: { id: string; driverPaid: boolean; paymentReceived: boolean },
      context: GraphQLContext
    ) => {
      const query = `
        MATCH (j:Job {id: $id})
        SET j.driverPaid = $driverPaid, j.paymentReceived = $paymentReceived, j.updatedAt = datetime()
        RETURN j
      `;
      const result = await context.neo4jService.runQuery(query, args);
      return {
        ...result[0].j.properties,
        createdAt: new Date(result[0].j.properties.createdAt),
        updatedAt: new Date(result[0].j.properties.updatedAt),
      };
    },

    assignJobToDriver: async (
      _parent: any,
      args: { jobId: string; driverId: string },
      context: GraphQLContext
    ) => {
      // Remove existing driver assignment
      await context.neo4jService.runQuery(
        `MATCH (j:Job {id: $jobId})-[r:ASSIGNED_TO]->()
         DELETE r`,
        { jobId: args.jobId }
      );
      
      // Create new assignment
      await context.neo4jService.runQuery(
        `MATCH (j:Job {id: $jobId}), (d:Driver {id: $driverId})
         CREATE (j)-[:ASSIGNED_TO]->(d)`,
        args
      );
      
      // Return updated job
      const query = `
        MATCH (j:Job {id: $jobId})
        SET j.updatedAt = datetime()
        RETURN j
      `;
      const result = await context.neo4jService.runQuery(query, { jobId: args.jobId });
      return {
        ...result[0].j.properties,
        createdAt: new Date(result[0].j.properties.createdAt),
        updatedAt: new Date(result[0].j.properties.updatedAt),
      };
    },

    assignJobToDispatcher: async (
      _parent: any,
      args: { jobId: string; dispatcherId: string },
      context: GraphQLContext
    ) => {
      // Remove existing dispatcher assignment
      await context.neo4jService.runQuery(
        `MATCH (j:Job {id: $jobId})-[r:MANAGED_BY]->()
         DELETE r`,
        { jobId: args.jobId }
      );
      
      // Create new assignment
      await context.neo4jService.runQuery(
        `MATCH (j:Job {id: $jobId}), (d:Dispatcher {id: $dispatcherId})
         CREATE (j)-[:MANAGED_BY]->(d)`,
        args
      );
      
      // Return updated job
      const query = `
        MATCH (j:Job {id: $jobId})
        SET j.updatedAt = datetime()
        RETURN j
      `;
      const result = await context.neo4jService.runQuery(query, { jobId: args.jobId });
      return {
        ...result[0].j.properties,
        createdAt: new Date(result[0].j.properties.createdAt),
        updatedAt: new Date(result[0].j.properties.updatedAt),
      };
    },

    assignJobToUnit: async (
      _parent: any,
      args: { jobId: string; unitId: string },
      context: GraphQLContext
    ) => {
      // Remove existing unit assignment
      await context.neo4jService.runQuery(
        `MATCH (j:Job {id: $jobId})-[r:USES_UNIT]->()
         DELETE r`,
        { jobId: args.jobId }
      );
      
      // Create new assignment
      await context.neo4jService.runQuery(
        `MATCH (j:Job {id: $jobId}), (u:Unit {id: $unitId})
         CREATE (j)-[:USES_UNIT]->(u)`,
        args
      );
      
      // Return updated job
      const query = `
        MATCH (j:Job {id: $jobId})
        SET j.updatedAt = datetime()
        RETURN j
      `;
      const result = await context.neo4jService.runQuery(query, { jobId: args.jobId });
      return {
        ...result[0].j.properties,
        createdAt: new Date(result[0].j.properties.createdAt),
        updatedAt: new Date(result[0].j.properties.updatedAt),
      };
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

    invoice: async (parent: any, _args: any, context: GraphQLContext) => {
      const query = `
        MATCH (j:Job {id: $jobId})-[:HAS_INVOICE]->(i:Invoice)
        RETURN i
      `;
      const result = await context.neo4jService.runQuery(query, { jobId: parent.id });
      return result[0]?.i.properties;
    },

    amount: async (parent: any, _args: any, _context: GraphQLContext) => {
      return await CalculationService.calculateJobAmount(parent.id);
    },

    calculatedAmount: async (parent: any, _args: any, _context: GraphQLContext) => {
      return await CalculationService.calculateJobAmount(parent.id);
    },

    calculatedHours: async (parent: any, _args: any, _context: GraphQLContext) => {
      return CalculationService.calculateJobHours(parent);
    },
  },
};
