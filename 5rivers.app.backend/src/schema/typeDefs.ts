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
    jobs: [Job!]!
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
    weight: [Float]
    loads: Int
    startTime: String
    endTime: String
    amount: Float
    ticketIds: [String]
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

  input CreateDriverInput {
    name: String!
    description: String
    email: String!
    phone: String
    hourlyRate: Float!
  }

  input UpdateDriverInput {
    id: ID!
    name: String
    description: String
    email: String
    phone: String
    hourlyRate: Float
  }

  input CreateDispatcherInput {
    name: String!
    description: String
    email: String!
    phone: String
    commissionPercent: Float!
  }

  input UpdateDispatcherInput {
    id: ID!
    name: String
    description: String
    email: String
    phone: String
    commissionPercent: Float
  }

  input CreateUnitInput {
    name: String!
    description: String
    color: String
    plateNumber: String
    vin: String
  }

  input UpdateUnitInput {
    id: ID!
    name: String
    description: String
    color: String
    plateNumber: String
    vin: String
  }

  input CreateJobTypeInput {
    title: String!
    startLocation: String
    endLocation: String
    dispatchType: String!
    rateOfJob: Float!
    companyId: ID
  }

  input UpdateJobTypeInput {
    id: ID!
    title: String
    startLocation: String
    endLocation: String
    dispatchType: String
    rateOfJob: Float
    companyId: ID
  }

  input CreateInvoiceInput {
    invoiceNumber: String!
    invoiceDate: Date!
    status: String!
    billedTo: String
    billedEmail: String
    dispatcherId: ID!
    jobIds: [ID!]!
  }

  input UpdateInvoiceInput {
    id: ID!
    invoiceNumber: String
    invoiceDate: Date
    status: String
    billedTo: String
    billedEmail: String
  }

  input CreateJobInput {
    jobDate: String!
    jobGrossAmount: Float
    jobTypeId: ID
    driverId: ID
    dispatcherId: ID
    unitId: ID
    weight: [Float]
    loads: Int
    startTime: String
    endTime: String
  }

  input UpdateJobInput {
    id: ID!
    jobDate: String
    jobTypeId: ID
    driverId: ID
    dispatcherId: ID
    unitId: ID
    weight: [Float]
    loads: Int
    startTime: String
    endTime: String
    amount: Float
    invoiceStatus: String
    paymentReceived: Boolean
    driverPaid: Boolean
    ticketIds: [String]
    imageUrls: String
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

  type MonthlyStats {
    totalJobs: Int!
    totalDispatchers: Int!
    totalDrivers: Int!
    totalInvoices: Int!
    totalAmount: Float!
    averageJobValue: Float!
  }

  type MonthlyComparison {
    current: MonthlyStats!
    previous: MonthlyStats!
    percentageChange: Float!
    jobsChange: Int!
    amountChange: Float!
  }

  type OverallStats {
    totalJobs: Int!
    totalDispatchers: Int!
    totalDrivers: Int!
    totalInvoices: Int!
    totalAmount: Float!
    totalCompanies: Int!
    averageJobValue: Float!
  }

  type DashboardStats {
    monthlyComparison: MonthlyComparison!
    overallStats: OverallStats!
    recentJobs: [Job!]!
    topCompanies: [Company!]!
  }

  # PDF download response type
  type PDFDownloadResponse {
    success: Boolean!
    data: String
    filename: String
    error: String
  }

  # Job amount validation response type
  type JobAmountValidationResponse {
    success: Boolean!
    message: String
    error: String
    data: JobAmountValidationData
  }

  type JobAmountValidationData {
    totalJobs: Int!
    validJobs: Int
    fixedJobs: Int!
    errors: [String!]
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
    dashboardStats(year: Int, month: Int): DashboardStats!
    
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

    # Driver mutations
    createDriver(input: CreateDriverInput!): Driver!
    updateDriver(input: UpdateDriverInput!): Driver!
    deleteDriver(id: ID!): Boolean!

    # Dispatcher mutations
    createDispatcher(input: CreateDispatcherInput!): Dispatcher!
    updateDispatcher(input: UpdateDispatcherInput!): Dispatcher!
    deleteDispatcher(id: ID!): Boolean!

    # Unit mutations
    createUnit(input: CreateUnitInput!): Unit!
    updateUnit(input: UpdateUnitInput!): Unit!
    deleteUnit(id: ID!): Boolean!

    # JobType mutations
    createJobType(input: CreateJobTypeInput!): JobType!
    updateJobType(input: UpdateJobTypeInput!): JobType!
    deleteJobType(id: ID!): Boolean!

    # Invoice mutations
    createInvoice(input: CreateInvoiceInput!): Invoice!
    updateInvoice(input: UpdateInvoiceInput!): Invoice!
    deleteInvoice(id: ID!): Boolean!

    # Job mutations
    createJob(input: CreateJobInput!): Job!
    updateJob(input: UpdateJobInput!): Job!
    updateJobStatus(id: ID!, status: String!): Job!
    markJobPaid(id: ID!, driverPaid: Boolean!, paymentReceived: Boolean!): Job!
    
    # Quick mutations for common operations
    assignJobToDriver(jobId: ID!, driverId: ID!): Job!
    assignJobToDispatcher(jobId: ID!, dispatcherId: ID!): Job!
    assignJobToUnit(jobId: ID!, unitId: ID!): Job!
    
    # PDF download
    downloadInvoicePDF(invoiceId: ID!): PDFDownloadResponse!
    
    # Job amount validation and fixing
    validateAndFixJobAmounts(invoiceId: ID): JobAmountValidationResponse!
  }
`;