import { Neo4jService } from '../database/neo4j'
import CalculationService from '../services/calculationService'

async function debugTonnageCalculation() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔍 Debugging tonnage calculation issues...')
    
    // Get the problematic tonnage jobs
    const problematicJobs = ['c6b1de', '1cd725', '8f0b32', '0878e4']
    
    for (const partialId of problematicJobs) {
      console.log(`\n📋 Debugging job ending with ${partialId}:`)
      
      // Find full job ID
      const findQuery = `
        MATCH (j:Job)
        WHERE j.id ENDS WITH $partialId
        RETURN j.id as fullId
      `
      const findResult = await neo4j.runQuery(findQuery, { partialId })
      
      if (findResult.length === 0) {
        console.log('  Job not found')
        continue
      }
      
      const fullJobId = findResult[0].fullId
      console.log(`  Full Job ID: ${fullJobId}`)
      
      // Get all job data
      const jobQuery = `
        MATCH (j:Job {id: $jobId})-[:OF_TYPE]->(jt:JobType)
        RETURN j.startTime as startTime, 
               j.endTime as endTime,
               j.loads as loads,
               j.weight as weight,
               j.amount as fixedAmount,
               jt.id as jobTypeId,
               jt.rateOfJob as rate,
               jt.dispatchType as type
      `
      
      const jobResult = await neo4j.runQuery(jobQuery, { jobId: fullJobId })
      
      if (jobResult.length === 0) {
        console.log('  Job data not found')
        continue
      }
      
      const job = jobResult[0]
      console.log(`  Dispatch Type: ${job.type}`)
      console.log(`  Rate: $${job.rate}`)
      console.log(`  Weight (raw): ${job.weight}`)
      console.log(`  Weight type: ${typeof job.weight}`)
      console.log(`  Loads: ${job.loads}`)
      console.log(`  Fixed Amount: ${job.fixedAmount}`)
      
      // Manual calculation
      if (job.type?.toLowerCase() === 'tonnage') {
        let totalWeight = 0;
        if (job.weight) {
          if (typeof job.weight === 'string') {
            console.log(`  Processing weight as string: "${job.weight}"`)
            const weights = job.weight.split(' ').map((w: string) => parseFloat(w.trim())).filter((w: number) => !isNaN(w));
            console.log(`  Split weights: [${weights.join(', ')}]`)
            totalWeight = weights.reduce((sum: number, w: number) => sum + w, 0);
          } else {
            console.log(`  Processing weight as number: ${job.weight}`)
            totalWeight = parseFloat(job.weight) || 0;
          }
        }
        console.log(`  Total Weight: ${totalWeight}`)
        const manualCalculation = totalWeight * (parseFloat(job.rate) || 0)
        console.log(`  Manual Calculation: ${totalWeight} × $${job.rate} = $${manualCalculation}`)
      }
      
      // Use CalculationService
      try {
        const calculatedAmount = await CalculationService.calculateJobAmount(fullJobId)
        console.log(`  CalculationService Result: $${calculatedAmount}`)
      } catch (error) {
        console.log(`  CalculationService Error: ${error}`)
      }
      
      // Get relationship amount
      const relQuery = `
        MATCH (j:Job {id: $jobId})-[r:INVOICED_IN]->(i:Invoice)
        RETURN r.amount as relAmount
      `
      const relResult = await neo4j.runQuery(relQuery, { jobId: fullJobId })
      if (relResult.length > 0) {
        console.log(`  Relationship Amount: $${relResult[0].relAmount}`)
      }
    }
    
    await neo4j.close()
  } catch (error) {
    console.error('❌ Error debugging:', error)
    await neo4j.close()
  }
}

debugTonnageCalculation()
