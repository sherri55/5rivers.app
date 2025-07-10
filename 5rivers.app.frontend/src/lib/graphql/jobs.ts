import { gql } from '@apollo/client'

// Job Queries
export const GET_JOBS = gql`
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
        amount
        ticketIds
        paymentReceived
        driverPaid
        imageUrls
        calculatedAmount
        calculatedHours
        driverPay
        createdAt
        updatedAt
        jobType {
          id
          title
          rateOfJob
          dispatchType
          company {
            id
            name
          }
        }
        driver {
          id
          name
        }
        dispatcher {
          id
          name
        }
        unit {
          id
          name
        }
        invoice {
          id
          invoiceNumber
        }
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
`

export const GET_JOB = gql`
  query GetJob($id: ID!) {
    job(id: $id) {
      id
      jobDate
      invoiceStatus
      weight
      loads
      startTime
      endTime
      ticketIds
      paymentReceived
      driverPaid
      imageUrls
      calculatedAmount
      calculatedHours
      driverPay
      createdAt
      updatedAt
      jobType {
        id
        title
        startLocation
        endLocation
        dispatchType
        rateOfJob
        company {
          id
          name
        }
      }
      driver {
        id
        name
        email
        hourlyRate
      }
      dispatcher {
        id
        name
        email
        commissionPercent
      }
      unit {
        id
        name
        plateNumber
        color
      }
      invoice {
        id
        invoiceNumber
        invoiceDate
        status
      }
    }
  }
`

export const SEARCH_JOBS = gql`
  query SearchJobs($query: String!, $limit: Int) {
    searchJobs(query: $query, limit: $limit) {
      id
      jobDate
      calculatedAmount
      driverPay
      invoiceStatus
      jobType {
        id
        title
        company {
          id
          name
        }
      }
      driver {
        id
        name
      }
    }
  }
`

// Job Mutations
export const CREATE_JOB = gql`
  mutation CreateJob($input: CreateJobInput!) {
    createJob(input: $input) {
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
      createdAt
      updatedAt
      jobType {
        id
        title
        company {
          id
          name
        }
      }
      driver {
        id
        name
      }
      dispatcher {
        id
        name
      }
      unit {
        id
        name
      }
    }
  }
`

export const UPDATE_JOB_STATUS = gql`
  mutation UpdateJobStatus($id: ID!, $status: String!) {
    updateJobStatus(id: $id, status: $status) {
      id
      invoiceStatus
      updatedAt
    }
  }
`

export const MARK_JOB_PAID = gql`
  mutation MarkJobPaid($id: ID!, $driverPaid: Boolean!, $paymentReceived: Boolean!) {
    markJobPaid(id: $id, driverPaid: $driverPaid, paymentReceived: $paymentReceived) {
      id
      driverPaid
      paymentReceived
      updatedAt
    }
  }
`

export const ASSIGN_JOB_TO_DRIVER = gql`
  mutation AssignJobToDriver($jobId: ID!, $driverId: ID!) {
    assignJobToDriver(jobId: $jobId, driverId: $driverId) {
      id
      driver {
        id
        name
      }
      updatedAt
    }
  }
`

export const ASSIGN_JOB_TO_UNIT = gql`
  mutation AssignJobToUnit($jobId: ID!, $unitId: ID!) {
    assignJobToUnit(jobId: $jobId, unitId: $unitId) {
      id
      unit {
        id
        name
      }
      updatedAt
    }
  }
`

export const ASSIGN_JOB_TO_DISPATCHER = gql`
  mutation AssignJobToDispatcher($jobId: ID!, $dispatcherId: ID!) {
    assignJobToDispatcher(jobId: $jobId, dispatcherId: $dispatcherId) {
      id
      dispatcher {
        id
        name
      }
      updatedAt
    }
  }
`

export const UPDATE_JOB = gql`
  mutation UpdateJob($input: UpdateJobInput!) {
    updateJob(input: $input) {
      id
      jobDate
      invoiceStatus
      weight
      loads
      startTime
      endTime
      amount
      ticketIds
      paymentReceived
      driverPaid
      imageUrls
      calculatedAmount
      calculatedHours
      driverPay
      updatedAt
      jobType {
        id
        title
        dispatchType
      }
      driver {
        id
        name
      }
      dispatcher {
        id
        name
      }
      unit {
        id
        name
      }
    }
  }
`
