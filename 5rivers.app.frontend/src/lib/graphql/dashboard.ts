import { gql } from '@apollo/client'

// Dashboard Queries
export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats($year: Int, $month: Int) {
    dashboardStats(year: $year, month: $month) {
      monthlyComparison {
        current {
          totalJobs
          totalDispatchers
          totalDrivers
          totalInvoices
          totalAmount
          averageJobValue
        }
        previous {
          totalJobs
          totalDispatchers
          totalDrivers
          totalInvoices
          totalAmount
          averageJobValue
        }
        percentageChange
        jobsChange
        amountChange
      }
      overallStats {
        totalJobs
        totalDispatchers
        totalDrivers
        totalInvoices
        totalAmount
        totalCompanies
        averageJobValue
      }
      recentJobs {
        id
        jobDate
        calculatedAmount
        driverPay
        invoiceStatus
        ticketIds
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
      }
      topCompanies {
        id
        name
        industry
        location
      }
    }
  }
`
