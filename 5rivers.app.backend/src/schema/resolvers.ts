import { DateTimeResolver } from 'graphql-scalars';
import { GraphQLContext } from '../types/context';
import { companyService } from '../services/companyService';
import CalculationService from '../services/calculationService';
import PDFService from '../services/pdfService';
import { Neo4jService } from '../database/neo4j';
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

// Helper function to convert weight from string/mixed to float array format for backward compatibility
const parseWeights = (weight: any): number[] => {
  if (!weight) return [];
  
  // Already an array of numbers
  if (Array.isArray(weight)) {
    return weight.map((w: any) => parseFloat(w) || 0).filter((w: number) => !isNaN(w));
  }
  
  // If it's a number
  if (typeof weight === 'number') {
    return [weight];
  }
  
  // If it's a string, parse it
  if (typeof weight === 'string') {
    // Try to parse as JSON array first
    if (weight.trim().startsWith('[') && weight.trim().endsWith(']')) {
      try {
        const parsed = JSON.parse(weight);
        if (Array.isArray(parsed)) {
          return parsed.map((w: any) => parseFloat(w) || 0).filter((w: number) => !isNaN(w));
        }
      } catch {
        // Fall through to space-separated parsing
      }
    }
    
    // Split by spaces and parse each weight
    return weight.split(' ')
      .map((w: string) => parseFloat(w.trim()) || 0)
      .filter((w: number) => !isNaN(w));
  }
  
  // Try to parse as string
  try {
    const numValue = parseFloat(String(weight));
    return isNaN(numValue) ? [] : [numValue];
  } catch (error) {
    console.warn(`Could not parse weight: ${weight}`, error);
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
        weight: parseWeights(record.j.properties.weight), // Convert string/mixed to array
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
        weight: parseWeights(record.j.properties.weight), // Convert string/mixed to array
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
      args: { year?: number; month?: number },
      context: GraphQLContext
    ) => {
      try {
        // Get current date components or use provided ones
        const now = new Date();
        const currentYear = args.year || now.getFullYear();
        const currentMonth = args.month || (now.getMonth() + 1); // JavaScript months are 0-indexed
        
        // Get previous month components
        const previousDate = new Date(currentYear, currentMonth - 2); // -2 because month is 1-indexed
        const previousYear = previousDate.getFullYear();
        const previousMonth = previousDate.getMonth() + 1;

        // Helper function to get monthly stats
        const getMonthlyStats = async (year: number, month: number) => {
          const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
          const endDate = month === 12 
            ? `${year + 1}-01-01` 
            : `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

          // Get job stats for the month
          const jobStatsQuery = `
            MATCH (j:Job)
            WHERE j.jobDate >= $startDate AND j.jobDate < $endDate
            RETURN 
              count(j) as totalJobs,
              sum(j.calculatedAmount) as totalAmount,
              avg(j.calculatedAmount) as averageJobValue
          `;

          // Get dispatcher count
          const dispatcherQuery = `
            MATCH (d:Dispatcher)
            OPTIONAL MATCH (d)-[:DISPATCHED]->(j:Job)
            WHERE j.jobDate >= $startDate AND j.jobDate < $endDate
            RETURN count(DISTINCT d) as totalDispatchers
          `;

          // Get driver count
          const driverQuery = `
            MATCH (dr:Driver)
            OPTIONAL MATCH (dr)-[:DROVE]->(j:Job)
            WHERE j.jobDate >= $startDate AND j.jobDate < $endDate
            RETURN count(DISTINCT dr) as totalDrivers
          `;

          // Get invoice count
          const invoiceQuery = `
            MATCH (i:Invoice)
            WHERE i.invoiceDate >= $startDate AND i.invoiceDate < $endDate
            RETURN count(i) as totalInvoices
          `;

          const [jobResult, dispatcherResult, driverResult, invoiceResult] = await Promise.all([
            context.neo4jService.runQuery(jobStatsQuery, { startDate, endDate }),
            context.neo4jService.runQuery(dispatcherQuery, { startDate, endDate }),
            context.neo4jService.runQuery(driverQuery, { startDate, endDate }),
            context.neo4jService.runQuery(invoiceQuery, { startDate, endDate })
          ]);

          const jobStats = jobResult[0] || {};
          const dispatcherStats = dispatcherResult[0] || {};
          const driverStats = driverResult[0] || {};
          const invoiceStats = invoiceResult[0] || {};

          return {
            totalJobs: jobStats.totalJobs?.low || jobStats.totalJobs || 0,
            totalDispatchers: dispatcherStats.totalDispatchers?.low || dispatcherStats.totalDispatchers || 0,
            totalDrivers: driverStats.totalDrivers?.low || driverStats.totalDrivers || 0,
            totalInvoices: invoiceStats.totalInvoices?.low || invoiceStats.totalInvoices || 0,
            totalAmount: jobStats.totalAmount || 0,
            averageJobValue: jobStats.averageJobValue || 0
          };
        };

        // Get current and previous month stats
        const [currentStats, previousStats] = await Promise.all([
          getMonthlyStats(currentYear, currentMonth),
          getMonthlyStats(previousYear, previousMonth)
        ]);

        // Calculate percentage changes
        const calculatePercentageChange = (current: number, previous: number) => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };

        const monthlyComparison = {
          current: currentStats,
          previous: previousStats,
          percentageChange: calculatePercentageChange(currentStats.totalAmount, previousStats.totalAmount),
          jobsChange: currentStats.totalJobs - previousStats.totalJobs,
          amountChange: currentStats.totalAmount - previousStats.totalAmount
        };

        // Get overall stats
        const overallStatsQuery = `
          MATCH (j:Job)
          OPTIONAL MATCH (d:Dispatcher)
          OPTIONAL MATCH (dr:Driver)
          OPTIONAL MATCH (i:Invoice)
          OPTIONAL MATCH (c:Company)
          RETURN 
            count(DISTINCT j) as totalJobs,
            count(DISTINCT d) as totalDispatchers,
            count(DISTINCT dr) as totalDrivers,
            count(DISTINCT i) as totalInvoices,
            count(DISTINCT c) as totalCompanies,
            sum(j.calculatedAmount) as totalAmount,
            avg(j.calculatedAmount) as averageJobValue
        `;

        const overallResult = await context.neo4jService.runQuery(overallStatsQuery, {});
        const overallData = overallResult[0] || {};

        const overallStats = {
          totalJobs: overallData.totalJobs?.low || overallData.totalJobs || 0,
          totalDispatchers: overallData.totalDispatchers?.low || overallData.totalDispatchers || 0,
          totalDrivers: overallData.totalDrivers?.low || overallData.totalDrivers || 0,
          totalInvoices: overallData.totalInvoices?.low || overallData.totalInvoices || 0,
          totalCompanies: overallData.totalCompanies?.low || overallData.totalCompanies || 0,
          totalAmount: overallData.totalAmount || 0,
          averageJobValue: overallData.averageJobValue || 0
        };

        // Get recent jobs (last 10)
        const recentJobsQuery = `
          MATCH (j:Job)
          OPTIONAL MATCH (j)-[:BELONGS_TO]->(jt:JobType)
          OPTIONAL MATCH (jt)-[:BELONGS_TO]->(c:Company)
          OPTIONAL MATCH (j)-[:DROVE]-(dr:Driver)
          OPTIONAL MATCH (j)-[:DISPATCHED]-(d:Dispatcher)
          RETURN j, jt, c, dr, d
          ORDER BY j.jobDate DESC, j.createdAt DESC
          LIMIT 10
        `;

        const recentJobsResult = await context.neo4jService.runQuery(recentJobsQuery, {});
        const recentJobs = recentJobsResult.map((record: any) => ({
          ...record.j.properties,
          ticketIds: parseTicketIds(record.j.properties.ticketIds),
          weight: Array.isArray(record.j.properties.weight) 
            ? record.j.properties.weight 
            : record.j.properties.weight ? [parseFloat(record.j.properties.weight)] : [],
          createdAt: new Date(record.j.properties.createdAt),
          updatedAt: new Date(record.j.properties.updatedAt),
          jobType: record.jt ? {
            ...record.jt.properties,
            company: record.c ? record.c.properties : null
          } : null,
          driver: record.dr ? record.dr.properties : null,
          dispatcher: record.d ? record.d.properties : null
        }));

        // Get top companies by job volume
        const topCompaniesQuery = `
          MATCH (c:Company)<-[:BELONGS_TO]-(jt:JobType)<-[:BELONGS_TO]-(j:Job)
          RETURN c, count(j) as jobCount
          ORDER BY jobCount DESC
          LIMIT 5
        `;

        const topCompaniesResult = await context.neo4jService.runQuery(topCompaniesQuery, {});
        const topCompanies = topCompaniesResult.map((record: any) => record.c.properties);

        return {
          monthlyComparison,
          overallStats,
          recentJobs,
          topCompanies
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        // Return default values in case of error
        const defaultStats = {
          totalJobs: 0,
          totalDispatchers: 0,
          totalDrivers: 0,
          totalInvoices: 0,
          totalAmount: 0,
          averageJobValue: 0
        };

        return {
          monthlyComparison: {
            current: { ...defaultStats, totalCompanies: 0 },
            previous: { ...defaultStats, totalCompanies: 0 },
            percentageChange: 0,
            jobsChange: 0,
            amountChange: 0
          },
          overallStats: { ...defaultStats, totalCompanies: 0 },
          recentJobs: [],
          topCompanies: []
        };
      }
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

      // Calculate and set the calculatedAmount for the job
      try {
        const calculatedAmount = await CalculationService.calculateJobAmount(jobId);
        await context.neo4jService.runQuery(
          `MATCH (j:Job {id: $jobId})
           SET j.calculatedAmount = $calculatedAmount`,
          { jobId, calculatedAmount }
        );
      } catch (error) {
        console.warn(`Warning: Could not calculate amount for new job ${jobId}:`, error);
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

      // Recalculate and update the calculatedAmount after any job update
      try {
        const calculatedAmount = await CalculationService.calculateJobAmount(id);
        await context.neo4jService.runQuery(
          `MATCH (j:Job {id: $id})
           SET j.calculatedAmount = $calculatedAmount`,
          { id, calculatedAmount }
        );
      } catch (error) {
        console.warn(`Warning: Could not recalculate amount for job ${id}:`, error);
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

    downloadInvoicePDF: async (_parent: any, args: { invoiceId: string }, context: GraphQLContext) => {
      try {
        const pdfService = new PDFService();
        const pdfBuffer = await pdfService.generateInvoicePDF(args.invoiceId);
        await pdfService.close();
        
        // Return base64 encoded PDF
        return {
          success: true,
          data: pdfBuffer.toString('base64'),
          filename: `invoice-${args.invoiceId}.pdf`
        };
      } catch (error) {
        console.error('Error generating invoice PDF:', error);
        return {
          success: false,
          error: 'Failed to generate PDF'
        };
      }
    },

    validateAndFixJobAmounts: async (_parent: any, args: { invoiceId?: string }, context: GraphQLContext) => {
      try {
        const { JobAmountValidationService } = await import('../services/jobAmountValidationService');
        const validationService = new JobAmountValidationService();
        
        if (args.invoiceId) {
          const result = await validationService.validateInvoiceJobAmounts(args.invoiceId);
          await validationService.close();
          return {
            success: true,
            message: `Validated ${result.totalJobs} jobs, fixed ${result.fixedJobs} discrepancies`,
            data: result
          };
        } else {
          // Validate all jobs (limit to prevent timeouts)
          const query = `
            MATCH (j:Job)-[r:INVOICED_IN]->(i:Invoice)
            RETURN j.id as jobId
            LIMIT 100
          `;
          const jobs = await context.neo4jService.runQuery(query);
          
          let fixedCount = 0;
          for (const job of jobs) {
            const validation = await validationService.validateAndFixJobAmount(job.jobId);
            if (validation.wasFixed) fixedCount++;
          }
          
          await validationService.close();
          return {
            success: true,
            message: `Validated ${jobs.length} jobs, fixed ${fixedCount} discrepancies`,
            data: { totalJobs: jobs.length, fixedJobs: fixedCount }
          };
        }
      } catch (error) {
        console.error('Error validating job amounts:', error);
        return {
          success: false,
          error: 'Failed to validate job amounts'
        };
      }
    },

    createDriver: async (
      _parent: any,
      args: { input: any },
      context: GraphQLContext
    ) => {
      const driverId = `driver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const query = `
        CREATE (d:Driver {
          id: $id,
          name: $name,
          description: $description,
          email: $email,
          phone: $phone,
          hourlyRate: $hourlyRate,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        RETURN d
      `;
      
      const params = {
        id: driverId,
        name: args.input.name,
        description: args.input.description || null,
        email: args.input.email,
        phone: args.input.phone || null,
        hourlyRate: args.input.hourlyRate
      };

      const result = await context.neo4jService.runQuery(query, params);
      
      return {
        ...result[0].d.properties,
        createdAt: new Date(result[0].d.properties.createdAt),
        updatedAt: new Date(result[0].d.properties.updatedAt),
      };
    },

    updateDriver: async (
      _parent: any,
      args: { input: any },
      context: GraphQLContext
    ) => {
      const { id, ...updates } = args.input;
      
      // Build dynamic update query
      const updateFields = [];
      const params: any = { id };
      
      if (updates.name !== undefined) {
        updateFields.push('d.name = $name');
        params.name = updates.name;
      }
      if (updates.description !== undefined) {
        updateFields.push('d.description = $description');
        params.description = updates.description;
      }
      if (updates.email !== undefined) {
        updateFields.push('d.email = $email');
        params.email = updates.email;
      }
      if (updates.phone !== undefined) {
        updateFields.push('d.phone = $phone');
        params.phone = updates.phone;
      }
      if (updates.hourlyRate !== undefined) {
        updateFields.push('d.hourlyRate = $hourlyRate');
        params.hourlyRate = updates.hourlyRate;
      }
      
      updateFields.push('d.updatedAt = datetime()');
      
      const query = `
        MATCH (d:Driver {id: $id})
        SET ${updateFields.join(', ')}
        RETURN d
      `;
      
      const result = await context.neo4jService.runQuery(query, params);
      
      if (result.length === 0) {
        throw new Error(`Driver with id ${id} not found`);
      }
      
      return {
        ...result[0].d.properties,
        createdAt: new Date(result[0].d.properties.createdAt),
        updatedAt: new Date(result[0].d.properties.updatedAt),
      };
    },

    deleteDriver: async (
      _parent: any,
      args: { id: string },
      context: GraphQLContext
    ) => {
      const query = `
        MATCH (d:Driver {id: $id})
        DETACH DELETE d
        RETURN true as deleted
      `;
      
      const result = await context.neo4jService.runQuery(query, args);
      
      if (result.length === 0) {
        throw new Error(`Driver with id ${args.id} not found`);
      }
      
      return true;
    },

    // ...existing code...
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
      
      // Import validation service to ensure amounts are correct
      const { JobAmountValidationService } = await import('../services/jobAmountValidationService');
      const validationService = new JobAmountValidationService();
      
      const jobs = [];
      
      for (const record of result) {
        try {
          // Validate and fix the job amount if needed
          const validation = await validationService.validateAndFixJobAmount(record.j.properties.id);
          
          if (validation.wasFixed) {
            console.log(`✅ Fixed job amount discrepancy for job ${record.j.properties.id} in invoice ${parent.id}`);
          }
          
          jobs.push({
            job: {
              ...record.j.properties,
              calculatedAmount: validation.calculatedAmount
            },
            amount: validation.calculatedAmount, // Always use calculated amount
            invoicedAt: record.invoicedAt
          });
        } catch (error) {
          console.warn(`Error validating job ${record.j.properties.id}:`, error);
          // Fall back to original data
          jobs.push({
            job: record.j.properties,
            amount: record.amount,
            invoicedAt: record.invoicedAt
          });
        }
      }
      
      await validationService.close();
      return jobs;
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
      try {
        return await CalculationService.calculateJobAmount(parent.id);
      } catch (error) {
        console.warn(`Error calculating job amount for ${parent.id}:`, error);
        return 0;
      }
    },

    calculatedHours: async (parent: any, _args: any, _context: GraphQLContext) => {
      return CalculationService.calculateJobHours(parent);
    },

    driverPay: async (parent: any, _args: any, _context: GraphQLContext) => {
      return await CalculationService.calculateDriverPay(parent.id);
    },
  },
};
