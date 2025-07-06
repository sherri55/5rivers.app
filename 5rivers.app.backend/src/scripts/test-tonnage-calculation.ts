import { Neo4jService } from '../database/neo4j'
import CalculationService from '../services/calculationService'

async function testTonnageCalculation() {
  const neo4jService = new Neo4jService()
  const session = neo4jService.getSession()
  
  try {
    console.log('🔍 Testing tonnage calculation...\n')
    
    // Find a tonnage job
    const result = await session.run(`
      MATCH (j:Job)-[:OF_TYPE]->(jt:JobType {dispatchType: 'Tonnage'})
      RETURN j.id as jobId, jt.title as title, jt.rateOfJob as rate
      LIMIT 1
    `)
    
    if (result.records.length === 0) {
      console.log('❌ No tonnage jobs found')
      return
    }
    
    const jobId = result.records[0].get('jobId')
    const title = result.records[0].get('title')
    const rate = result.records[0].get('rate')
    
    console.log(`Found tonnage job: ${title}`)
    console.log(`Rate: $${rate} per ton`)
    
    // Add sample weight data (multiple loads)
    await session.run(`
      MATCH (j:Job {id: $jobId})
      SET j.weight = '22.5 18.7 20.3'
    `, { jobId })
    
    console.log('Added sample weights: 22.5 + 18.7 + 20.3 = 61.5 tons')
    
    // Calculate amount
    const calculatedAmount = await CalculationService.calculateJobAmount(jobId)
    const expectedAmount = 61.5 * parseFloat(rate)
    
    console.log(`💰 Calculated amount: $${calculatedAmount.toFixed(2)}`)
    console.log(`📐 Expected: 61.5 × $${rate} = $${expectedAmount.toFixed(2)}`)
    
    if (Math.abs(calculatedAmount - expectedAmount) < 0.01) {
      console.log('✅ Tonnage calculation is correct!')
    } else {
      console.log('❌ Tonnage calculation mismatch')
    }
    
  } catch (error) {
    console.error('❌ Error testing tonnage calculation:', error)
  } finally {
    await session.close()
  }
}

testTonnageCalculation()
  .then(() => {
    console.log('\n✅ Tonnage calculation test completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
