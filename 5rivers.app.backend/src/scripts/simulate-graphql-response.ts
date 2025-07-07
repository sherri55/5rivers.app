import { Neo4jService } from '../database/neo4j'
import CalculationService from '../services/calculationService'

// Simulate the exact GraphQL resolver logic for Invoice field resolvers
async function simulateGraphQLResolverResponse() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔍 Simulating GraphQL resolver response for INV-BD-52-250613-250616...')
    
    // Find the invoice
    const invoiceQuery = `
      MATCH (i:Invoice {invoiceNumber: "INV-BD-52-250613-250616"})
      RETURN i
    `
    
    const invoiceResult = await neo4j.runQuery(invoiceQuery)
    
    if (invoiceResult.length === 0) {
      console.log('❌ Invoice not found')
      return
    }
    
    const invoice = invoiceResult[0].i.properties
    console.log(`📄 Invoice: ${invoice.invoiceNumber} (${invoice.id})`)
    
    // Simulate the jobs field resolver (from resolvers.ts line ~1200)
    console.log('\n📋 Jobs field resolver simulation:')
    
    const jobsQuery = `
      MATCH (i:Invoice {id: $invoiceId})<-[r:INVOICED_IN]-(j:Job)
      RETURN j, r.amount as amount, r.createdAt as invoicedAt
      ORDER BY j.jobDate
    `
    
    const jobsResult = await neo4j.runQuery(jobsQuery, { invoiceId: invoice.id })
    
    // Import validation service to ensure amounts are correct (as in the resolver)
    const { JobAmountValidationService } = await import('../services/jobAmountValidationService')
    const validationService = new JobAmountValidationService()
    
    const jobs = []
    
    for (const record of jobsResult) {
      try {
        // Validate and fix the job amount if needed
        const validation = await validationService.validateAndFixJobAmount(record.j.properties.id)
        
        if (validation.wasFixed) {
          console.log(`✅ Fixed job amount discrepancy for job ${record.j.properties.id}`)
        }
        
        const jobData = {
          job: {
            ...record.j.properties,
            calculatedAmount: validation.calculatedAmount
          },
          amount: validation.calculatedAmount, // Always use calculated amount
          invoicedAt: record.invoicedAt
        }
        
        jobs.push(jobData)
        
        console.log(`  Job ${record.j.properties.id}:`)
        console.log(`    job.calculatedAmount: ${validation.calculatedAmount}`)
        console.log(`    amount: ${validation.calculatedAmount}`)
        
      } catch (error) {
        console.warn(`Error validating job ${record.j.properties.id}:`, error)
        // Fall back to original data
        const jobData = {
          job: record.j.properties,
          amount: record.amount,
          invoicedAt: record.invoicedAt
        }
        jobs.push(jobData)
        
        console.log(`  Job ${record.j.properties.id} (fallback):`)
        console.log(`    job.calculatedAmount: ${record.j.properties.calculatedAmount}`)
        console.log(`    amount: ${record.amount}`)
      }
    }
    
    await validationService.close()
    
    // Simulate the calculations field resolver
    console.log('\n💰 Calculations field resolver simulation:')
    const calculations = await CalculationService.calculateInvoiceAmountsSimplified(invoice.id)
    
    console.log(`  subTotal: ${calculations.subTotal}`)
    console.log(`  commission: ${calculations.commission}`)
    console.log(`  hst: ${calculations.hst}`)
    console.log(`  total: ${calculations.total}`)
    
    // Now simulate what the frontend would see
    console.log('\n🎯 What the frontend receives:')
    console.log(`Invoice: ${invoice.invoiceNumber}`)
    console.log(`Jobs (${jobs.length}):`)
    
    let frontendJobTotal = 0
    for (const jobEntry of jobs) {
      // Simulate the formatCurrencyWithValidation logic
      const calculatedAmount = jobEntry.job?.calculatedAmount
      const relationshipAmount = jobEntry.amount
      
      console.log(`  Job ${jobEntry.job.id}:`)
      console.log(`    jobEntry.job.calculatedAmount: ${calculatedAmount}`)
      console.log(`    jobEntry.amount: ${relationshipAmount}`)
      
      // The validation function would use calculatedAmount if available
      const displayAmount = calculatedAmount !== undefined && calculatedAmount !== null ? calculatedAmount : relationshipAmount
      console.log(`    Frontend would display: $${displayAmount}`)
      
      frontendJobTotal += displayAmount
    }
    
    console.log(`\nFrontend job total: $${frontendJobTotal.toFixed(2)}`)
    console.log(`Calculations total: $${calculations.total.toFixed(2)}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await neo4j.close()
  }
}

simulateGraphQLResolverResponse()
  .then(() => {
    console.log('\n✅ Simulation completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Simulation failed:', error)
    process.exit(1)
  })
