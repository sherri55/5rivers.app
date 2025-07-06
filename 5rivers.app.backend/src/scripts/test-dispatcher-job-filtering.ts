import { Neo4jService } from '../database/neo4j'

async function testDispatcherJobFiltering() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔍 Testing dispatcher job filtering...')
    
    // First, get all dispatchers and their invoices
    const dispatchersQuery = `
      MATCH (d:Dispatcher)
      OPTIONAL MATCH (d)<-[:BILLED_BY]-(i:Invoice)
      RETURN d.id as dispatcherId, d.name as dispatcherName, 
             collect(DISTINCT i.id) as invoiceIds
      ORDER BY d.name
    `
    
    const dispatchers = await neo4j.runQuery(dispatchersQuery)
    
    if (dispatchers.length === 0) {
      console.log('❌ No dispatchers found')
      return
    }
    
    console.log(`📊 Found ${dispatchers.length} dispatchers:`)
    
    for (const dispatcher of dispatchers) {
      console.log(`\n👤 Dispatcher: ${dispatcher.dispatcherName} (${dispatcher.dispatcherId})`)
      console.log(`   Invoices: ${dispatcher.invoiceIds.length}`)
      
      // Get jobs for this dispatcher
      const jobsQuery = `
        MATCH (d:Dispatcher {id: $dispatcherId})<-[:DISPATCHED_BY]-(j:Job)
        OPTIONAL MATCH (j)-[:HAS_JOB_TYPE]->(jt:JobType)
        RETURN j.id as jobId, j.jobDate as jobDate, j.invoiceStatus as invoiceStatus,
               jt.title as jobTypeTitle
        ORDER BY j.jobDate DESC
        LIMIT 10
      `
      
      const jobs = await neo4j.runQuery(jobsQuery, { dispatcherId: dispatcher.dispatcherId })
      
      console.log(`   Jobs: ${jobs.length} (showing first 10)`)
      
      if (jobs.length > 0) {
        const statusCounts = jobs.reduce((acc: any, job: any) => {
          const status = job.invoiceStatus || 'NO_STATUS'
          acc[status] = (acc[status] || 0) + 1
          return acc
        }, {})
        
        console.log(`   Job statuses:`, statusCounts)
        
        // Show a few sample jobs
        jobs.slice(0, 3).forEach((job: any) => {
          console.log(`     - ${job.jobId.slice(-6)}: ${job.jobTypeTitle || 'Unknown'} (${job.jobDate}) - ${job.invoiceStatus}`)
        })
      }
      
      // If this dispatcher has invoices, check one invoice's jobs
      if (dispatcher.invoiceIds.length > 0) {
        const invoiceId = dispatcher.invoiceIds[0]
        const invoiceJobsQuery = `
          MATCH (i:Invoice {id: $invoiceId})-[rel:HAS_INVOICE]-(j:Job)
          OPTIONAL MATCH (j)-[:HAS_JOB_TYPE]->(jt:JobType)
          RETURN j.id as jobId, j.jobDate as jobDate, jt.title as jobTypeTitle,
                 rel.amount as amount
          ORDER BY j.jobDate
        `
        
        const invoiceJobs = await neo4j.runQuery(invoiceJobsQuery, { invoiceId })
        
        if (invoiceJobs.length > 0) {
          console.log(`   Sample invoice (${invoiceId.slice(-6)}) has ${invoiceJobs.length} jobs:`)
          invoiceJobs.forEach((job: any) => {
            console.log(`     - ${job.jobId.slice(-6)}: ${job.jobTypeTitle || 'Unknown'} ($${job.amount})`)
          })
        }
      }
    }
    
    console.log('\n✅ Dispatcher job filtering test completed')
    
  } catch (error) {
    console.error('❌ Error testing dispatcher job filtering:', error)
  } finally {
    await neo4j.close()
  }
}

testDispatcherJobFiltering()
