import { gql } from '@apollo/client';

export const GET_INVOICES = gql`
  query GetInvoices($pagination: PaginationInput) {
    invoices(pagination: $pagination) {
      id
      invoiceNumber
      invoiceDate
      status
      billedTo
      billedEmail
      calculations {
        subTotal
        total
      }
      jobs {
        job { id }
        amount
      }
    }
  }
`;
