import { gql } from '@apollo/client';

export const GET_DISPATCHERS = gql`
  query GetDispatchers($pagination: PaginationInput) {
    dispatchers(pagination: $pagination) {
      id
      name
      email
      phone
    }
  }
`;
