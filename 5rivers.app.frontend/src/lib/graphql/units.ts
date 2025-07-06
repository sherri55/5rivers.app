import { gql } from '@apollo/client'

// Unit Queries
export const GET_UNITS = gql`
  query GetUnits($pagination: PaginationInput) {
    units(pagination: $pagination) {
      id
      name
      description
      color
      plateNumber
      vin
      createdAt
      updatedAt
    }
  }
`

export const GET_UNIT = gql`
  query GetUnit($id: ID!) {
    unit(id: $id) {
      id
      name
      description
      color
      plateNumber
      vin
      createdAt
      updatedAt
      jobs {
        id
        jobDate
        calculatedAmount
        driver {
          id
          name
        }
      }
    }
  }
`

// Unit Mutations
export const CREATE_UNIT = gql`
  mutation CreateUnit($input: CreateUnitInput!) {
    createUnit(input: $input) {
      id
      name
      description
      color
      plateNumber
      vin
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_UNIT = gql`
  mutation UpdateUnit($input: UpdateUnitInput!) {
    updateUnit(input: $input) {
      id
      name
      description
      color
      plateNumber
      vin
      createdAt
      updatedAt
    }
  }
`

export const DELETE_UNIT = gql`
  mutation DeleteUnit($id: ID!) {
    deleteUnit(id: $id)
  }
`
