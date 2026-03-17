import { Neo4jService } from '../database/neo4j'
import CalculationService from '../services/calculationService'

async function setJobCalculatedAmounts() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔍 Setting calculatedAmount on all Job nodes...')
    
    // Get all jobs
    const query = `
      MATCH (j:Job)
      RETURN j.id as jobId
      ORDER BY j.createdAt DESC
    `
    
    const result = await neo4j.runQuery(query)
    console.log(`📋 Found ${result.length} jobs to update`)
    
    let updated = 0
    let errors = 0
    
    for (const record of result) {
      const jobId = record.jobId
      
      try {
        // Calculate the amount
        const calculatedAmount = await CalculationService.calculateJobAmount(jobId)
        
        // Update the job with the calculated amount
        const updateQuery = `
          MATCH (j:Job {id: $jobId})
          SET j.calculatedAmount = $calculatedAmount
          RETURN j.id as id, j.calculatedAmount as amount
        `
        
        await neo4j.runQuery(updateQuery, { 
          jobId, 
          calculatedAmount 
        })
        
        console.log(`✅ Job ${jobId}: $${calculatedAmount.toFixed(2)}`)
        updated++
        
      } catch (error) {
        console.error(`❌ Error updating job ${jobId}:`, error)
        errors++
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`   Updated: ${updated} jobs`)
    console.log(`   Errors: ${errors} jobs`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await neo4j.close()
  }
}

setJobCalculatedAmounts()
  .then(() => {
    console.log('\n✅ Update completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Update failed:', error)
    process.exit(1)
  })
