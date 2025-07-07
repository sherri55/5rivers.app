import { Neo4jService } from '../database/neo4j'

async function checkInvoiceData() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔍 Checking invoice data...')
    
    // Get all invoices with their jobs
    const result = await neo4j.runQuery(`
      MATCH (i:Invoice)
      WITH i
      OPTIONAL MATCH (i)-[ij:INCLUDES]->(j:Job)
      OPTIONAL MATCH (j)-[:OF_TYPE]->(jt:JobType)
      RETURN i.id as invoiceId, 
             i.invoiceNumber as invoiceNumber,
             i.createdAt as createdAt,
             count(j) as jobCount,
             collect({
               jobId: j.id,
               jobType: jt.title,
               relationshipAmount: ij.amount,
               calculatedAmount: j.calculatedAmount
             }) as jobs
      ORDER BY i.createdAt DESC
    `)
    
    console.log(`📊 Found ${result.length} invoices`)
    
    for (const record of result) {
      const invoiceId = record.invoiceId
      const invoiceNumber = record.invoiceNumber
      const jobCount = record.jobCount
      const jobs = record.jobs
      
      console.log(`\n📄 Invoice: ${invoiceNumber || 'No Number'} (${invoiceId})`)
      console.log(`   Jobs: ${jobCount}`)
      
      for (const job of jobs) {
        if (!job.jobId) continue
        
        const relAmount = job.relationshipAmount
        const calcAmount = job.calculatedAmount
        const difference = Math.abs((relAmount || 0) - (calcAmount || 0))
        
        console.log(`   - ${job.jobType || 'Unknown'}: Rel=$${relAmount?.toFixed(2) || '0.00'}, Calc=$${calcAmount?.toFixed(2) || '0.00'}`)
        
        if (difference > 0.01) {
          console.log(`     ⚠️  MISMATCH: $${difference.toFixed(2)} difference`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await neo4j.close()
  }
}

checkInvoiceData()
  .then(() => {
    console.log('\n✅ Check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Check failed:', error)
    process.exit(1)
  })
