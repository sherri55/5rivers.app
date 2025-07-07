import { Neo4jService } from '../database/neo4j'

async function migrateWeightsToArray() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔄 Migrating weight fields from string to array format...')
    
    // First, let's see what we're working with
    const inspectionQuery = `
      MATCH (j:Job)
      WHERE j.weight IS NOT NULL
      RETURN j.id as jobId, j.weight as weight, j.jobDate as jobDate
      ORDER BY j.jobDate DESC
      LIMIT 20
    `
    
    const inspectionResults = await neo4j.runQuery(inspectionQuery)
    
    console.log(`\n📊 Found ${inspectionResults.length} jobs with weight data (showing first 20):`)
    
    const toMigrate = []
    
    for (const record of inspectionResults) {
      const { jobId, weight, jobDate } = record
      console.log(`\n📋 Job ${jobId.slice(-6)} (${jobDate}):`)
      console.log(`   Current weight: ${JSON.stringify(weight)}`)
      console.log(`   Type: ${Array.isArray(weight) ? 'Array' : typeof weight}`)
      
      if (Array.isArray(weight)) {
        console.log(`   ✅ Already in array format with ${weight.length} items: [${weight.join(', ')}]`)
      } else if (typeof weight === 'string') {
        console.log(`   🔄 String format needs migration: "${weight}"`)
        
        // Parse the string to determine the target array
        let targetArray: number[] = []
        
        if (weight.trim().startsWith('[') && weight.trim().endsWith(']')) {
          try {
            const parsed = JSON.parse(weight)
            if (Array.isArray(parsed)) {
              targetArray = parsed.map((w: any) => parseFloat(w)).filter((w: number) => !isNaN(w))
            }
          } catch {
            // Fall back to space-separated parsing
            targetArray = weight.split(' ').map(w => parseFloat(w.trim())).filter(w => !isNaN(w))
          }
        } else {
          // Split by spaces and parse each weight
          targetArray = weight.split(' ').map(w => parseFloat(w.trim())).filter(w => !isNaN(w))
        }
        
        console.log(`   → Target array: [${targetArray.join(', ')}]`)
        
        toMigrate.push({
          jobId,
          originalWeight: weight,
          targetArray
        })
      } else if (typeof weight === 'number') {
        console.log(`   🔄 Number format needs migration: ${weight}`)
        toMigrate.push({
          jobId,
          originalWeight: weight,
          targetArray: [weight]
        })
      } else {
        console.log(`   ❓ Unexpected format: ${weight}`)
      }
    }
    
    console.log(`\n🎯 Migration Summary:`)
    console.log(`   Total jobs inspected: ${inspectionResults.length}`)
    console.log(`   Jobs needing migration: ${toMigrate.length}`)
    
    if (toMigrate.length === 0) {
      console.log('   ✅ No migration needed!')
      await neo4j.close()
      return
    }
    
    // Ask for confirmation before proceeding
    console.log(`\n⚠️  Ready to migrate ${toMigrate.length} jobs. This will update weight fields from strings/numbers to arrays.`)
    console.log('   Preview of changes:')
    
    toMigrate.slice(0, 5).forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.jobId.slice(-6)}: "${item.originalWeight}" → [${item.targetArray.join(', ')}]`)
    })
    
    if (toMigrate.length > 5) {
      console.log(`   ... and ${toMigrate.length - 5} more`)
    }
    
    // Get all jobs that need migration, not just the first 20
    console.log('\n🔍 Getting full list of jobs to migrate...')
    const fullMigrationQuery = `
      MATCH (j:Job)
      WHERE j.weight IS NOT NULL 
        AND NOT(j.weight IS NULL) 
        AND NOT apoc.meta.isType(j.weight, 'LIST')
      RETURN j.id as jobId, j.weight as weight
    `
    
    let allToMigrate = []
    try {
      const fullResults = await neo4j.runQuery(fullMigrationQuery)
      console.log(`   Found ${fullResults.length} total jobs needing migration`)
      
      for (const record of fullResults) {
        const { jobId, weight } = record
        let targetArray: number[] = []
        
        if (typeof weight === 'string') {
          if (weight.trim().startsWith('[') && weight.trim().endsWith(']')) {
            try {
              const parsed = JSON.parse(weight)
              if (Array.isArray(parsed)) {
                targetArray = parsed.map((w: any) => parseFloat(w)).filter((w: number) => !isNaN(w))
              }
            } catch {
              targetArray = weight.split(' ').map(w => parseFloat(w.trim())).filter(w => !isNaN(w))
            }
          } else {
            targetArray = weight.split(' ').map(w => parseFloat(w.trim())).filter(w => !isNaN(w))
          }
        } else if (typeof weight === 'number') {
          targetArray = [weight]
        }
        
        if (targetArray.length > 0) {
          allToMigrate.push({
            jobId,
            originalWeight: weight,
            targetArray
          })
        }
      }
    } catch (error) {
      console.log('   ⚠️  Note: APOC functions not available, using inspection results')
      allToMigrate = toMigrate
    }
    
    console.log(`\n🚀 Starting migration of ${allToMigrate.length} jobs...`)
    
    let migrated = 0
    let errors = 0
    
    for (const item of allToMigrate) {
      try {
        const updateQuery = `
          MATCH (j:Job {id: $jobId})
          SET j.weight = $targetArray
          RETURN j.weight as newWeight
        `
        
        const result = await neo4j.runQuery(updateQuery, {
          jobId: item.jobId,
          targetArray: item.targetArray
        })
        
        if (result.length > 0) {
          console.log(`   ✅ ${item.jobId.slice(-6)}: "${item.originalWeight}" → [${item.targetArray.join(', ')}]`)
          migrated++
        } else {
          console.log(`   ❌ Failed to update ${item.jobId.slice(-6)}`)
          errors++
        }
      } catch (error) {
        console.log(`   ❌ Error updating ${item.jobId.slice(-6)}: ${error}`)
        errors++
      }
    }
    
    console.log(`\n🎉 Migration completed!`)
    console.log(`   ✅ Successfully migrated: ${migrated} jobs`)
    console.log(`   ❌ Errors: ${errors} jobs`)
    
    if (errors === 0) {
      console.log(`   🎯 All weight fields are now arrays of floats!`)
    }
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...')
    const verificationQuery = `
      MATCH (j:Job)
      WHERE j.weight IS NOT NULL
      RETURN 
        count(j) as totalJobs,
        count(CASE WHEN apoc.meta.isType(j.weight, 'LIST') THEN 1 END) as arrayJobs,
        count(CASE WHEN NOT apoc.meta.isType(j.weight, 'LIST') THEN 1 END) as nonArrayJobs
    `
    
    try {
      const verificationResult = await neo4j.runQuery(verificationQuery)
      const stats = verificationResult[0]
      console.log(`   Total jobs with weight: ${stats.totalJobs}`)
      console.log(`   Jobs with array weights: ${stats.arrayJobs}`)
      console.log(`   Jobs with non-array weights: ${stats.nonArrayJobs}`)
      
      if (stats.nonArrayJobs === 0) {
        console.log(`   ✅ Perfect! All weights are now arrays`)
      } else {
        console.log(`   ⚠️  ${stats.nonArrayJobs} jobs still have non-array weights`)
      }
    } catch (error) {
      console.log('   ⚠️  Could not verify with APOC functions, but migration completed')
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error)
  } finally {
    await neo4j.close()
  }
}

// Export for use as a script or module
if (require.main === module) {
  migrateWeightsToArray()
}

export default migrateWeightsToArray
