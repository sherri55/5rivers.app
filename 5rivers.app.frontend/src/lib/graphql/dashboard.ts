import { gql } from '@apollo/client'

// Dashboard Queries
export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats {
    dashboardStats {
      jobStats {
        totalJobs
        totalRevenue
        averageJobValue
        pendingJobs
        completedJobs
      }
      driverStats {
        totalDrivers
        activeDrivers
        totalHours
        totalEarnings
      }
      recentJobs {
        id
        jobDate
        calculatedAmount
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
      topCompanies {
        id
        name
        industry
        location
      }
    }
  }
`
