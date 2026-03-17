import { gql } from '@apollo/client'

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
        driverPaid
        imageUrls
        images
        calculatedAmount
        calculatedHours
        driverPay
        updatedAt
        jobType {
          id
          title
          rateOfJob
          dispatchType
          company { id name }
        }
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
      driverPaid
      imageUrls
      images
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
        company { id name }
      }
      driver { id name email hourlyRate }
      dispatcher { id name email commissionPercent }
      unit { id name plateNumber color }
      invoice { id invoiceNumber invoiceDate status }
    }
  }
`
