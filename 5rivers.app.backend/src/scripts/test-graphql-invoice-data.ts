import { Neo4jService } from '../database/neo4j'

async function testInvoiceGraphQLData() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔍 Testing invoice GraphQL data...')
    
    // Get the first invoice with jobs
    const query = `
      MATCH (i:Invoice)<-[r:INVOICED_IN]-(j:Job)
      WITH i, count(j) as jobCount
      WHERE jobCount > 0
      RETURN i.id as invoiceId, i.invoiceNumber as invoiceNumber, jobCount
      LIMIT 1
    `
    
    const result = await neo4j.runQuery(query)
    
    if (result.length === 0) {
      console.log('❌ No invoices with jobs found')
      return
    }
    
    const invoiceId = result[0].invoiceId
    const invoiceNumber = result[0].invoiceNumber
    console.log(`📄 Testing invoice: ${invoiceNumber} (${invoiceId})`)
    
    // Get jobs data as the resolver would
    const jobsQuery = `
      MATCH (i:Invoice {id: $invoiceId})<-[r:INVOICED_IN]-(j:Job)
      RETURN j, r.amount as amount, r.createdAt as invoicedAt
      ORDER BY j.jobDate
    `
    
    const jobsResult = await neo4j.runQuery(jobsQuery, { invoiceId })
    
    console.log(`📋 Found ${jobsResult.length} jobs:`)
    
    for (const record of jobsResult) {
      const job = record.j.properties
      const relationshipAmount = record.amount
      const calculatedAmount = job.calculatedAmount
      
      console.log(`  🔧 Job ${job.id}:`)
      console.log(`     Relationship Amount: $${relationshipAmount?.toFixed(2) || '0.00'}`)
      console.log(`     Job.calculatedAmount: $${calculatedAmount?.toFixed(2) || '0.00'}`)
      
      const difference = Math.abs((relationshipAmount || 0) - (calculatedAmount || 0))
      if (difference > 0.01) {
        console.log(`     ⚠️  MISMATCH: $${difference.toFixed(2)} difference`)
      } else {
        console.log(`     ✅ Amounts match`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await neo4j.close()
  }
}

testInvoiceGraphQLData()
  .then(() => {
    console.log('\n✅ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
