import { Neo4jService } from '../database/neo4j'
import CalculationService from './calculationService'

export class JobAmountValidationService {
  private neo4jService: Neo4jService

  constructor() {
    this.neo4jService = new Neo4jService()
  }

  /**
   * Validate and potentially fix job amount in relationship
   */
  async validateAndFixJobAmount(jobId: string): Promise<{
    isValid: boolean;
    currentAmount: number;
    calculatedAmount: number;
    wasFixed: boolean;
    error?: string;
  }> {
    try {
      // Get current relationship amount
      const relationshipQuery = `
        MATCH (j:Job {id: $jobId})-[r:INVOICED_IN]->(i:Invoice)
        RETURN r.amount as currentAmount
      `
      const relationshipResult = await this.neo4jService.runQuery(relationshipQuery, { jobId })
      
      if (relationshipResult.length === 0) {
        return {
          isValid: false,
          currentAmount: 0,
          calculatedAmount: 0,
          wasFixed: false,
          error: 'Job not found in any invoice'
        }
      }

      const currentAmount = relationshipResult[0].currentAmount
      const calculatedAmount = await CalculationService.calculateJobAmount(jobId)
      
      const difference = Math.abs(currentAmount - calculatedAmount)
      const isValid = difference <= 0.01 // Allow for minor rounding differences
      
      let wasFixed = false
      if (!isValid) {
        // Fix the relationship amount
        const updateQuery = `
          MATCH (j:Job {id: $jobId})-[r:INVOICED_IN]->(i:Invoice)
          SET r.amount = $newAmount
          RETURN r.amount as updatedAmount
        `
        
        await this.neo4jService.runQuery(updateQuery, {
          jobId,
          newAmount: calculatedAmount
        })
        
        wasFixed = true
      }

      return {
        isValid: wasFixed ? true : isValid,
        currentAmount,
        calculatedAmount,
        wasFixed
      }
    } catch (error) {
      return {
        isValid: false,
        currentAmount: 0,
        calculatedAmount: 0,
        wasFixed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Validate all jobs in an invoice
   */
  async validateInvoiceJobAmounts(invoiceId: string): Promise<{
    totalJobs: number;
    validJobs: number;
    fixedJobs: number;
    errors: Array<{ jobId: string; error: string }>;
  }> {
    try {
      // Get all jobs in the invoice
      const jobsQuery = `
        MATCH (i:Invoice {id: $invoiceId})<-[r:INVOICED_IN]-(j:Job)
        RETURN j.id as jobId
      `
      
      const jobs = await this.neo4jService.runQuery(jobsQuery, { invoiceId })
      
      let validJobs = 0
      let fixedJobs = 0
      const errors: Array<{ jobId: string; error: string }> = []

      for (const job of jobs) {
        const validation = await this.validateAndFixJobAmount(job.jobId)
        
        if (validation.error) {
          errors.push({ jobId: job.jobId, error: validation.error })
        } else {
          if (validation.isValid) validJobs++
          if (validation.wasFixed) fixedJobs++
        }
      }

      return {
        totalJobs: jobs.length,
        validJobs,
        fixedJobs,
        errors
      }
    } catch (error) {
      throw new Error(`Failed to validate invoice job amounts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get a job's amount details for debugging
   */
  async getJobAmountDetails(jobId: string): Promise<{
    jobId: string;
    dispatchType: string;
    rate: number;
    weight?: string;
    loads?: number;
    startTime?: string;
    endTime?: string;
    relationshipAmount: number;
    calculatedAmount: number;
    isValid: boolean;
  }> {
    try {
      // Get job details
      const jobQuery = `
        MATCH (j:Job {id: $jobId})-[:OF_TYPE]->(jt:JobType)
        OPTIONAL MATCH (j)-[r:INVOICED_IN]->(i:Invoice)
        RETURN j.startTime as startTime, 
               j.endTime as endTime,
               j.loads as loads,
               j.weight as weight,
               jt.rateOfJob as rate,
               jt.dispatchType as dispatchType,
               r.amount as relationshipAmount
      `
      
      const result = await this.neo4jService.runQuery(jobQuery, { jobId })
      
      if (result.length === 0) {
        throw new Error('Job not found')
      }

      const job = result[0]
      const calculatedAmount = await CalculationService.calculateJobAmount(jobId)
      const isValid = Math.abs((job.relationshipAmount || 0) - calculatedAmount) <= 0.01

      return {
        jobId,
        dispatchType: job.dispatchType,
        rate: job.rate,
        weight: job.weight,
        loads: job.loads,
        startTime: job.startTime,
        endTime: job.endTime,
        relationshipAmount: job.relationshipAmount || 0,
        calculatedAmount,
        isValid
      }
    } catch (error) {
      throw new Error(`Failed to get job amount details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async close() {
    await this.neo4jService.close()
  }
}

export default JobAmountValidationService
