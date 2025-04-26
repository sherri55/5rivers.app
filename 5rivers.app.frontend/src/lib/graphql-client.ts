import { ApolloClient, InMemoryCache, gql } from "@apollo/client";

const client = new ApolloClient({
  uri: process.env.NEXT_PUBLIC_API_URL || "http://localhost:9999/api/graphql",
  cache: new InMemoryCache(),
});

// Export all GraphQL query and mutation constants
export const GET_JOBS = `
  query GetJobs {
    jobs {
      jobId
      title
      dateOfJob
      dispatchType
      driverId
      dispatcherId
      unitId
      jobTypeId
      startTimeForJob
      endTimeForJob
      startTimeForDriver
      endTimeForDriver
      loads
      weight
      ticketIds
      imageUrls
      jobGrossAmount
      invoiceStatus
    }
  }
`;

// Queries for JobType
export const GET_JOBTYPES = `
  query GetJobTypes {
    jobTypes {
      jobTypeId
      title
      dispatchType
      startLocation
      endLocation
      rateOfJob
      companyId
    }
  }
`;

// Mutation for creating a JobType
export const CREATE_JOBTYPE = `
  mutation CreateJobType($input: CreateJobTypeInput!) {
    createJobType(input: $input) {
      jobTypeId
      title
      dispatchType
      startLocation
      endLocation
      rateOfJob
      companyId
    }
  }
`;

// Mutation for updating a JobType
export const UPDATE_JOBTYPE = `
  mutation UpdateJobType($input: UpdateJobTypeInput!) {
    updateJobType(input: $input) {
      jobTypeId
      title
      dispatchType
      startLocation
      endLocation
      rateOfJob
      companyId
    }
  }
`;

// Mutation for deleting a JobType
export const DELETE_JOBTYPE = `
  mutation DeleteJobType($jobTypeId: ID!) {
    deleteJobType(jobTypeId: $jobTypeId)
  }
`;

export const CREATE_JOB = `
  mutation CreateJob($input: CreateJobInput!) {
    createJob(input: $input) {
      jobId
    }
  }
`;

export const UPDATE_JOB = `
  mutation UpdateJob($jobId: ID!, $input: UpdateJobInput!) {
    updateJob(jobId: $jobId, input: $input) {
      jobId
    }
  }
`;

export const DELETE_JOB = `
  mutation DeleteJob($jobId: ID!) {
    deleteJob(jobId: $jobId)
  }
`;

export const GET_COMPANIES = `
  query GetCompanies {
    companies {
      companyId
      name
      description
      email
      phone
    }
  }
`;

export const CREATE_COMPANY = `
  mutation CreateCompany($input: CreateCompanyInput!) {
    createCompany(input: $input) {
      companyId
      name
      description
      email
      phone
    }
  }
`;

export const UPDATE_COMPANY = `
  mutation UpdateCompany($input: UpdateCompanyInput!) {
    updateCompany(input: $input) {
      companyId
      name
      description
      email
      phone
    }
  }
`;

export const DELETE_COMPANY = `
  mutation DeleteCompany($companyId: ID!) {
    deleteCompany(companyId: $companyId)
  }
`;

export const GET_DISPATCHERS = `
  query GetDispatchers {
    dispatchers {
      dispatcherId
      name
      description
      email
      phone
      commission
    }
  }
`;

export const CREATE_DISPATCHER = `
  mutation CreateDispatcher($input: CreateDispatcherInput!) {
    createDispatcher(input: $input) {
      dispatcherId
      name
      description
      email
      phone
      commission
    }
  }
`;

export const UPDATE_DISPATCHER = `
  mutation UpdateDispatcher($input: UpdateDispatcherInput!) {
    updateDispatcher(input: $input) {
      dispatcherId
      name
      description
      email
      phone
      commission
    }
  }
`;

export const DELETE_DISPATCHER = `
  mutation DeleteDispatcher($dispatcherId: ID!) {
    deleteDispatcher(dispatcherId: $dispatcherId)
  }
`;

export const GET_DRIVERS = `
  query GetDrivers {
    drivers {
      driverId
      name
      description
      email
      phone
      hourlyRate
    }
  }
`;

export const CREATE_DRIVER = `
  mutation CreateDriver($input: CreateDriverInput!) {
    createDriver(input: $input) {
      driverId
      name
      description
      email
      phone
      hourlyRate
    }
  }
`;

export const UPDATE_DRIVER = `
  mutation UpdateDriver($input: UpdateDriverInput!) {
    updateDriver(input: $input) {
      driverId
      name
      description
      email
      phone
      hourlyRate
    }
  }
`;

export const DELETE_DRIVER = `
  mutation DeleteDriver($driverId: ID!) {
    deleteDriver(driverId: $driverId)
  }
`;

export const GET_INVOICES = `
  query GetInvoices {
    invoices {
      invoiceId
      invoiceNumber
      createdAt
      subTotal
      total
    }
  }
`;

export const CREATE_INVOICE = `
  mutation CreateInvoice($input: CreateInvoiceInput!) {
    createInvoice(input: $input) {
      invoiceId
      invoiceNumber
      createdAt
      subTotal
      dispatchPercent
      comm
      hst
      total
    }
  }
`;
export const DELETE_INVOICE = `
  mutation DeleteInvoice($invoiceId: ID!) {
    deleteInvoice(invoiceId: $invoiceId)
  }
`;

export const GET_UNITS = `
  query GetUnits {
    units {
      unitId
      name
      description
    }
  }
`;

export const CREATE_UNIT = `
  mutation CreateUnit($name: String!, $description: String) {
    createUnit(name: $name, description: $description) {
      unitId
      name
      description
    }
  }
`;

export const UPDATE_UNIT = `
  mutation UpdateUnit($unitId: ID!, $name: String!, $description: String) {
    updateUnit(unitId: $unitId, name: $name, description: $description) {
      unitId
      name
      description
    }
  }
`;

export const DELETE_UNIT = `
  mutation DeleteUnit($unitId: ID!) {
    deleteUnit(unitId: $unitId)
  }
`;

export const UPDATE_INVOICE_STATUS = `
  mutation UpdateInvoiceStatus($jobId: ID!, $status: String!) {
    UpdateJobInvoiceStatusInput(jobId: $jobId, status: $status) {
      jobId
      invoiceStatus
    }
  }`;

// InvoiceLine Queries and Mutations
export const GET_INVOICELINES_BY_INVOICE = `
  query GetInvoiceLinesByInvoice($invoiceId: ID!) {
    invoiceLinesByInvoice(invoiceId: $invoiceId) {
      invoiceLineId
      lineAmount
      createdAt
      updatedAt
      invoice
      job {
        jobId
        title
        dateOfJob
        dispatchType
        driverId
        dispatcherId
        unitId
        jobTypeId
        startTimeForJob
        endTimeForJob
        startTimeForDriver
        endTimeForDriver
        loads
        weight
        ticketIds
        imageUrls
        jobGrossAmount
        invoiceStatus
      }
    }
  }
`;

export const CREATE_INVOICELINE = `
  mutation CreateInvoiceLine($input: CreateInvoiceLineInput!) {
    createInvoiceLine(input: $input) {
      invoiceLineId
      lineAmount
      createdAt
      updatedAt
      invoice
      job {
        jobId
        title
      }
    }
  }
`;

export const UPDATE_INVOICELINE = `
  mutation UpdateInvoiceLine($invoiceLineId: ID!, $input: UpdateInvoiceLineInput!) {
    updateInvoiceLine(invoiceLineId: $invoiceLineId, input: $input) {
      invoiceLineId
      lineAmount
      updatedAt
    }
  }
`;

export const DELETE_INVOICELINE = `
  mutation DeleteInvoiceLine($invoiceLineId: ID!) {
    deleteInvoiceLine(invoiceLineId: $invoiceLineId)
  }
`;

// Generic query function
export async function fetchGraphQL(
  query: string,
  variables?: Record<string, any>
) {
  try {
    const result = await client.query({
      query: gql`
        ${query}
      `,
      variables,
    });
    return result.data;
  } catch (error) {
    console.error("GraphQL query error:", error);
    throw error;
  }
}

// Generic mutation function
export async function mutateGraphQL(
  mutation: string,
  variables?: Record<string, any>
) {
  try {
    const result = await client.mutate({
      mutation: gql`
        ${mutation}
      `,
      variables,
    });
    return result.data;
  } catch (error) {
    console.error("GraphQL mutation error:", error);
    throw error;
  }
}
