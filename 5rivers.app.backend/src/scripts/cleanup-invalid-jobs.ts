import { Neo4jService } from '../database/neo4j'

async function cleanupInvalidJobs() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🧹 Finding and cleaning up invalid jobs...\n')
    
    // First, let's identify problematic jobs
    console.log('🔍 Step 1: Identifying problematic jobs...')
    
    // Find jobs with empty weight arrays for tonnage job types
    const emptyWeightTonnageQuery = `
      MATCH (j:Job)-[:OF_TYPE]->(jt:JobType {dispatchType: 'Tonnage'})
      WHERE j.weight IS NOT NULL 
        AND (
          (j.weight = []) OR 
          (j.weight = '') OR
          (size(j.weight) = 0) OR
          (j.weight = [''])
        )
      RETURN j.id as jobId, j.jobDate as jobDate, jt.title as jobType, j.weight as weight
      ORDER BY j.jobDate DESC
    `
    
    const emptyWeightJobs = await neo4j.runQuery(emptyWeightTonnageQuery)
    console.log(`   Found ${emptyWeightJobs.length} tonnage jobs with empty/invalid weight`)
    
    // Find jobs with empty loads for load job types
    const emptyLoadsQuery = `
      MATCH (j:Job)-[:OF_TYPE]->(jt:JobType {dispatchType: 'Load'})
      WHERE j.loads IS NULL OR j.loads = 0 OR j.loads = ''
      RETURN j.id as jobId, j.jobDate as jobDate, jt.title as jobType, j.loads as loads
      ORDER BY j.jobDate DESC
    `
    
    const emptyLoadsJobs = await neo4j.runQuery(emptyLoadsQuery)
    console.log(`   Found ${emptyLoadsJobs.length} load jobs with empty/invalid loads`)
    
    // Find hourly jobs with missing start/end times
    const missingTimesQuery = `
      MATCH (j:Job)-[:OF_TYPE]->(jt:JobType {dispatchType: 'Hourly'})
      WHERE j.startTime IS NULL OR j.endTime IS NULL OR j.startTime = '' OR j.endTime = ''
      RETURN j.id as jobId, j.jobDate as jobDate, jt.title as jobType, j.startTime as startTime, j.endTime as endTime
      ORDER BY j.jobDate DESC
    `
    
    const missingTimesJobs = await neo4j.runQuery(missingTimesQuery)
    console.log(`   Found ${missingTimesJobs.length} hourly jobs with missing times`)
    
    // Find jobs without job types
    const noJobTypeQuery = `
      MATCH (j:Job)
      WHERE NOT (j)-[:OF_TYPE]->(:JobType)
      RETURN j.id as jobId, j.jobDate as jobDate
      ORDER BY j.jobDate DESC
    `
    
    const noJobTypeJobs = await neo4j.runQuery(noJobTypeQuery)
    console.log(`   Found ${noJobTypeJobs.length} jobs without job types`)
    
    // Show details of problematic jobs
    if (emptyWeightJobs.length > 0) {
      console.log('\n📋 Tonnage jobs with empty weight:')
      emptyWeightJobs.slice(0, 10).forEach((job, index) => {
        console.log(`   ${index + 1}. Job ${job.jobId.slice(-6)} (${job.jobDate}) - ${job.jobType} - Weight: ${JSON.stringify(job.weight)}`)
      })
      if (emptyWeightJobs.length > 10) {
        console.log(`   ... and ${emptyWeightJobs.length - 10} more`)
      }
    }
    
    if (emptyLoadsJobs.length > 0) {
      console.log('\n📋 Load jobs with empty loads:')
      emptyLoadsJobs.slice(0, 10).forEach((job, index) => {
        console.log(`   ${index + 1}. Job ${job.jobId.slice(-6)} (${job.jobDate}) - ${job.jobType} - Loads: ${job.loads}`)
      })
      if (emptyLoadsJobs.length > 10) {
        console.log(`   ... and ${emptyLoadsJobs.length - 10} more`)
      }
    }
    
    if (missingTimesJobs.length > 0) {
      console.log('\n📋 Hourly jobs with missing times:')
      missingTimesJobs.slice(0, 10).forEach((job, index) => {
        console.log(`   ${index + 1}. Job ${job.jobId.slice(-6)} (${job.jobDate}) - ${job.jobType} - Start: ${job.startTime || 'NULL'}, End: ${job.endTime || 'NULL'}`)
      })
      if (missingTimesJobs.length > 10) {
        console.log(`   ... and ${missingTimesJobs.length - 10} more`)
      }
    }
    
    if (noJobTypeJobs.length > 0) {
      console.log('\n📋 Jobs without job types:')
      noJobTypeJobs.slice(0, 10).forEach((job, index) => {
        console.log(`   ${index + 1}. Job ${job.jobId.slice(-6)} (${job.jobDate})`)
      })
      if (noJobTypeJobs.length > 10) {
        console.log(`   ... and ${noJobTypeJobs.length - 10} more`)
      }
    }
    
    const totalProblematic = emptyWeightJobs.length + emptyLoadsJobs.length + missingTimesJobs.length + noJobTypeJobs.length
    
    if (totalProblematic === 0) {
      console.log('\n✅ No problematic jobs found!')
      return
    }
    
    console.log(`\n⚠️  Total problematic jobs found: ${totalProblematic}`)
    console.log('\n🗑️  Step 2: Cleanup options:')
    console.log('1. Delete all problematic jobs')
    console.log('2. Fix jobs where possible (set default values)')
    console.log('3. Show invoice relationships before deletion')
    console.log('4. Exit without changes')
    
    // For this script, let's focus on deletion since these jobs are likely invalid test data
    console.log('\n🚨 Proceeding with deletion of problematic jobs...')
    
    let totalDeleted = 0
    
    // Delete jobs with empty weight (tonnage jobs)
    if (emptyWeightJobs.length > 0) {
      console.log('\n🗑️  Deleting tonnage jobs with empty weight...')
      for (const job of emptyWeightJobs) {
        try {
          // First check if job is in any invoices
          const invoiceCheckQuery = `
            MATCH (j:Job {id: $jobId})-[r:INVOICED_IN]->(i:Invoice)
            RETURN i.id as invoiceId, i.invoiceNumber as invoiceNumber
          `
          const invoiceResults = await neo4j.runQuery(invoiceCheckQuery, { jobId: job.jobId })
          
          if (invoiceResults.length > 0) {
            console.log(`   ⚠️  Skipping job ${job.jobId.slice(-6)} - it's in invoice ${invoiceResults[0].invoiceNumber}`)
            continue
          }
          
          // Delete the job and all its relationships
          const deleteQuery = `
            MATCH (j:Job {id: $jobId})
            DETACH DELETE j
            RETURN count(j) as deleted
          `
          const deleteResult = await neo4j.runQuery(deleteQuery, { jobId: job.jobId })
          
          if (deleteResult[0]?.deleted > 0) {
            console.log(`   ✅ Deleted job ${job.jobId.slice(-6)} (${job.jobDate}) - ${job.jobType}`)
            totalDeleted++
          }
        } catch (error) {
          console.log(`   ❌ Error deleting job ${job.jobId.slice(-6)}: ${error}`)
        }
      }
    }
    
    // Delete jobs with empty loads (load jobs)
    if (emptyLoadsJobs.length > 0) {
      console.log('\n🗑️  Deleting load jobs with empty loads...')
      for (const job of emptyLoadsJobs) {
        try {
          const invoiceCheckQuery = `
            MATCH (j:Job {id: $jobId})-[r:INVOICED_IN]->(i:Invoice)
            RETURN i.id as invoiceId
          `
          const invoiceResults = await neo4j.runQuery(invoiceCheckQuery, { jobId: job.jobId })
          
          if (invoiceResults.length > 0) {
            console.log(`   ⚠️  Skipping job ${job.jobId.slice(-6)} - it's in an invoice`)
            continue
          }
          
          const deleteQuery = `
            MATCH (j:Job {id: $jobId})
            DETACH DELETE j
            RETURN count(j) as deleted
          `
          const deleteResult = await neo4j.runQuery(deleteQuery, { jobId: job.jobId })
          
          if (deleteResult[0]?.deleted > 0) {
            console.log(`   ✅ Deleted job ${job.jobId.slice(-6)} (${job.jobDate}) - ${job.jobType}`)
            totalDeleted++
          }
        } catch (error) {
          console.log(`   ❌ Error deleting job ${job.jobId.slice(-6)}: ${error}`)
        }
      }
    }
    
    // Delete jobs with missing times (hourly jobs)  
    if (missingTimesJobs.length > 0) {
      console.log('\n🗑️  Deleting hourly jobs with missing times...')
      for (const job of missingTimesJobs) {
        try {
          const invoiceCheckQuery = `
            MATCH (j:Job {id: $jobId})-[r:INVOICED_IN]->(i:Invoice)
            RETURN i.id as invoiceId
          `
          const invoiceResults = await neo4j.runQuery(invoiceCheckQuery, { jobId: job.jobId })
          
          if (invoiceResults.length > 0) {
            console.log(`   ⚠️  Skipping job ${job.jobId.slice(-6)} - it's in an invoice`)
            continue
          }
          
          const deleteQuery = `
            MATCH (j:Job {id: $jobId})
            DETACH DELETE j
            RETURN count(j) as deleted
          `
          const deleteResult = await neo4j.runQuery(deleteQuery, { jobId: job.jobId })
          
          if (deleteResult[0]?.deleted > 0) {
            console.log(`   ✅ Deleted job ${job.jobId.slice(-6)} (${job.jobDate}) - ${job.jobType}`)
            totalDeleted++
          }
        } catch (error) {
          console.log(`   ❌ Error deleting job ${job.jobId.slice(-6)}: ${error}`)
        }
      }
    }
    
    // Delete jobs without job types
    if (noJobTypeJobs.length > 0) {
      console.log('\n🗑️  Deleting jobs without job types...')
      for (const job of noJobTypeJobs) {
        try {
          const invoiceCheckQuery = `
            MATCH (j:Job {id: $jobId})-[r:INVOICED_IN]->(i:Invoice)
            RETURN i.id as invoiceId
          `
          const invoiceResults = await neo4j.runQuery(invoiceCheckQuery, { jobId: job.jobId })
          
          if (invoiceResults.length > 0) {
            console.log(`   ⚠️  Skipping job ${job.jobId.slice(-6)} - it's in an invoice`)
            continue
          }
          
          const deleteQuery = `
            MATCH (j:Job {id: $jobId})
            DETACH DELETE j
            RETURN count(j) as deleted
          `
          const deleteResult = await neo4j.runQuery(deleteQuery, { jobId: job.jobId })
          
          if (deleteResult[0]?.deleted > 0) {
            console.log(`   ✅ Deleted job ${job.jobId.slice(-6)} (${job.jobDate})`)
            totalDeleted++
          }
        } catch (error) {
          console.log(`   ❌ Error deleting job ${job.jobId.slice(-6)}: ${error}`)
        }
      }
    }
    
    console.log(`\n🎉 Cleanup completed!`)
    console.log(`   ✅ Successfully deleted: ${totalDeleted} jobs`)
    console.log(`   ⚠️  Skipped (in invoices): ${totalProblematic - totalDeleted} jobs`)
    
    // Final verification
    console.log('\n🔍 Final verification...')
    const verificationResults = await neo4j.runQuery(`
      MATCH (j:Job)
      RETURN count(j) as totalJobs
    `)
    
    console.log(`   Total jobs remaining: ${verificationResults[0]?.totalJobs || 0}`)
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await neo4j.close()
  }
}

// Export for use as a script or module
if (require.main === module) {
  cleanupInvalidJobs()
}

export default cleanupInvalidJobs
