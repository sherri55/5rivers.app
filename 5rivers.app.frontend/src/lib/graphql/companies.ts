import { gql } from '@apollo/client'

export const GET_COMPANIES = gql`
  query GetCompanies($filters: CompanyFilters, $pagination: PaginationInput) {
    companies(filters: $filters, pagination: $pagination) {
      nodes {
        id
        name
        description
        website
        industry
        location
        size
        founded
        logo
        email
        phone
        createdAt
        updatedAt
        jobTypes {
          id
          title
          rateOfJob
        }
        jobs {
          id
          jobDate
          invoiceStatus
          paymentReceived
        }
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
`

export const GET_COMPANY = gql`
  query GetCompany($id: ID!) {
    company(id: $id) {
      id
      name
      description
      website
      industry
      location
      size
      founded
      logo
      email
      phone
      createdAt
      updatedAt
      jobs {
        id
        jobDate
        invoiceStatus
        weight
        loads
        startTime
        endTime
        paymentReceived
        driverPaid
        calculatedAmount
        createdAt
        updatedAt
        driver {
          id
          name
        }
        unit {
          id
          name
        }
        jobType {
          id
          title
        }
      }
      jobTypes {
        id
        title
        startLocation
        endLocation
        dispatchType
        rateOfJob
        createdAt
      }
    }
  }
`

export const CREATE_COMPANY = gql`
  mutation CreateCompany($input: CreateCompanyInput!) {
    createCompany(input: $input) {
      id
      name
      description
      website
      industry
      location
      size
      founded
      logo
      email
      phone
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_COMPANY = gql`
  mutation UpdateCompany($input: UpdateCompanyInput!) {
    updateCompany(input: $input) {
      id
      name
      description
      website
      industry
      location
      size
      founded
      logo
      email
      phone
      updatedAt
    }
  }
`

export const DELETE_COMPANY = gql`
  mutation DeleteCompany($id: ID!) {
    deleteCompany(id: $id)
  }
`
