import { Neo4jService } from '../database/neo4j'
import CalculationService from '../services/calculationService'

async function validateJobAmounts() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔍 Validating job amounts across the application...')
    
    // Get invoices with their jobs for comparison
    const query = `
      MATCH (i:Invoice)<-[rel:INVOICED_IN]-(j:Job)-[:OF_TYPE]->(jt:JobType)
      OPTIONAL MATCH (j)-[:ASSIGNED_TO]->(d:Driver)
      OPTIONAL MATCH (j)-[:USES_UNIT]->(u:Unit)
      RETURN i.id as invoiceId, i.invoiceNumber as invoiceNumber,
             j.id as jobId, j.jobDate, j.startTime, j.endTime, j.loads, j.weight,
             rel.amount as relationshipAmount,
             jt.title as jobTypeTitle, jt.rateOfJob as rate, jt.dispatchType as dispatchType,
             d.name as driverName, u.name as unitName
      ORDER BY i.invoiceNumber
      LIMIT 10
    `
    
    const results = await neo4j.runQuery(query)
    
    console.log(`Found ${results.length} job entries to validate\n`)
    
    const discrepancies = []
    
    for (const record of results) {
      console.log(`📋 Job ${record.jobId.slice(-6)} (${record.jobTypeTitle})`)
      console.log(`   Invoice: ${record.invoiceNumber}`)
      console.log(`   Type: ${record.dispatchType}, Rate: $${record.rate}`)
      console.log(`   Times: ${record.startTime} - ${record.endTime}`)
      console.log(`   Driver: ${record.driverName}, Unit: ${record.unitName}`)
      
      // Get the relationship amount (what PDF uses)
      const relationshipAmount = record.relationshipAmount
      console.log(`   Relationship Amount: $${relationshipAmount}`)
      
      // Calculate using CalculationService (what frontend uses)
      try {
        const calculatedAmount = await CalculationService.calculateJobAmount(record.jobId)
        console.log(`   Calculated Amount: $${calculatedAmount}`)
        
        const difference = Math.abs(relationshipAmount - calculatedAmount)
        if (difference > 0.01) {
          console.log(`   ⚠️ DISCREPANCY: $${difference.toFixed(2)}`)
          discrepancies.push({
            jobId: record.jobId,
            invoiceNumber: record.invoiceNumber,
            relationshipAmount,
            calculatedAmount,
            difference,
            dispatchType: record.dispatchType,
            rate: record.rate,
            startTime: record.startTime,
            endTime: record.endTime
          })
        } else {
          console.log(`   ✅ Amounts match`)
        }
      } catch (error) {
        console.log(`   ❌ Error calculating: ${error}`)
      }
      
      console.log('')
    }
    
    if (discrepancies.length > 0) {
      console.log(`\n🚨 Found ${discrepancies.length} discrepancies:`)
      discrepancies.forEach((disc, index) => {
        console.log(`${index + 1}. Job ${disc.jobId.slice(-6)} in ${disc.invoiceNumber}:`)
        console.log(`   Relationship: $${disc.relationshipAmount}, Calculated: $${disc.calculatedAmount}`)
        console.log(`   Difference: $${disc.difference.toFixed(2)}`)
      })
    } else {
      console.log(`\n✅ No discrepancies found!`)
    }
    
    await neo4j.close()
  } catch (error) {
    console.error('❌ Error validating amounts:', error)
    await neo4j.close()
  }
}

validateJobAmounts()
