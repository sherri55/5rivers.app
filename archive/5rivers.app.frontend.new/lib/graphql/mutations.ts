import { gql } from '@apollo/client';

export const CREATE_COMPANY = gql`
  mutation CreateCompany($input: CreateCompanyInput!) {
    createCompany(input: $input) {
      id
      name
      email
      location
    }
  }
`;

export const CREATE_DRIVER = gql`
  mutation CreateDriver($input: CreateDriverInput!) {
    createDriver(input: $input) {
      id
      name
      email
      phone
      hourlyRate
    }
  }
`;

export const CREATE_UNIT = gql`
  mutation CreateUnit($input: CreateUnitInput!) {
    createUnit(input: $input) {
      id
      name
      plateNumber
    }
  }
`;

export const CREATE_JOB = gql`
  mutation CreateJob($input: CreateJobInput!) {
    createJob(input: $input) {
      id
      jobDate
      invoiceStatus
      calculatedAmount
    }
  }
`;

export const CREATE_JOB_TYPE = gql`
  mutation CreateJobType($input: CreateJobTypeInput!) {
    createJobType(input: $input) {
      id
      title
      startLocation
      endLocation
      dispatchType
      rateOfJob
    }
  }
`;
