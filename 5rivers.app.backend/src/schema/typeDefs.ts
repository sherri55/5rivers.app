export const typeDefs = `
  scalar Date

  type Company {
    id: ID!
    name: String!
    description: String
    website: String
    industry: String
    location: String
    size: String
    founded: Int
    logo: String
    email: String
    phone: String
    createdAt: Date!
    updatedAt: Date!
    # Relationships
    jobTypes: [JobType!]!
  }

  type Driver {
    id: ID!
    name: String!
    description: String
    email: String!
    phone: String
    hourlyRate: Float!
    createdAt: Date!
    updatedAt: Date!
    # Relationships
    jobs: [Job!]!
    driverRates: [DriverRate!]!
  }

  type Dispatcher {
    id: ID!
    name: String!
    description: String
    email: String!
    phone: String
    commissionPercent: Float!
    createdAt: Date!
    updatedAt: Date!
    # Relationships
    jobs: [Job!]!
    invoices: [Invoice!]!
  }

  type Unit {
    id: ID!
    name: String!
    description: String
    color: String
    plateNumber: String
    vin: String
    createdAt: Date!
    updatedAt: Date!
    # Relationships
    jobs: [Job!]!
  }

  type JobType {
    id: ID!
    title: String!
    startLocation: String
    endLocation: String
    dispatchType: String!
    rateOfJob: Float!
    createdAt: Date!
    updatedAt: Date!
    # Relationships
    company: Company
    jobs: [Job!]!
    driverRates: [DriverRate!]!
  }

  type Job {
    id: ID!
    jobDate: String!
    # Core data only - no calculated jobGrossAmount
    invoiceStatus: String!
    weight: String
    loads: Int
    startTime: String
    endTime: String
    ticketIds: String
    paymentReceived: Boolean!
    driverPaid: Boolean!
    imageUrls: String
    createdAt: Date!
    updatedAt: Date!
    # Relationships
    jobType: JobType
    driver: Driver
    dispatcher: Dispatcher
    unit: Unit
    invoice: Invoice
    # Calculated fields (computed by resolvers)
    calculatedAmount: Float!
    calculatedHours: Float
  }

  type Invoice {
    id: ID!
    invoiceNumber: String!
    invoiceDate: Date!
    status: String!
    # Core data only - no calculated amounts
    billedTo: String
    billedEmail: String
    createdAt: Date!
    updatedAt: Date!
    # Relationships
    dispatcher: Dispatcher!
    jobs: [JobInvoiceRelation!]! # Jobs with their invoice amounts
    # Calculated fields (computed by resolvers)
    calculations: InvoiceCalculations!
  }

  # Represents the relationship between Job and Invoice with the amount
  type JobInvoiceRelation {
    job: Job!
    amount: Float!
    invoicedAt: Date
  }

  type InvoiceCalculations {
    subTotal: Float!
    commissionRate: Float!
    commission: Float!
    hst: Float!
    total: Float!
  }

  type DriverRate {
    id: ID!
    hourlyRate: Float
    percentageRate: Float
    createdAt: Date!
    updatedAt: Date!
    # Relationships
    driver: Driver!
    jobType: JobType!
  }

  input CreateCompanyInput {
    name: String!
    description: String
    website: String
    industry: String
    location: String
    size: String
    founded: Int
    logo: String
    email: String
    phone: String
  }

  input UpdateCompanyInput {
    id: ID!
    name: String
    description: String
    website: String
    industry: String
    location: String
    size: String
    founded: Int
    logo: String
    email: String
    phone: String
  }

  input CreateJobInput {
    jobDate: String!
    jobGrossAmount: Float
    jobTypeId: ID
    driverId: ID
    dispatcherId: ID
    unitId: ID
    weight: String
    loads: Int
    startTime: String
    endTime: String
  }

  input JobFilters {
    dateFrom: String
    dateTo: String
    driverId: ID
    dispatcherId: ID
    unitId: ID
    jobTypeId: ID
    companyId: ID
    invoiceStatus: String
    paymentReceived: Boolean
    driverPaid: Boolean
  }

  input CompanyFilters {
    industry: String
    location: String
    size: String
    minFounded: Int
    maxFounded: Int
    search: String
  }

  input PaginationInput {
    page: Int = 1
    limit: Int = 10
    offset: Int = 0
  }

  type CompanyConnection {
    nodes: [Company!]!
    totalCount: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  type JobConnection {
    nodes: [Job!]!
    totalCount: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  # Dashboard/Analytics Types
  type JobStats {
    totalJobs: Int!
    totalRevenue: Float!
    averageJobValue: Float!
    pendingJobs: Int!
    completedJobs: Int!
  }

  type DriverStats {
    totalDrivers: Int!
    activeDrivers: Int!
    totalHours: Float!
    totalEarnings: Float!
  }

  type DashboardStats {
    jobStats: JobStats!
    driverStats: DriverStats!
    recentJobs: [Job!]!
    topCompanies: [Company!]!
  }

  type Query {
    # Company queries
    companies(
      filters: CompanyFilters
      pagination: PaginationInput
    ): CompanyConnection!
    
    company(id: ID!): Company
    
    # Driver queries
    drivers(pagination: PaginationInput): [Driver!]!
    driver(id: ID!): Driver
    
    # Dispatcher queries  
    dispatchers(pagination: PaginationInput): [Dispatcher!]!
    dispatcher(id: ID!): Dispatcher
    
    # Unit queries
    units(pagination: PaginationInput): [Unit!]!
    unit(id: ID!): Unit

    # JobType queries
    jobTypes(companyId: ID, pagination: PaginationInput): [JobType!]!
    jobType(id: ID!): JobType

    # Job queries
    jobs(
      filters: JobFilters
      pagination: PaginationInput
    ): JobConnection!
    job(id: ID!): Job

    # Invoice queries
    invoices(
      dispatcherId: ID
      status: String
      pagination: PaginationInput
    ): [Invoice!]!
    invoice(id: ID!): Invoice

    # Analytics/Dashboard
    dashboardStats: DashboardStats!
    
    # Search across all companies
    searchCompanies(
      query: String!
      limit: Int = 10
    ): [Company!]!

    # Search jobs
    searchJobs(
      query: String!
      limit: Int = 10
    ): [Job!]!
  }

  type Mutation {
    # Company mutations
    createCompany(input: CreateCompanyInput!): Company!
    updateCompany(input: UpdateCompanyInput!): Company!
    deleteCompany(id: ID!): Boolean!

    # Job mutations
    createJob(input: CreateJobInput!): Job!
    updateJobStatus(id: ID!, status: String!): Job!
    markJobPaid(id: ID!, driverPaid: Boolean!, paymentReceived: Boolean!): Job!
    
    # Quick mutations for common operations
    assignJobToDriver(jobId: ID!, driverId: ID!): Job!
    assignJobToUnit(jobId: ID!, unitId: ID!): Job!
  }
`;
