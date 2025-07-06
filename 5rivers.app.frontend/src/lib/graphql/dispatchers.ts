import { gql } from '@apollo/client'

// Dispatcher Queries
export const GET_DISPATCHERS = gql`
  query GetDispatchers($pagination: PaginationInput) {
    dispatchers(pagination: $pagination) {
      id
      name
      description
      email
      phone
      commissionPercent
      createdAt
      updatedAt
    }
  }
`

export const GET_DISPATCHER = gql`
  query GetDispatcher($id: ID!) {
    dispatcher(id: $id) {
      id
      name
      description
      email
      phone
      commissionPercent
      createdAt
      updatedAt
      jobs {
        id
        jobDate
        calculatedAmount
        invoiceStatus
      }
      invoices {
        id
        invoiceNumber
        invoiceDate
        status
        calculations {
          total
        }
      }
    }
  }
`

// Dispatcher Mutations
export const CREATE_DISPATCHER = gql`
  mutation CreateDispatcher($input: CreateDispatcherInput!) {
    createDispatcher(input: $input) {
      id
      name
      description
      email
      phone
      commissionPercent
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_DISPATCHER = gql`
  mutation UpdateDispatcher($input: UpdateDispatcherInput!) {
    updateDispatcher(input: $input) {
      id
      name
      description
      email
      phone
      commissionPercent
      createdAt
      updatedAt
    }
  }
`

export const DELETE_DISPATCHER = gql`
  mutation DeleteDispatcher($id: ID!) {
    deleteDispatcher(id: $id)
  }
`
