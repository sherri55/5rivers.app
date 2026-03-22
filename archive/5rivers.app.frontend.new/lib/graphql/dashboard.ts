import { gql } from '@apollo/client';

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
          totalAmount
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
        invoiceStatus
        startTime
        calculatedAmount
        jobType {
          id
          title
          startLocation
          endLocation
          company { id name }
        }
        driver { id name }
      }
      topCompanies {
        id
        name
      }
    }
  }
`;
