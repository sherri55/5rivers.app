import { Neo4jService } from '../database/neo4j'
import CalculationService from '../services/calculationService'
import PDFService from '../services/pdfService'

async function testAmountConsistency() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔍 Testing amount consistency between frontend and PDF...')
    
    // Get a sample invoice with jobs
    const invoiceQuery = `
      MATCH (i:Invoice)<-[rel:INVOICED_IN]-(j:Job)-[:OF_TYPE]->(jt:JobType)
      RETURN i.id as invoiceId, i.invoiceNumber, 
             j.id as jobId, 
             rel.amount as relationshipAmount,
             jt.dispatchType, jt.rateOfJob
      LIMIT 5
    `
    
    const results = await neo4j.runQuery(invoiceQuery)
    
    if (results.length === 0) {
      console.log('❌ No invoiced jobs found for testing')
      await neo4j.close()
      return
    }
    
    console.log(`Found ${results.length} jobs to test\n`)
    
    for (const record of results) {
      console.log(`📋 Testing Job ${record.jobId.slice(-6)} in ${record.invoiceNumber}`)
      console.log(`   Type: ${record.dispatchType}, Rate: $${record.rateOfJob}`)
      
      // Test 1: Relationship amount (what was stored)
      const relationshipAmount = record.relationshipAmount
      console.log(`   1. Relationship Amount: $${relationshipAmount}`)
      
      // Test 2: Calculated amount (what frontend should show)
      const calculatedAmount = await CalculationService.calculateJobAmount(record.jobId)
      console.log(`   2. Calculated Amount: $${calculatedAmount}`)
      
      // Test 3: PDF amount (what PDF should show)
      const pdfService = new PDFService()
      try {
        // This will internally validate and fix amounts
        const pdfBuffer = await pdfService.generateInvoicePDF(record.invoiceId)
        console.log(`   3. PDF Generation: ✅ Success (${pdfBuffer.length} bytes)`)
        await pdfService.close()
      } catch (error) {
        console.log(`   3. PDF Generation: ❌ Failed - ${error}`)
      }
      
      // Check consistency
      const difference = Math.abs(relationshipAmount - calculatedAmount)
      if (difference > 0.01) {
        console.log(`   ⚠️ INCONSISTENCY: $${difference.toFixed(2)} difference`)
        
        // Test auto-fix
        try {
          const { JobAmountValidationService } = await import('../services/jobAmountValidationService')
          const validationService = new JobAmountValidationService()
          const fixed = await validationService.validateAndFixJobAmount(record.jobId)
          
          if (fixed.wasFixed) {
            console.log(`   ✅ AUTO-FIXED: $${fixed.currentAmount} → $${fixed.calculatedAmount}`)
          } else {
            console.log(`   ✅ ALREADY VALID`)
          }
          
          await validationService.close()
        } catch (fixError) {
          console.log(`   ❌ AUTO-FIX FAILED: ${fixError}`)
        }
      } else {
        console.log(`   ✅ CONSISTENT`)
      }
      
      console.log('')
    }
    
    console.log('\n🎉 Amount consistency test completed!')
    
  } catch (error) {
    console.error('❌ Error during testing:', error)
  } finally {
    await neo4j.close()
  }
}

// Export for use as a script or module
if (require.main === module) {
  testAmountConsistency()
}

export default testAmountConsistency
