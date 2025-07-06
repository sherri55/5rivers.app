import { gql } from '@apollo/client'

// JobType Queries
export const GET_JOB_TYPES = gql`
  query GetJobTypes($companyId: ID, $pagination: PaginationInput) {
    jobTypes(companyId: $companyId, pagination: $pagination) {
      id
      title
      startLocation
      endLocation
      dispatchType
      rateOfJob
      createdAt
      updatedAt
      company {
        id
        name
      }
    }
  }
`

export const GET_JOB_TYPE = gql`
  query GetJobType($id: ID!) {
    jobType(id: $id) {
      id
      title
      startLocation
      endLocation
      dispatchType
      rateOfJob
      createdAt
      updatedAt
      company {
        id
        name
      }
      jobs {
        id
        jobDate
        calculatedAmount
        driver {
          id
          name
        }
      }
      driverRates {
        id
        hourlyRate
        percentageRate
        driver {
          id
          name
        }
      }
    }
  }
`

// JobType Mutations
export const CREATE_JOB_TYPE = gql`
  mutation CreateJobType($input: CreateJobTypeInput!) {
    createJobType(input: $input) {
      id
      title
      startLocation
      endLocation
      dispatchType
      rateOfJob
      createdAt
      updatedAt
      company {
        id
        name
      }
    }
  }
`

export const UPDATE_JOB_TYPE = gql`
  mutation UpdateJobType($input: UpdateJobTypeInput!) {
    updateJobType(input: $input) {
      id
      title
      startLocation
      endLocation
      dispatchType
      rateOfJob
      createdAt
      updatedAt
      company {
        id
        name
      }
    }
  }
`

export const DELETE_JOB_TYPE = gql`
  mutation DeleteJobType($id: ID!) {
    deleteJobType(id: $id)
  }
`
