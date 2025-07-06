import { Neo4jService } from '../database/neo4j'

async function checkInvoiceJobAmounts() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔍 Checking invoice job amounts...')
    
    // Get all invoices with their jobs
    const invoiceQuery = `
      MATCH (i:Invoice)
      OPTIONAL MATCH (i)-[rel:HAS_INVOICE]-(j:Job)
      OPTIONAL MATCH (j)-[:HAS_JOB_TYPE]->(jt:JobType)
      RETURN i.id as invoiceId, i.invoiceNumber as invoiceNumber, i.status as status,
             j.id as jobId, j.jobDate as jobDate, j.startTime as startTime, j.endTime as endTime,
             j.weight as weight, j.loads as loads, rel.amount as jobAmount,
             jt.title as jobTypeTitle, jt.dispatchType as dispatchType, jt.rateOfJob as jobRate
      ORDER BY i.invoiceNumber
    `
    
    const result = await neo4j.runQuery(invoiceQuery)
    
    if (result.length === 0) {
      console.log('❌ No invoices found')
      return
    }
    
    console.log(`📊 Found invoices:`)
    
    const invoiceMap = new Map()
    
    for (const record of result) {
      const invoiceId = record.invoiceId
      const invoiceNumber = record.invoiceNumber || `Invoice-${invoiceId?.slice(-6)}`
      
      if (!invoiceMap.has(invoiceId)) {
        invoiceMap.set(invoiceId, {
          id: invoiceId,
          number: invoiceNumber,
          status: record.status,
          jobs: []
        })
      }
      
      if (record.jobId) {
        invoiceMap.get(invoiceId).jobs.push({
          id: record.jobId,
          date: record.jobDate,
          startTime: record.startTime,
          endTime: record.endTime,
          weight: record.weight,
          loads: record.loads,
          amount: record.jobAmount,
          jobType: record.jobTypeTitle,
          dispatchType: record.dispatchType,
          rate: record.jobRate
        })
      }
    }
    
    for (const invoice of invoiceMap.values()) {
      console.log(`\nInvoice ${invoice.number} (Status: ${invoice.status}):`)
      
      if (invoice.jobs.length === 0) {
        console.log('  No jobs attached')
        continue
      }
      
      let totalAmount = 0
      for (const job of invoice.jobs) {
        const amount = job.amount || 0
        totalAmount += amount
        
        console.log(`  Job ${job.id.slice(-6)}:`)
        console.log(`    Date: ${job.date}`)
        console.log(`    Type: ${job.jobType} (${job.dispatchType}) - Rate: ${job.rate}`)
        console.log(`    Time: ${job.startTime || 'N/A'} - ${job.endTime || 'N/A'}`)
        console.log(`    Weight: ${job.weight || 'N/A'}, Loads: ${job.loads || 'N/A'}`)
        console.log(`    Amount: $${amount.toFixed(2)} ${amount < 0 ? '⚠️ NEGATIVE!' : ''}`)
      }
      
      console.log(`  Total: $${totalAmount.toFixed(2)}`)
    }
    
    console.log('\n✅ Invoice job amount check completed')
    
  } catch (error) {
    console.error('❌ Error checking invoice job amounts:', error)
  } finally {
    await neo4j.close()
  }
}

checkInvoiceJobAmounts()
