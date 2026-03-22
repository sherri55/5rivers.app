import { Neo4jService } from '../database/neo4j'
import CalculationService from '../services/calculationService'

async function debugSpecificInvoice() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔍 Debugging invoice INV-BD-52-250613-250616...')
    
    // Find the invoice ID
    const invoiceQuery = `
      MATCH (i:Invoice {invoiceNumber: "INV-BD-52-250613-250616"})
      RETURN i.id as invoiceId, i.invoiceNumber as invoiceNumber
    `
    
    const invoiceResult = await neo4j.runQuery(invoiceQuery)
    
    if (invoiceResult.length === 0) {
      console.log('❌ Invoice not found')
      return
    }
    
    const invoiceId = invoiceResult[0].invoiceId
    console.log(`📄 Invoice ID: ${invoiceId}`)
    
    // Get all jobs for this invoice with detailed information
    const jobsQuery = `
      MATCH (i:Invoice {id: $invoiceId})<-[r:INVOICED_IN]-(j:Job)-[:OF_TYPE]->(jt:JobType)
      OPTIONAL MATCH (j)-[:ASSIGNED_TO]->(d:Driver)
      OPTIONAL MATCH (j)-[:USES_UNIT]->(u:Unit)
      RETURN j.id as jobId,
             j.jobDate as jobDate,
             j.startTime as startTime,
             j.endTime as endTime,
             j.loads as loads,
             j.weight as weight,
             j.calculatedAmount as storedCalculatedAmount,
             r.amount as relationshipAmount,
             jt.title as jobType,
             jt.dispatchType as dispatchType,
             jt.rateOfJob as rate,
             d.name as driverName,
             u.name as unitName
      ORDER BY j.jobDate
    `
    
    const jobsResult = await neo4j.runQuery(jobsQuery, { invoiceId })
    
    console.log(`📋 Found ${jobsResult.length} jobs:`)
    
    let totalRelationshipAmount = 0
    let totalCalculatedAmount = 0
    let totalStoredCalculatedAmount = 0
    
    for (const job of jobsResult) {
      console.log(`\n🔧 Job: ${job.jobType} (${job.jobId})`)
      console.log(`   Date: ${job.jobDate}`)
      console.log(`   Driver: ${job.driverName}, Unit: ${job.unitName}`)
      console.log(`   Type: ${job.dispatchType}, Rate: $${job.rate}`)
      
      if (job.dispatchType?.toLowerCase() === 'hourly') {
        console.log(`   Times: ${job.startTime} - ${job.endTime}`)
      } else if (job.dispatchType?.toLowerCase() === 'tonnage') {
        console.log(`   Weight: ${JSON.stringify(job.weight)}`)
      } else if (job.dispatchType?.toLowerCase() === 'load' || job.dispatchType?.toLowerCase() === 'loads') {
        console.log(`   Loads: ${job.loads}`)
      }
      
      // Calculate the amount using the service
      try {
        const calculatedAmount = await CalculationService.calculateJobAmount(job.jobId)
        
        console.log(`   Amounts:`)
        console.log(`     Relationship: $${job.relationshipAmount?.toFixed(2) || '0.00'}`)
        console.log(`     Stored Calculated: $${job.storedCalculatedAmount?.toFixed(2) || '0.00'}`)
        console.log(`     Fresh Calculated: $${calculatedAmount.toFixed(2)}`)
        
        totalRelationshipAmount += job.relationshipAmount || 0
        totalCalculatedAmount += calculatedAmount
        totalStoredCalculatedAmount += job.storedCalculatedAmount || 0
        
        const relDiff = Math.abs((job.relationshipAmount || 0) - calculatedAmount)
        const storedDiff = Math.abs((job.storedCalculatedAmount || 0) - calculatedAmount)
        
        if (relDiff > 0.01) {
          console.log(`     ⚠️  Relationship mismatch: $${relDiff.toFixed(2)}`)
        }
        if (storedDiff > 0.01) {
          console.log(`     ⚠️  Stored calculated mismatch: $${storedDiff.toFixed(2)}`)
        }
        
      } catch (error) {
        console.error(`     ❌ Error calculating amount: ${error}`)
      }
    }
    
    console.log(`\n📊 TOTALS:`)
    console.log(`   Relationship amounts: $${totalRelationshipAmount.toFixed(2)}`)
    console.log(`   Stored calculated amounts: $${totalStoredCalculatedAmount.toFixed(2)}`)
    console.log(`   Fresh calculated amounts: $${totalCalculatedAmount.toFixed(2)}`)
    
    // Check what the invoice calculations service returns
    try {
      const invoiceCalculations = await CalculationService.getInvoiceCalculations(invoiceId)
      console.log(`\n💰 Invoice Calculations:`)
      console.log(`   SubTotal: $${invoiceCalculations.subTotal.toFixed(2)}`)
      console.log(`   Commission: $${invoiceCalculations.commission.toFixed(2)}`)
      console.log(`   HST: $${invoiceCalculations.hst.toFixed(2)}`)
      console.log(`   Total: $${invoiceCalculations.total.toFixed(2)}`)
    } catch (error) {
      console.error(`❌ Error getting invoice calculations: ${error}`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await neo4j.close()
  }
}

debugSpecificInvoice()
  .then(() => {
    console.log('\n✅ Debug completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Debug failed:', error)
    process.exit(1)
  })
