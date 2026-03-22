import { gql } from '@apollo/client';

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
          startLocation
          endLocation
          company {
            id
            name
          }
        }
        driver {
          id
          name
          hourlyRate
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
`;
