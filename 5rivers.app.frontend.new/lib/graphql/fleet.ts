import { gql } from '@apollo/client';

export const GET_DRIVERS = gql`
  query GetDrivers($pagination: PaginationInput) {
    drivers(pagination: $pagination) {
      id
      name
      email
      phone
      hourlyRate
    }
  }
`;

export const GET_UNITS = gql`
  query GetUnits($pagination: PaginationInput) {
    units(pagination: $pagination) {
      id
      name
      description
      color
      plateNumber
      vin
    }
  }
`;
