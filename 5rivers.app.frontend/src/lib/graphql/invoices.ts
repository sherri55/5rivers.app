import { gql } from '@apollo/client'

// Invoice Queries
export const GET_INVOICES = gql`
  query GetInvoices($dispatcherId: ID, $status: String, $pagination: PaginationInput) {
    invoices(dispatcherId: $dispatcherId, status: $status, pagination: $pagination) {
      id
      invoiceNumber
      invoiceDate
      status
      billedTo
      billedEmail
      createdAt
      updatedAt
      dispatcher {
        id
        name
        email
      }
      jobs {
        job {
          id
          jobDate
          jobType {
            id
            title
            company {
              id
              name
            }
          }
        }
        amount
        invoicedAt
      }
      calculations {
        subTotal
        commissionRate
        commission
        hst
        total
      }
    }
  }
`

export const GET_INVOICE = gql`
  query GetInvoice($id: ID!) {
    invoice(id: $id) {
      id
      invoiceNumber
      invoiceDate
      status
      billedTo
      billedEmail
      createdAt
      updatedAt
      dispatcher {
        id
        name
        email
        commissionPercent
      }
      jobs {
        job {
          id
          jobDate
          weight
          loads
          startTime
          endTime
          calculatedAmount
          calculatedHours
          jobType {
            id
            title
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
          }
          unit {
            id
            name
            plateNumber
          }
        }
        amount
        invoicedAt
      }
      calculations {
        subTotal
        commissionRate
        commission
        hst
        total
      }
    }
  }
`

// Invoice Mutations
export const CREATE_INVOICE = gql`
  mutation CreateInvoice($input: CreateInvoiceInput!) {
    createInvoice(input: $input) {
      id
      invoiceNumber
      invoiceDate
      status
      billedTo
      billedEmail
      createdAt
      updatedAt
      dispatcher {
        id
        name
        email
      }
      calculations {
        subTotal
        commissionRate
        commission
        hst
        total
      }
    }
  }
`

export const UPDATE_INVOICE = gql`
  mutation UpdateInvoice($input: UpdateInvoiceInput!) {
    updateInvoice(input: $input) {
      id
      invoiceNumber
      invoiceDate
      status
      billedTo
      billedEmail
      updatedAt
      calculations {
        subTotal
        commissionRate
        commission
        hst
        total
      }
    }
  }
`

export const DELETE_INVOICE = gql`
  mutation DeleteInvoice($id: ID!) {
    deleteInvoice(id: $id)
  }
`
