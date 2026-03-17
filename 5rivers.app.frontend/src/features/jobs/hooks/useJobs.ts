import { useQuery } from '@apollo/client'
import { GET_JOBS } from '../api'
import type { Job } from '../types'

export interface JobFilters {
  driverId?: string
  dispatcherId?: string
  unitId?: string
  jobTypeId?: string
  companyId?: string
  invoiceStatus?: string
  driverPaid?: boolean
  dateFrom?: string
  dateTo?: string
  dispatchType?: string
}

export interface UseJobsOptions {
  filters?: JobFilters
  limit?: number
}

export function useJobs(options: UseJobsOptions = {}) {
  const { filters, limit = 50 } = options

  const { data, loading, error, refetch } = useQuery(GET_JOBS, {
    variables: {
      filters,
      pagination: { page: 1, limit, offset: 0 },
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  })

  const jobs: Job[] = data?.jobs?.nodes ?? []

  return {
    jobs,
    totalCount: data?.jobs?.totalCount ?? 0,
    hasNextPage: data?.jobs?.hasNextPage ?? false,
    hasPreviousPage: data?.jobs?.hasPreviousPage ?? false,
    loading,
    error,
    refetch,
  }
}
