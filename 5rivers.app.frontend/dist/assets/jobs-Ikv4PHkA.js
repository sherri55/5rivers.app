import{g as t}from"./dateUtils-DEm9xBK4.js";const i=t`
  query GetDispatchers($pagination: PaginationInput) {
    dispatchers(pagination: $pagination) {
      id
      name
      description
      email
      phone
      commissionPercent
      createdAt
      updatedAt
    }
  }
`;t`
  query GetDispatcher($id: ID!) {
    dispatcher(id: $id) {
      id
      name
      description
      email
      phone
      commissionPercent
      createdAt
      updatedAt
      jobs {
        id
        jobDate
        calculatedAmount
        invoiceStatus
      }
      invoices {
        id
        invoiceNumber
        invoiceDate
        status
        calculations {
          total
        }
      }
    }
  }
`;const a=t`
  mutation CreateDispatcher($input: CreateDispatcherInput!) {
    createDispatcher(input: $input) {
      id
      name
      description
      email
      phone
      commissionPercent
      createdAt
      updatedAt
    }
  }
`,d=t`
  mutation UpdateDispatcher($input: UpdateDispatcherInput!) {
    updateDispatcher(input: $input) {
      id
      name
      description
      email
      phone
      commissionPercent
      createdAt
      updatedAt
    }
  }
`;t`
  mutation DeleteDispatcher($id: ID!) {
    deleteDispatcher(id: $id)
  }
`;const n=t`
  query GetJobs($filters: JobFilters, $pagination: PaginationInput) {
    jobs(filters: $filters, pagination: $pagination) {
      nodes {
        id
        jobDate
        invoiceStatus
        weight
        loads
        startTime
        endTime
        amount
        ticketIds
        driverPaid
        imageUrls
        images
        calculatedAmount
        calculatedHours
        driverPay
        updatedAt
        jobType {
          id
          title
          rateOfJob
          dispatchType
          company { id name }
        }
        driver { id name hourlyRate }
        dispatcher { id name }
        unit { id name }
        invoice { id invoiceNumber }
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
`,o=t`
  query GetJob($id: ID!) {
    job(id: $id) {
      id
      jobDate
      invoiceStatus
      weight
      loads
      startTime
      endTime
      ticketIds
      driverPaid
      imageUrls
      images
      calculatedAmount
      calculatedHours
      driverPay
      createdAt
      updatedAt
      jobType {
        id
        title
        startLocation
        endLocation
        dispatchType
        rateOfJob
        company { id name }
      }
      driver { id name email hourlyRate }
      dispatcher { id name email commissionPercent }
      unit { id name plateNumber color }
      invoice { id invoiceNumber invoiceDate status }
    }
  }
`,s=t`
  mutation CreateJob($input: CreateJobInput!) {
    createJob(input: $input) {
      id
      jobDate
      invoiceStatus
      weight
      loads
      startTime
      endTime
      ticketIds
      images
      calculatedAmount
      calculatedHours
      driverPay
      createdAt
      updatedAt
      jobType { id title company { id name } }
      driver { id name }
      dispatcher { id name }
      unit { id name }
    }
  }
`,r=t`
  mutation UpdateJob($input: UpdateJobInput!) {
    updateJob(input: $input) {
      id
      jobDate
      invoiceStatus
      weight
      loads
      startTime
      endTime
      amount
      ticketIds
      driverPaid
      imageUrls
      images
      calculatedAmount
      calculatedHours
      driverPay
      updatedAt
      jobType { id title dispatchType }
      driver { id name }
      dispatcher { id name }
      unit { id name }
    }
  }
`;t`
  query GetJobs($filters: JobFilters, $pagination: PaginationInput) {
    jobs(filters: $filters, pagination: $pagination) {
      nodes {
        id
        jobDate
        invoiceStatus
        weight
        loads
        startTime
        endTime
        amount
        ticketIds
        driverPaid
        imageUrls
        images
        calculatedAmount
        calculatedHours
        driverPay
        updatedAt
        jobType {
          id
          title
          rateOfJob
          dispatchType
          company {
            id
            name
          }
        }
        driver {
          id
          name
          hourlyRate
        }
        dispatcher {
          id
          name
        }
        unit {
          id
          name
        }
        invoice {
          id
          invoiceNumber
        }
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
`;t`
  query GetJob($id: ID!) {
    job(id: $id) {
      id
      jobDate
      invoiceStatus
      weight
      loads
      startTime
      endTime
      ticketIds
      driverPaid
      imageUrls
      images
      calculatedAmount
      calculatedHours
      driverPay
      createdAt
      updatedAt
      jobType {
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
      driver {
        id
        name
        email
        hourlyRate
      }
      dispatcher {
        id
        name
        email
        commissionPercent
      }
      unit {
        id
        name
        plateNumber
        color
      }
      invoice {
        id
        invoiceNumber
        invoiceDate
        status
      }
    }
  }
`;t`
  query SearchJobs($query: String!, $limit: Int) {
    searchJobs(query: $query, limit: $limit) {
      id
      jobDate
      calculatedAmount
      driverPay
      invoiceStatus
      jobType {
        id
        title
        company {
          id
          name
        }
      }
      driver {
        id
        name
      }
    }
  }
`;t`
  mutation CreateJob($input: CreateJobInput!) {
    createJob(input: $input) {
      id
      jobDate
      invoiceStatus
      weight
      loads
      startTime
      endTime
      ticketIds
      images
      calculatedAmount
      calculatedHours
      driverPay
      createdAt
      updatedAt
      jobType {
        id
        title
        company {
          id
          name
        }
      }
      driver {
        id
        name
      }
      dispatcher {
        id
        name
      }
      unit {
        id
        name
      }
    }
  }
`;const c=t`
  mutation UpdateJobStatus($id: ID!, $status: String!) {
    updateJobStatus(id: $id, status: $status) {
      id
      invoiceStatus
      updatedAt
    }
  }
`,u=t`
  mutation AssignJobToDriver($jobId: ID!, $driverId: ID!) {
    assignJobToDriver(jobId: $jobId, driverId: $driverId) {
      id
      driver {
        id
        name
      }
      updatedAt
    }
  }
`,m=t`
  mutation AssignJobToUnit($jobId: ID!, $unitId: ID!) {
    assignJobToUnit(jobId: $jobId, unitId: $unitId) {
      id
      unit {
        id
        name
      }
      updatedAt
    }
  }
`,p=t`
  mutation AssignJobToDispatcher($jobId: ID!, $dispatcherId: ID!) {
    assignJobToDispatcher(jobId: $jobId, dispatcherId: $dispatcherId) {
      id
      dispatcher {
        id
        name
      }
      updatedAt
    }
  }
`;t`
  mutation UpdateJob($input: UpdateJobInput!) {
    updateJob(input: $input) {
      id
      jobDate
      invoiceStatus
      weight
      loads
      startTime
      endTime
      amount
      ticketIds
      driverPaid
      imageUrls
      images
      calculatedAmount
      calculatedHours
      driverPay
      updatedAt
      jobType {
        id
        title
        dispatchType
      }
      driver {
        id
        name
      }
      dispatcher {
        id
        name
      }
      unit {
        id
        name
      }
    }
  }
`;export{u as A,a as C,n as G,d as U,i as a,r as b,s as c,c as d,m as e,p as f,o as g};
