import { Neo4jService } from '../database/neo4j'

async function checkJobAmounts() {
  const neo4jService = new Neo4jService()
  const session = neo4jService.getSession()
  
  try {
    console.log('🔍 Checking job amounts in database...\n')
    
    // Get first 10 jobs with their amount values
    const result = await session.run(`
      MATCH (j:Job)
      RETURN j.id as id, 
             j.jobDate as jobDate, 
             j.amount as amount, 
             j.calculatedAmount as calculatedAmount,
             j.weight as weight,
             j.loads as loads,
             j.startTime as startTime,
             j.endTime as endTime
      ORDER BY j.jobDate DESC
      LIMIT 10
    `)
    
    if (result.records.length === 0) {
      console.log('❌ No jobs found in database')
      return
    }
    
    console.log(`📊 Found ${result.records.length} jobs:\n`)
    
    for (const record of result.records) {
      const id = record.get('id')
      const jobDate = record.get('jobDate')
      const amount = record.get('amount')
      const calculatedAmount = record.get('calculatedAmount')
      const weight = record.get('weight')
      const loads = record.get('loads')
      const startTime = record.get('startTime')
      const endTime = record.get('endTime')
      
      console.log(`Job ${id}:`)
      console.log(`  Date: ${jobDate}`)
      console.log(`  Amount: ${amount} (type: ${typeof amount})`)
      console.log(`  Calculated Amount: ${calculatedAmount} (type: ${typeof calculatedAmount})`)
      console.log(`  Weight: ${weight}`)
      console.log(`  Loads: ${loads}`)
      console.log(`  Start Time: ${startTime}`)
      console.log(`  End Time: ${endTime}`)
      console.log('')
    }
    
    // Check summary
    const summaryResult = await session.run(`
      MATCH (j:Job)
      RETURN 
        count(j) as totalJobs,
        count(j.amount) as jobsWithAmount,
        count(j.calculatedAmount) as jobsWithCalculatedAmount
    `)
    
    const summaryRecord = summaryResult.records[0]
    const totalJobs = summaryRecord.get('totalJobs').toNumber ? summaryRecord.get('totalJobs').toNumber() : summaryRecord.get('totalJobs')
    const jobsWithAmount = summaryRecord.get('jobsWithAmount').toNumber ? summaryRecord.get('jobsWithAmount').toNumber() : summaryRecord.get('jobsWithAmount')
    const jobsWithCalculatedAmount = summaryRecord.get('jobsWithCalculatedAmount').toNumber ? summaryRecord.get('jobsWithCalculatedAmount').toNumber() : summaryRecord.get('jobsWithCalculatedAmount')
    
    console.log('📈 Summary:')
    console.log(`  Total jobs: ${totalJobs}`)
    console.log(`  Jobs with amount: ${jobsWithAmount}`)
    console.log(`  Jobs with calculated amount: ${jobsWithCalculatedAmount}`)
    
    if (jobsWithAmount === 0) {
      console.log('\n⚠️  No jobs have amount values in the database!')
      console.log('   This might explain why amounts are not showing up in the frontend.')
    }
    
  } catch (error) {
    console.error('❌ Error checking job amounts:', error)
  } finally {
    await session.close()
  }
}

checkJobAmounts()
  .then(() => {
    console.log('\n✅ Job amount check completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
