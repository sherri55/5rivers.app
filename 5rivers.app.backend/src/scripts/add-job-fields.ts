import { neo4jService } from '../database/neo4j';

/**
 * Script to add ticketIds and imageUrls fields to existing Job nodes in Neo4j
 * This ensures backward compatibility when these fields were added to the schema
 */
async function addJobFields() {
  try {
    console.log('🔍 Checking current state of Job nodes...');

    // Check current state
    const checkQuery = `
      MATCH (j:Job)
      RETURN 
        count(j) as totalJobs,
        count(j.ticketIds) as jobsWithTicketIds,
        count(j.imageUrls) as jobsWithImageUrls,
        (count(j) - count(j.ticketIds)) as jobsMissingTicketIds,
        (count(j) - count(j.imageUrls)) as jobsMissingImageUrls
    `;
    
    const currentState = await neo4jService.runQuery(checkQuery);
    const stats = currentState[0];
    
    console.log('📊 Current Job node statistics:');
    console.log(`  Total Jobs: ${stats.totalJobs}`);
    console.log(`  Jobs with ticketIds: ${stats.jobsWithTicketIds}`);
    console.log(`  Jobs with imageUrls: ${stats.jobsWithImageUrls}`);
    console.log(`  Jobs missing ticketIds: ${stats.jobsMissingTicketIds}`);
    console.log(`  Jobs missing imageUrls: ${stats.jobsMissingImageUrls}`);

    // Add ticketIds field to jobs that don't have it
    if (stats.jobsMissingTicketIds > 0) {
      console.log('\n🔧 Adding ticketIds field to jobs that are missing it...');
      const addTicketIdsQuery = `
        MATCH (j:Job)
        WHERE j.ticketIds IS NULL
        SET j.ticketIds = []
        RETURN count(j) as updatedCount
      `;
      
      const ticketIdsResult = await neo4jService.runQuery(addTicketIdsQuery);
      console.log(`✅ Added ticketIds field to ${ticketIdsResult[0].updatedCount} jobs`);
    } else {
      console.log('✅ All jobs already have ticketIds field');
    }

    // Add imageUrls field to jobs that don't have it
    if (stats.jobsMissingImageUrls > 0) {
      console.log('\n🔧 Adding imageUrls field to jobs that are missing it...');
      const addImageUrlsQuery = `
        MATCH (j:Job)
        WHERE j.imageUrls IS NULL
        SET j.imageUrls = null
        RETURN count(j) as updatedCount
      `;
      
      const imageUrlsResult = await neo4jService.runQuery(addImageUrlsQuery);
      console.log(`✅ Added imageUrls field to ${imageUrlsResult[0].updatedCount} jobs`);
    } else {
      console.log('✅ All jobs already have imageUrls field');
    }

    // Verify the final state
    console.log('\n🔍 Verifying final state...');
    const finalState = await neo4jService.runQuery(checkQuery);
    const finalStats = finalState[0];
    
    console.log('📊 Final Job node statistics:');
    console.log(`  Total Jobs: ${finalStats.totalJobs}`);
    console.log(`  Jobs with ticketIds: ${finalStats.jobsWithTicketIds}`);
    console.log(`  Jobs with imageUrls: ${finalStats.jobsWithImageUrls}`);
    console.log(`  Jobs missing ticketIds: ${finalStats.jobsMissingTicketIds}`);
    console.log(`  Jobs missing imageUrls: ${finalStats.jobsMissingImageUrls}`);

    // Show sample of updated jobs
    console.log('\n📋 Sample of job structures:');
    const sampleQuery = `
      MATCH (j:Job)
      RETURN j.id, j.ticketIds, j.imageUrls, j.jobDate
      ORDER BY j.createdAt DESC
      LIMIT 5
    `;
    
    const samples = await neo4jService.runQuery(sampleQuery);
    samples.forEach((job, index) => {
      console.log(`  Job ${index + 1}:`);
      console.log(`    ID: ${job['j.id']}`);
      console.log(`    Date: ${job['j.jobDate']}`);
      console.log(`    TicketIds: ${JSON.stringify(job['j.ticketIds'])}`);
      console.log(`    ImageUrls: ${job['j.imageUrls']}`);
    });

    if (finalStats.jobsMissingTicketIds === 0 && finalStats.jobsMissingImageUrls === 0) {
      console.log('\n🎉 Migration completed successfully! All jobs now have the required fields.');
    } else {
      console.log('\n⚠️  Migration completed with some issues. Please check the logs above.');
    }

  } catch (error) {
    console.error('❌ Error during job fields migration:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  addJobFields()
    .then(() => {
      console.log('\n✅ Job fields migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Job fields migration script failed:', error);
      process.exit(1);
    });
}

export { addJobFields };
