import { gql } from '@apollo/client';

export const GET_JOB_TYPES = gql`
  query GetJobTypes($companyId: ID, $pagination: PaginationInput) {
    jobTypes(companyId: $companyId, pagination: $pagination) {
      id
      title
      startLocation
      endLocation
      dispatchType
      rateOfJob
      company {
        id
        name
      }
    }
  }
`;
