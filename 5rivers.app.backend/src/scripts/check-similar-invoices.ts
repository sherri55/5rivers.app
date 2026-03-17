import { Neo4jService } from '../database/neo4j'

async function checkForSimilarInvoices() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔍 Checking for invoices with similar numbers...')
    
    // Check for all invoices containing "BD-52"
    const query = `
      MATCH (i:Invoice)
      WHERE i.invoiceNumber CONTAINS "BD-52"
      RETURN i.id as invoiceId, i.invoiceNumber as invoiceNumber, i.createdAt as createdAt
      ORDER BY i.createdAt DESC
    `
    
    const result = await neo4j.runQuery(query)
    
    console.log(`📄 Found ${result.length} invoices with "BD-52":`)
    
    for (const record of result) {
      const invoiceId = record.invoiceId
      const invoiceNumber = record.invoiceNumber
      
      console.log(`  ${invoiceNumber} (${invoiceId})`)
      
      // Get job count and total for each
      const jobsQuery = `
        MATCH (i:Invoice {id: $invoiceId})<-[r:INVOICED_IN]-(j:Job)
        RETURN count(j) as jobCount, sum(r.amount) as totalAmount
      `
      
      const jobsResult = await neo4j.runQuery(jobsQuery, { invoiceId })
      
      if (jobsResult.length > 0) {
        const jobCount = jobsResult[0].jobCount
        const totalAmount = jobsResult[0].totalAmount || 0
        console.log(`    Jobs: ${jobCount}, Total: $${totalAmount.toFixed(2)}`)
      } else {
        console.log(`    No jobs found`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await neo4j.close()
  }
}

checkForSimilarInvoices()
  .then(() => {
    console.log('\n✅ Check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Check failed:', error)
    process.exit(1)
  })
