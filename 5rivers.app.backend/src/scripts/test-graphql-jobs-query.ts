import { Neo4jService } from '../database/neo4j'

async function testGraphQLInvoicesQuery() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔍 Testing GraphQL invoices query for INV-BD-52-250613-250616...')
    
    // Simulate the exact query the frontend uses
    const query = `
      MATCH (i:Invoice {invoiceNumber: "INV-BD-52-250613-250616"})
      RETURN i.id as invoiceId, i.invoiceNumber as invoiceNumber
    `
    
    const invoiceResult = await neo4j.runQuery(query)
    const invoiceId = invoiceResult[0].invoiceId
    
    console.log(`📄 Invoice ID: ${invoiceId}`)
    
    // Test the jobs field resolver query
    const jobsQuery = `
      MATCH (i:Invoice {id: $invoiceId})<-[r:INVOICED_IN]-(j:Job)
      RETURN j, r.amount as amount, r.createdAt as invoicedAt
      ORDER BY j.jobDate
    `
    
    const jobsResult = await neo4j.runQuery(jobsQuery, { invoiceId })
    
    console.log(`📋 GraphQL Jobs Field Query Results:`)
    
    for (const record of jobsResult) {
      const job = record.j.properties
      const relationshipAmount = record.amount
      
      console.log(`  Job ${job.id}:`)
      console.log(`    calculatedAmount: $${job.calculatedAmount?.toFixed(2) || '0.00'}`)
      console.log(`    relationship amount: $${relationshipAmount?.toFixed(2) || '0.00'}`)
    }
    
    // Test the calculations field resolver
    console.log(`\n💰 Calculations field resolver would call CalculationService.calculateInvoiceAmountsSimplified()`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await neo4j.close()
  }
}

testGraphQLInvoicesQuery()
  .then(() => {
    console.log('\n✅ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
