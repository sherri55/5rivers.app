import { Neo4jService } from '../database/neo4j'
import CalculationService from '../services/calculationService'

async function fixAllJobAmountDiscrepancies() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔧 Fixing all job amount discrepancies...')
    
    // Find all jobs with potential amount discrepancies
    const query = `
      MATCH (i:Invoice)<-[rel:INVOICED_IN]-(j:Job)-[:OF_TYPE]->(jt:JobType)
      RETURN i.id as invoiceId, i.invoiceNumber as invoiceNumber,
             j.id as jobId, rel.amount as relationshipAmount,
             jt.dispatchType as dispatchType
      ORDER BY i.invoiceNumber
    `
    
    const results = await neo4j.runQuery(query)
    
    console.log(`Found ${results.length} jobs to validate`)
    
    let totalFixed = 0
    let totalErrors = 0
    
    for (const record of results) {
      try {
        const calculatedAmount = await CalculationService.calculateJobAmount(record.jobId)
        const difference = Math.abs(record.relationshipAmount - calculatedAmount)
        
        if (difference > 0.01) {
          console.log(`\n🔍 Job ${record.jobId.slice(-6)} (${record.dispatchType}) in ${record.invoiceNumber}:`)
          console.log(`  Current: $${record.relationshipAmount}, Calculated: $${calculatedAmount}`)
          console.log(`  Difference: $${difference.toFixed(2)}`)
          
          // Update the relationship amount
          const updateQuery = `
            MATCH (j:Job {id: $jobId})-[r:INVOICED_IN]->(i:Invoice)
            SET r.amount = $newAmount
            RETURN r.amount as updatedAmount
          `
          
          await neo4j.runQuery(updateQuery, {
            jobId: record.jobId,
            newAmount: calculatedAmount
          })
          
          console.log(`  ✅ Fixed: Updated to $${calculatedAmount}`)
          totalFixed++
        }
      } catch (error) {
        console.log(`\n❌ Error processing job ${record.jobId.slice(-6)}: ${error}`)
        totalErrors++
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`  Total jobs checked: ${results.length}`)
    console.log(`  Jobs fixed: ${totalFixed}`)
    console.log(`  Errors: ${totalErrors}`)
    
    if (totalFixed > 0) {
      console.log(`\n🔧 Re-validating fixed jobs...`)
      
      // Re-run validation to confirm fixes
      let stillHaveIssues = 0
      for (const record of results) {
        try {
          const calculatedAmount = await CalculationService.calculateJobAmount(record.jobId)
          
          // Get updated relationship amount
          const checkQuery = `
            MATCH (j:Job {id: $jobId})-[r:INVOICED_IN]->(i:Invoice)
            RETURN r.amount as currentAmount
          `
          const checkResult = await neo4j.runQuery(checkQuery, { jobId: record.jobId })
          
          if (checkResult.length > 0) {
            const currentAmount = checkResult[0].currentAmount
            const difference = Math.abs(currentAmount - calculatedAmount)
            
            if (difference > 0.01) {
              stillHaveIssues++
              console.log(`  ⚠️ Job ${record.jobId.slice(-6)} still has discrepancy: $${difference.toFixed(2)}`)
            }
          }
        } catch (error) {
          // Ignore validation errors for now
        }
      }
      
      if (stillHaveIssues === 0) {
        console.log(`  ✅ All amounts are now consistent!`)
      } else {
        console.log(`  ⚠️ ${stillHaveIssues} jobs still have discrepancies`)
      }
    }
    
    console.log('\n✅ Job amount fix completed')
    
    await neo4j.close()
  } catch (error) {
    console.error('❌ Error fixing job amounts:', error)
    await neo4j.close()
  }
}

fixAllJobAmountDiscrepancies()
