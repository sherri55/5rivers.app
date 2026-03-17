/**
 * GraphQL client for 5rivers.app backend.
 * Used by MCP tools to fetch jobs, invoices, dashboard stats.
 */
import { GraphQLClient, gql } from "graphql-request";
const GET_JOBS = gql `
  query GetJobs($filters: JobFilters, $pagination: PaginationInput) {
    jobs(filters: $filters, pagination: $pagination) {
      nodes {
        id
        jobDate
        invoiceStatus
        weight
        loads
        startTime
        endTime
        calculatedAmount
        calculatedHours
        driverPay
        jobType { id title rateOfJob dispatchType company { id name } }
        driver { id name hourlyRate }
        dispatcher { id name }
        unit { id name }
        invoice { id invoiceNumber }
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
`;
const GET_JOB = gql `
  query GetJob($id: ID!) {
    job(id: $id) {
      id
      jobDate
      invoiceStatus
      weight
      loads
      startTime
      endTime
      calculatedAmount
      calculatedHours
      driverPay
      jobType { id title rateOfJob dispatchType company { id name } }
      driver { id name hourlyRate }
      dispatcher { id name }
      unit { id name }
      invoice { id invoiceNumber }
    }
  }
`;
const SEARCH_JOBS = gql `
  query SearchJobs($query: String!, $limit: Int) {
    searchJobs(query: $query, limit: $limit) {
      id
      jobDate
      calculatedAmount
      driverPay
      invoiceStatus
      jobType { id title company { id name } }
      driver { id name }
    }
  }
`;
const GET_DASHBOARD_STATS = gql `
  query GetDashboardStats($year: Int, $month: Int) {
    dashboardStats(year: $year, month: $month) {
      monthlyComparison {
        current { totalJobs totalAmount averageJobValue totalInvoices }
        previous { totalJobs totalAmount }
        percentageChange
        jobsChange
        amountChange
      }
      overallStats {
        totalJobs
        totalInvoices
        totalAmount
        averageJobValue
      }
    }
  }
`;
const GET_INVOICES = gql `
  query GetInvoices($dispatcherId: ID, $status: String, $pagination: PaginationInput) {
    invoices(dispatcherId: $dispatcherId, status: $status, pagination: $pagination) {
      id
      invoiceNumber
      invoiceDate
      status
      billedTo
      dispatcher { id name }
    }
  }
`;
export function createBackendClient(config) {
    const headers = {
        "Content-Type": "application/json",
    };
    if (config.authToken) {
        headers["Authorization"] = `Bearer ${config.authToken}`;
    }
    const client = new GraphQLClient(config.graphqlEndpoint, { headers });
    return {
        async getJobs(filters, pagination) {
            const { jobs } = await client.request(GET_JOBS, {
                filters: filters || {},
                pagination: { page: pagination?.page ?? 1, limit: Math.min(pagination?.limit ?? 50, 100) },
            });
            return jobs;
        },
        async getJob(id) {
            const { job } = await client.request(GET_JOB, { id });
            return job;
        },
        async searchJobs(query, limit = 10) {
            const { searchJobs: results } = await client.request(SEARCH_JOBS, {
                query,
                limit: Math.min(limit, 50),
            });
            return results;
        },
        async getDashboardStats(year, month) {
            const { dashboardStats } = await client.request(GET_DASHBOARD_STATS, {
                year: year ?? undefined,
                month: month ?? undefined,
            });
            return dashboardStats;
        },
        async getInvoices(dispatcherId, status, limit = 20) {
            const { invoices } = await client.request(GET_INVOICES, {
                dispatcherId: dispatcherId ?? null,
                status: status ?? null,
                pagination: { page: 1, limit },
            });
            return invoices;
        },
    };
}
