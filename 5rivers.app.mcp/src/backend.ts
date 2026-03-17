/**
 * GraphQL client for 5rivers.app backend.
 * Used by MCP tools to fetch jobs, invoices, dashboard stats.
 */
import { GraphQLClient, gql } from "graphql-request";

const GET_JOBS = gql`
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

const GET_JOB = gql`
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

const SEARCH_JOBS = gql`
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

const GET_DASHBOARD_STATS = gql`
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

const GET_INVOICES = gql`
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

export interface BackendConfig {
  graphqlEndpoint: string;
  authToken?: string;
}

export function createBackendClient(config: BackendConfig) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.authToken) {
    headers["Authorization"] = `Bearer ${config.authToken}`;
  }
  const client = new GraphQLClient(config.graphqlEndpoint, { headers });

  return {
    async getJobs(filters: {
      dateFrom?: string;
      dateTo?: string;
      driverId?: string;
      dispatcherId?: string;
      invoiceStatus?: string;
    }, pagination: { page?: number; limit?: number }) {
      const { jobs } = await client.request<{ jobs: { nodes: unknown[]; totalCount: number; hasNextPage?: boolean; hasPreviousPage?: boolean } }>(GET_JOBS, {
        filters: filters || {},
        pagination: { page: pagination?.page ?? 1, limit: Math.min(pagination?.limit ?? 50, 100) },
      });
      return jobs;
    },

    async getJob(id: string) {
      const { job } = await client.request<{ job: unknown }>(GET_JOB, { id });
      return job;
    },

    async searchJobs(query: string, limit = 10) {
      const { searchJobs: results } = await client.request<{ searchJobs: unknown[] }>(SEARCH_JOBS, {
        query,
        limit: Math.min(limit, 50),
      });
      return results;
    },

    async getDashboardStats(year?: number, month?: number) {
      const { dashboardStats } = await client.request<{ dashboardStats: unknown }>(GET_DASHBOARD_STATS, {
        year: year ?? undefined,
        month: month ?? undefined,
      });
      return dashboardStats;
    },

    async getInvoices(dispatcherId?: string, status?: string, limit = 20) {
      const { invoices } = await client.request<{ invoices: unknown[] }>(GET_INVOICES, {
        dispatcherId: dispatcherId ?? null,
        status: status ?? null,
        pagination: { page: 1, limit },
      });
      return invoices;
    },
  };
}
