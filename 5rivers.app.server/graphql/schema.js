// graphql/schema.js
const { gql } = require("apollo-server-express");

module.exports = gql`
  scalar DateTime

  enum InvoiceStatus {
    Pending
    Raised
    Received
  }

  type Unit {
    unitId: ID!
    name: String!
    description: String
    jobs(limit: Int, offset: Int): [Job!]!
  }

  type Driver {
    driverId: ID!
    name: String!
    hourlyRate: Float!
    jobs(limit: Int, offset: Int): [Job!]!
  }

  type Dispatcher {
    dispatcherId: ID!
    name: String!
    commission: Float
    jobs(limit: Int, offset: Int): [Job!]!
  }

  type Company {
    companyId: ID!
    name: String!
    jobTypes: [JobType!]!
  }

  type JobType {
    jobTypeId: ID!
    title: String!
    startLocation: String
    endLocation: String
    dispatchType: String
    rateOfJob: Float
    company: Company!
    jobs(limit: Int, offset: Int): [Job!]!
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
    billedTo: String!
    billedEmail: String!
    subItems: JSON
    jobs: [Job!]!
  }

  type Job {
    jobId: ID!
    title: String!
    dateOfJob: DateTime!
    dayOfJob: String
    dispatchType: String
    startTimeForDriver: String
    endTimeForDriver: String
    startTimeForJob: String
    endTimeForJob: String
    unitName: String
    driverName: String
    hoursOfDriver: Float
    hoursOfJob: Float
    jobGrossAmount: Float
    driverRate: Float
    driverPay: Float
    estimatedFuel: Float
    estimatedRevenue: Float
    weight: JSON
    loads: Float
    ticketIds: JSON
    imageUrls: JSON
    invoiceStatus: InvoiceStatus!
    unit: Unit!
    driver: Driver!
    dispatcher: Dispatcher!
    jobType: JobType!
    invoice: Invoice
  }

  input JobFilter {
    dateStart: DateTime
    dateEnd: DateTime
    dispatchType: String
    invoiceStatus: InvoiceStatus
    driverId: ID
    unitId: ID
  }

  type Query {
    units: [Unit!]!
    drivers: [Driver!]!
    dispatchers: [Dispatcher!]!
    companies: [Company!]!
    jobTypes: [JobType!]!
    invoices: [Invoice!]!
    jobs(filter: JobFilter, limit: Int, offset: Int): [Job!]!
    job(jobId: ID!): Job
  }

  input CreateJobInput {
    title: String!
    dateOfJob: DateTime!
    dayOfJob: String
    dispatchType: String
    startTimeForDriver: String
    endTimeForDriver: String
    startTimeForJob: String
    endTimeForJob: String
    unitName: String
    driverName: String
    hoursOfDriver: Float
    hoursOfJob: Float
    jobGrossAmount: Float
    driverRate: Float
    driverPay: Float
    estimatedFuel: Float
    estimatedRevenue: Float
    weight: JSON
    loads: Float
    ticketIds: JSON
    imageUrls: JSON
    jobTypeId: ID!
    driverId: ID!
    dispatcherId: ID!
    unitId: ID!
    invoiceId: ID
  }

  input UpdateInvoiceStatusInput {
    jobId: ID!
    status: InvoiceStatus!
  }

  type Mutation {
    createJob(input: CreateJobInput!): Job!
    updateInvoiceStatus(input: UpdateInvoiceStatusInput!): Job!
    deleteJob(jobId: ID!): Boolean!
  }
`;
