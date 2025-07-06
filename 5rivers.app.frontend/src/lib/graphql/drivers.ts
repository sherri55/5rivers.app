import { gql } from '@apollo/client'

// Driver Queries
export const GET_DRIVERS = gql`
  query GetDrivers($pagination: PaginationInput) {
    drivers(pagination: $pagination) {
      id
      name
      description
      email
      phone
      hourlyRate
      createdAt
      updatedAt
    }
  }
`

export const GET_DRIVER = gql`
  query GetDriver($id: ID!) {
    driver(id: $id) {
      id
      name
      description
      email
      phone
      hourlyRate
      createdAt
      updatedAt
      jobs {
        id
        jobDate
        calculatedAmount
        calculatedHours
      }
      driverRates {
        id
        hourlyRate
        percentageRate
        jobType {
          id
          title
        }
      }
    }
  }
`

// Driver Mutations
export const CREATE_DRIVER = gql`
  mutation CreateDriver($input: CreateDriverInput!) {
    createDriver(input: $input) {
      id
      name
      description
      email
      phone
      hourlyRate
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_DRIVER = gql`
  mutation UpdateDriver($input: UpdateDriverInput!) {
    updateDriver(input: $input) {
      id
      name
      description
      email
      phone
      hourlyRate
      createdAt
      updatedAt
    }
  }
`

export const DELETE_DRIVER = gql`
  mutation DeleteDriver($id: ID!) {
    deleteDriver(id: $id)
  }
`
