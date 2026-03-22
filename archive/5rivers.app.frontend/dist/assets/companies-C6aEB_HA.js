import{g as t}from"./dateUtils-DEm9xBK4.js";const i=t`
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
        }
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
`,a=t`
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
`,o=t`
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
`,n=t`
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
`;t`
  mutation DeleteCompany($id: ID!) {
    deleteCompany(id: $id)
  }
`;export{o as C,a as G,n as U,i as a};
