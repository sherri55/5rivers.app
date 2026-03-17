import { gql } from '@apollo/client';

export const GET_COMPANIES = gql`
  query GetCompanies($filters: CompanyFilters, $pagination: PaginationInput) {
    companies(filters: $filters, pagination: $pagination) {
      nodes {
        id
        name
        description
        location
        email
        phone
        industry
        size
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
`;
