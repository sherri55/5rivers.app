import { Neo4jService } from '../database/neo4j'
import CalculationService from '../services/calculationService'

async function fixNegativeInvoiceAmounts() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔧 Fixing negative invoice amounts caused by overnight jobs...')
    
    // Find all invoice-job relationships with negative amounts (both relationship types)
    const negativeAmountsQuery = `
      MATCH (i:Invoice)-[rel:HAS_INVOICE|INVOICED_IN]-(j:Job)
      WHERE rel.amount < 0
      RETURN i.id as invoiceId, i.invoiceNumber as invoiceNumber, 
             j.id as jobId, j.startTime as startTime, j.endTime as endTime,
             rel.amount as currentAmount, type(rel) as relationshipType
      ORDER BY i.invoiceNumber
    `
    
    const negativeAmounts = await neo4j.runQuery(negativeAmountsQuery)
    
    if (negativeAmounts.length === 0) {
      console.log('✅ No negative amounts found')
      return
    }
    
    console.log(`📊 Found ${negativeAmounts.length} negative invoice amounts to fix:`)
    
    for (const record of negativeAmounts) {
      console.log(`\n🔍 Processing job ${record.jobId.slice(-6)} in invoice ${record.invoiceNumber}:`)
      console.log(`  Current amount: $${record.currentAmount} (${record.relationshipType})`)
      console.log(`  Times: ${record.startTime} - ${record.endTime}`)
      
      // Recalculate the correct amount using the fixed calculation service
      try {
        const correctAmount = await CalculationService.calculateJobAmount(record.jobId)
        console.log(`  Calculated amount: $${correctAmount}`)
        
        if (correctAmount !== record.currentAmount) {
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
          
          console.log(`  ✅ Updated amount from $${record.currentAmount} to $${correctAmount}`)
        } else {
          console.log(`  ℹ️ Amount is already correct`)
        }
      } catch (error) {
        console.error(`  ❌ Error calculating amount for job ${record.jobId}:`, error)
      }
    }
    
    console.log('\n🔧 Rechecking for any remaining negative amounts...')
    const remainingNegative = await neo4j.runQuery(negativeAmountsQuery)
    
    if (remainingNegative.length === 0) {
      console.log('✅ All negative amounts have been fixed!')
    } else {
      console.log(`⚠️ ${remainingNegative.length} negative amounts still remain`)
      for (const record of remainingNegative) {
        console.log(`  Job ${record.jobId.slice(-6)}: $${record.currentAmount} (${record.startTime} - ${record.endTime})`)
      }
    }
    
    console.log('\n✅ Negative invoice amount fix completed')
    
  } catch (error) {
    console.error('❌ Error fixing negative invoice amounts:', error)
  } finally {
    await neo4j.close()
  }
}

fixNegativeInvoiceAmounts()
