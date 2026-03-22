import { Neo4jService } from '../database/neo4j'
import CalculationService from '../services/calculationService'

async function testJobCalculations() {
  const neo4jService = new Neo4jService()
  const session = neo4jService.getSession()
  
  try {
    console.log('🧮 Testing job amount calculations...\n')
    
    // Get jobs with different dispatch types for testing
    const result = await session.run(`
      MATCH (j:Job)-[:OF_TYPE]->(jt:JobType)
      RETURN j.id as jobId, 
             j.jobDate as jobDate,
             j.startTime as startTime, 
             j.endTime as endTime,
             j.loads as loads,
             j.weight as weight,
             j.amount as storedAmount,
             jt.title as jobTypeTitle,
             jt.dispatchType as dispatchType,
             jt.rateOfJob as rate
      ORDER BY j.jobDate DESC
      LIMIT 10
    `)
    
    if (result.records.length === 0) {
      console.log('❌ No jobs found')
      return
    }
    
    console.log(`📊 Testing ${result.records.length} jobs:\n`)
    
    for (const record of result.records) {
      const jobId = record.get('jobId')
      const jobDate = record.get('jobDate')
      const startTime = record.get('startTime')
      const endTime = record.get('endTime')
      const loads = record.get('loads')
      const weight = record.get('weight')
      const storedAmount = record.get('storedAmount')
      const jobTypeTitle = record.get('jobTypeTitle')
      const dispatchType = record.get('dispatchType')
      const rate = record.get('rate')
      
      console.log(`Job ${jobId} (${jobDate}):`)
      console.log(`  Job Type: ${jobTypeTitle}`)
      console.log(`  Dispatch Type: ${dispatchType}`)
      console.log(`  Rate: $${rate}`)
      
      // Show the relevant data for calculation
      switch (dispatchType?.toLowerCase()) {
        case 'hourly':
          console.log(`  Start Time: ${startTime || 'Not set'}`)
          console.log(`  End Time: ${endTime || 'Not set'}`)
          break
        case 'load':
          console.log(`  Loads: ${loads || 'Not set'}`)
          break
        case 'tonnage':
          console.log(`  Weight: ${weight || 'Not set'}`)
          break
        case 'fixed':
          console.log(`  Fixed amount from job: $${storedAmount || 'Not set'}`)
          break
      }
      
      // Calculate the amount using our new logic
      try {
        const calculatedAmount = await CalculationService.calculateJobAmount(jobId)
        console.log(`  💰 Calculated Amount: $${calculatedAmount.toFixed(2)}`)
        
        if (storedAmount) {
          console.log(`  📦 Stored Amount: $${storedAmount}`)
          const diff = calculatedAmount - parseFloat(storedAmount)
          if (Math.abs(diff) > 0.01) {
            console.log(`  ⚠️  Difference: $${diff.toFixed(2)}`)
          } else {
            console.log(`  ✅ Matches stored amount`)
          }
        }
      } catch (error) {
        console.log(`  ❌ Calculation error: ${error}`)
      }
      
      console.log('')
    }
    
  } catch (error) {
    console.error('❌ Error testing calculations:', error)
  } finally {
    await session.close()
  }
}

testJobCalculations()
  .then(() => {
    console.log('✅ Job calculation test completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
