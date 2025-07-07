import { Neo4jService } from '../database/neo4j'
import CalculationService from '../services/calculationService'

async function fixZeroAmounts() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔧 Fixing zero invoice amounts...')
    
    // Find all invoice-job relationships with zero amounts
    const zeroAmountsQuery = `
      MATCH (i:Invoice)-[rel:HAS_INVOICE|INVOICED_IN]-(j:Job)
      WHERE rel.amount = 0 OR rel.amount IS NULL
      RETURN i.id as invoiceId, i.invoiceNumber as invoiceNumber, 
             j.id as jobId, j.startTime as startTime, j.endTime as endTime,
             rel.amount as currentAmount, type(rel) as relationshipType
      ORDER BY i.invoiceNumber
    `
    
    const zeroAmounts = await neo4j.runQuery(zeroAmountsQuery)
    
    if (zeroAmounts.length === 0) {
      console.log('✅ No zero amounts found')
      return
    }
    
    console.log(`📊 Found ${zeroAmounts.length} zero invoice amounts to fix:`)
    
    for (const record of zeroAmounts) {
      console.log(`\n🔍 Processing job ${record.jobId.slice(-6)} in invoice ${record.invoiceNumber}:`)
      console.log(`  Current amount: $${record.currentAmount || 0} (${record.relationshipType})`)
      console.log(`  Times: ${record.startTime} - ${record.endTime}`)
      
      // Recalculate the correct amount using the fixed calculation service
      try {
        const correctAmount = await CalculationService.calculateJobAmount(record.jobId)
        console.log(`  Calculated amount: $${correctAmount}`)
        
        if (correctAmount !== (record.currentAmount || 0)) {
          // Update the relationship amount - handle both relationship types
          const updateQuery = record.relationshipType === 'HAS_INVOICE' 
            ? `
              MATCH (i:Invoice {id: $invoiceId})-[rel:HAS_INVOICE]-(j:Job {id: $jobId})
              SET rel.amount = $newAmount
              RETURN rel.amount as updatedAmount
            `
            : `
              MATCH (i:Invoice {id: $invoiceId})<-[rel:INVOICED_IN]-(j:Job {id: $jobId})
              SET rel.amount = $newAmount
              RETURN rel.amount as updatedAmount
            `
          
          await neo4j.runQuery(updateQuery, {
            invoiceId: record.invoiceId,
            jobId: record.jobId,
            newAmount: correctAmount
          })
          
          console.log(`  ✅ Updated amount from $${record.currentAmount || 0} to $${correctAmount}`)
        } else {
          console.log(`  ℹ️ Amount is already correct`)
        }
      } catch (error) {
        console.error(`  ❌ Error calculating amount for job ${record.jobId}:`, error)
      }
    }
    
    console.log('\n✅ Zero invoice amount fix completed')
    
  } catch (error) {
    console.error('❌ Error fixing zero invoice amounts:', error)
  } finally {
    await neo4j.close()
  }
}

fixZeroAmounts()
