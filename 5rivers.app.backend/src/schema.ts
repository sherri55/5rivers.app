import { gql } from "apollo-server-micro";

export const typeDefs = gql`
  scalar DateTime

  ### ==== Types ====

  type Company {
    companyId: ID!
    name: String!
    description: String
    email: String
    phone: String
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Dispatcher {
    dispatcherId: ID!
    name: String!
    description: String
    email: String
    phone: String
    commission: Float!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Driver {
    driverId: ID!
    name: String!
    description: String
    email: String
    phone: String
    hourlyRate: Float!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type JobType {
    jobTypeId: ID!
    title: String!
    startLocation: String
    endLocation: String
    dispatchType: String
    rateOfJob: Float!
    isActive: Boolean!
    companyId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Unit {
    unitId: ID!
    name: String!
    description: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Job {
    jobId: ID!
    title: String!
    dateOfJob: String!
    dayOfJob: String
    startTimeForDriver: String
    endTimeForDriver: String
    startTimeForJob: String
    endTimeForJob: String
    hoursOfDriver: Float
    hoursOfJob: Float
    dispatchType: String
    jobGrossAmount: Float
    driverRate: Float
    driverPay: Float
    estimatedFuel: Float
    estimatedRevenue: Float
    imageUrls: String
    ticketIds: String
    weight: String
    loads: Float
    invoiceStatus: String
    createdAt: DateTime
    updatedAt: DateTime
    jobTypeId: ID
    driverId: ID
    dispatcherId: ID
    unitId: ID
    invoiceId: ID
    jobType: JobType
    driver: Driver
    dispatcher: Dispatcher
    unit: Unit
    invoice: Invoice
  }

  type Invoice {
    invoiceId: ID!
    invoiceNumber: String!
    invoiceDate: DateTime!
    subTotal: Float!
    dispatchPercent: Float!
    comm: Float!
    hst: Float!
    total: Float!
    billedTo: String
    billedEmail: String
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    lines: [InvoiceLine!]!
  }

  type InvoiceLine {
    invoiceLineId: ID!
    lineAmount: Float!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    job: Job
    invoice: Invoice
  }

  ### ==== Queries ====

  type Query {
    units: [Unit!]!
    unit(unitId: ID!): Unit

    companies: [Company!]!
    company(companyId: ID!): Company

    dispatchers: [Dispatcher!]!
    dispatcher(dispatcherId: ID!): Dispatcher

    drivers: [Driver!]!
    driver(driverId: ID!): Driver

    jobTypes: [JobType!]!
    jobType(jobTypeId: ID!): JobType

    jobs: [Job!]!
    job(jobId: ID!): Job

    invoices: [Invoice!]!
    invoice(invoiceId: ID!): Invoice
  }

  ### ==== Mutations ====

  input CreateUnitInput {
    name: String!
    description: String
  }
  input UpdateUnitInput {
    unitId: ID!
    name: String
    description: String
  }

  input CreateCompanyInput {
    name: String!
    description: String
    email: String
    phone: String
  }
  input UpdateCompanyInput {
    companyId: ID!
    name: String
    description: String
    email: String
    phone: String
    isActive: Boolean
  }

  input CreateDispatcherInput {
    name: String!
    description: String
    email: String
    phone: String
    commission: Float
  }
  input UpdateDispatcherInput {
    dispatcherId: ID!
    name: String
    description: String
    email: String
    phone: String
    commission: Float
    isActive: Boolean
  }

  input CreateDriverInput {
    name: String!
    description: String
    email: String
    phone: String
    hourlyRate: Float
  }
  input UpdateDriverInput {
    driverId: ID!
    name: String
    description: String
    email: String
    phone: String
    hourlyRate: Float
    isActive: Boolean
  }

  input CreateJobTypeInput {
    title: String!
    startLocation: String
    endLocation: String
    dispatchType: String
    rateOfJob: Float
    companyId: ID!
  }
  input UpdateJobTypeInput {
    jobTypeId: ID!
    title: String
    startLocation: String
    endLocation: String
    dispatchType: String
    rateOfJob: Float
    isActive: Boolean
    companyId: ID
  }

  input CreateJobInput {
    title: String!
    dateOfJob: String!
    dayOfJob: String
    startTimeForDriver: String
    endTimeForDriver: String
    startTimeForJob: String
    endTimeForJob: String
    dispatchType: String
    jobGrossAmount: Float
    driverRate: Float
    driverPay: Float
    estimatedFuel: Float
    jobTypeId: ID
    driverId: ID
    dispatcherId: ID
    unitId: ID
    invoiceId: ID
  }
  input UpdateJobInput {
    jobId: ID!
    title: String
    dateOfJob: String
    dayOfJob: String
    startTimeForDriver: String
    endTimeForDriver: String
    startTimeForJob: String
    endTimeForJob: String
    dispatchType: String
    jobGrossAmount: Float
    driverRate: Float
    driverPay: Float
    estimatedFuel: Float
    jobTypeId: ID
    driverId: ID
    dispatcherId: ID
    unitId: ID
    invoiceId: ID
  }

  input UpdateJobInvoiceStatusInput {
    jobId: ID!
    invoiceStatus: String!
  }

  input CreateInvoiceInput {
    invoiceNumber: String!
    invoiceDate: DateTime
    subTotal: Float
    dispatchPercent: Float
    comm: Float
    hst: Float
    total: Float
    billedTo: String
    billedEmail: String
  }
  input UpdateInvoiceInput {
    invoiceId: ID!
    invoiceNumber: String
    invoiceDate: DateTime
    subTotal: Float
    dispatchPercent: Float
    comm: Float
    hst: Float
    total: Float
    billedTo: String
    billedEmail: String
    isActive: Boolean
  }

  type Mutation {
    createUnit(input: CreateUnitInput!): Unit!
    updateUnit(input: UpdateUnitInput!): Unit!
    deleteUnit(unitId: ID!): Boolean!

    createCompany(input: CreateCompanyInput!): Company!
    updateCompany(input: UpdateCompanyInput!): Company!
    deleteCompany(companyId: ID!): Boolean!

    createDispatcher(input: CreateDispatcherInput!): Dispatcher!
    updateDispatcher(input: UpdateDispatcherInput!): Dispatcher!
    deleteDispatcher(dispatcherId: ID!): Boolean!

    createDriver(input: CreateDriverInput!): Driver!
    updateDriver(input: UpdateDriverInput!): Driver!
    deleteDriver(driverId: ID!): Boolean!

    createJobType(input: CreateJobTypeInput!): JobType!
    updateJobType(input: UpdateJobTypeInput!): JobType!
    deleteJobType(jobTypeId: ID!): Boolean!

    createJob(input: CreateJobInput!): Job!
    updateJob(input: UpdateJobInput!): Job!
    updateJobInvoiceStatus(input: UpdateJobInvoiceStatusInput!): Job!
    deleteJob(jobId: ID!): Boolean!

    createInvoice(input: CreateInvoiceInput!): Invoice!
    updateInvoice(input: UpdateInvoiceInput!): Invoice!
    deleteInvoice(invoiceId: ID!): Boolean!
  }

  mutation UpdateJobInvoiceStatus($input: UpdateJobInvoiceStatusInput!) {
    updateJobInvoiceStatus(input: $input) {
      jobId
      invoiceStatus
    }
  }
`;
