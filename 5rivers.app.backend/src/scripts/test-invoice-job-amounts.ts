import { Neo4jService } from '../database/neo4j'
import CalculationService from '../services/calculationService'

async function testInvoiceJobAmounts() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔍 Testing invoice job amounts...')
    
    // Find invoices with potentially problematic dates (overnight jobs)
    const invoicesQuery = `
      MATCH (i:Invoice)<-[r:INVOICED_IN]-(j:Job)
      WHERE j.startTime IS NOT NULL AND j.endTime IS NOT NULL
      AND j.startTime > j.endTime
      RETURN i.invoiceNumber as invoiceNumber, 
             collect({
               jobId: j.id,
               startTime: j.startTime,
               endTime: j.endTime,
               relationshipAmount: r.amount
             }) as overnightJobs
      ORDER BY i.invoiceNumber
      LIMIT 10
    `
    
    const invoices = await neo4j.runQuery(invoicesQuery)
    
    console.log(`📊 Found ${invoices.length} invoices with overnight jobs:`)
    
    for (const invoice of invoices) {
      console.log(`\n🧾 Invoice: ${invoice.invoiceNumber}`)
      
      for (const job of invoice.overnightJobs) {
        console.log(`  Job ${job.jobId.slice(-6)}: ${job.startTime} - ${job.endTime}`)
        console.log(`    Relationship amount: $${job.relationshipAmount}`)
        
        try {
          const calculatedAmount = await CalculationService.calculateJobAmount(job.jobId)
          console.log(`    Calculated amount: $${calculatedAmount}`)
          
          if (Math.abs(job.relationshipAmount - calculatedAmount) > 0.01) {
            console.log(`    ⚠️ DISCREPANCY: $${Math.abs(job.relationshipAmount - calculatedAmount).toFixed(2)}`)
          } else {
            console.log(`    ✅ Amounts match`)
          }
        } catch (error) {
          console.error(`    ❌ Error calculating: ${error}`)
        }
      }
    }
    
    // Also check for any invoice with the specific pattern mentioned
    const specificQuery = `
      MATCH (i:Invoice)
      WHERE i.invoiceNumber CONTAINS '250218' OR i.invoiceNumber CONTAINS '250219'
      RETURN i.invoiceNumber, i.id
    `
    
    const specificInvoices = await neo4j.runQuery(specificQuery)
    
    if (specificInvoices.length > 0) {
      console.log(`\n🎯 Found specific invoices:`)
      for (const inv of specificInvoices) {
        console.log(`  ${inv.invoiceNumber} (${inv.id.slice(-6)})`)
        
        // Get jobs for this specific invoice
        const jobsQuery = `
          MATCH (i:Invoice {id: $invoiceId})<-[r:INVOICED_IN]-(j:Job)
          RETURN j.id as jobId, j.startTime, j.endTime, r.amount as relationshipAmount
        `
        
        const jobs = await neo4j.runQuery(jobsQuery, { invoiceId: inv.id })
        
        for (const job of jobs) {
          console.log(`    Job ${job.jobId.slice(-6)}: ${job.startTime}-${job.endTime}, Amount: $${job.relationshipAmount}`)
          
          const calculated = await CalculationService.calculateJobAmount(job.jobId)
          console.log(`      Calculated: $${calculated}`)
        }
      }
    }
    
    console.log('\n✅ Invoice job amount testing completed')
    
  } catch (error) {
    console.error('❌ Error testing invoice job amounts:', error)
  } finally {
    await neo4j.close()
  }
}

testInvoiceJobAmounts()
