import { gql } from '@apollo/client'

export const CREATE_JOB = gql`
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
`

export const UPDATE_JOB = gql`
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
`
