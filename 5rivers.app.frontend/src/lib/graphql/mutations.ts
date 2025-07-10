import { gql } from '@apollo/client';

export const DELETE_JOB = gql`
  mutation DeleteJob($id: ID!) {
    deleteJob(id: $id)
  }
`;

export const DELETE_DRIVER = gql`
  mutation DeleteDriver($id: ID!) {
    deleteDriver(id: $id)
  }
`;

export const DELETE_UNIT = gql`
  mutation DeleteUnit($id: ID!) {
    deleteUnit(id: $id)
  }
`;

export const DELETE_COMPANY = gql`
  mutation DeleteCompany($id: ID!) {
    deleteCompany(id: $id)
  }
`;

export const DELETE_JOB_TYPE = gql`
  mutation DeleteJobType($id: ID!) {
    deleteJobType(id: $id)
  }
`;

export const DELETE_DISPATCHER = gql`
  mutation DeleteDispatcher($id: ID!) {
    deleteDispatcher(id: $id)
  }
`;

export const DELETE_INVOICE = gql`
  mutation DeleteInvoice($id: ID!) {
    deleteInvoice(id: $id)
  }
`;
