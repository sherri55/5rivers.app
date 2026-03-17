import{g as t}from"./dateUtils-DEm9xBK4.js";const a=t`
  query GetJobTypes($companyId: ID, $pagination: PaginationInput) {
    jobTypes(companyId: $companyId, pagination: $pagination) {
      id
      title
      startLocation
      endLocation
      dispatchType
      rateOfJob
      createdAt
      updatedAt
      company {
        id
        name
      }
    }
  }
`,o=t`
  query GetJobType($id: ID!) {
    jobType(id: $id) {
      id
      title
      startLocation
      endLocation
      dispatchType
      rateOfJob
      createdAt
      updatedAt
      company {
        id
        name
      }
      jobs {
        id
        jobDate
        calculatedAmount
        driver {
          id
          name
        }
      }
      driverRates {
        id
        hourlyRate
        percentageRate
        driver {
          id
          name
        }
      }
    }
  }
`,i=t`
  mutation CreateJobType($input: CreateJobTypeInput!) {
    createJobType(input: $input) {
      id
      title
      startLocation
      endLocation
      dispatchType
      rateOfJob
      createdAt
      updatedAt
      company {
        id
        name
      }
    }
  }
`,n=t`
  mutation UpdateJobType($input: UpdateJobTypeInput!) {
    updateJobType(input: $input) {
      id
      title
      startLocation
      endLocation
      dispatchType
      rateOfJob
      createdAt
      updatedAt
      company {
        id
        name
      }
    }
  }
`;t`
  mutation DeleteJobType($id: ID!) {
    deleteJobType(id: $id)
  }
`;export{i as C,a as G,n as U,o as a};
