import { Neo4jService } from '../database/neo4j'

async function addSampleAmounts() {
  const neo4jService = new Neo4jService()
  const session = neo4jService.getSession()
  
  try {
    console.log('💰 Adding sample amounts to jobs...\n')
    
    // Get jobs that don't have amounts
    const jobsResult = await session.run(`
      MATCH (j:Job)
      WHERE j.amount IS NULL
      RETURN j.id as id, j.jobDate as jobDate
      ORDER BY j.jobDate DESC
      LIMIT 10
    `)
    
    if (jobsResult.records.length === 0) {
      console.log('✅ All jobs already have amounts!')
      return
    }
    
    console.log(`📋 Found ${jobsResult.records.length} jobs without amounts. Adding sample amounts...\n`)
    
    // Add sample amounts (between $200 and $2000)
    for (let i = 0; i < jobsResult.records.length; i++) {
      const record = jobsResult.records[i]
      const jobId = record.get('id')
      const jobDate = record.get('jobDate')
      
      // Generate a random amount between 200 and 2000
      const sampleAmount = Math.floor(Math.random() * 1800) + 200
      
      await session.run(`
        MATCH (j:Job {id: $jobId})
        SET j.amount = $amount
        RETURN j.id as id, j.amount as amount
      `, { jobId, amount: sampleAmount })
      
      console.log(`✅ Job ${jobId} (${jobDate}): Set amount to $${sampleAmount}`)
    }
    
    console.log('\n📊 Verifying changes...')
    
    // Verify the changes
    const verifyResult = await session.run(`
      MATCH (j:Job)
      WHERE j.amount IS NOT NULL
      RETURN count(j) as jobsWithAmount
    `)
    
    const jobsWithAmount = verifyResult.records[0].get('jobsWithAmount')
    console.log(`✅ Now ${jobsWithAmount} jobs have amount values`)
    
  } catch (error) {
    console.error('❌ Error adding sample amounts:', error)
  } finally {
    await session.close()
  }
}

addSampleAmounts()
  .then(() => {
    console.log('\n✅ Sample amounts added successfully')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
