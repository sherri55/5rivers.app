import { neo4jService } from '../database/neo4j';

async function inspectJobTicketIds() {
  console.log('🔍 Inspecting Job ticket IDs data structure...\n');

  try {
    // Check Job properties, specifically ticket IDs
    console.log('📋 Job sample data with ticket IDs:');
    const jobs = await neo4jService.runQuery(`
      MATCH (j:Job) 
      WHERE j.ticketIds IS NOT NULL
      RETURN j 
      LIMIT 5
    `);
    
    if (jobs.length === 0) {
      console.log('No jobs with ticket IDs found.');
      
      // Check all jobs to see the structure
      console.log('\n📋 All Job sample data:');
      const allJobs = await neo4jService.runQuery(`
        MATCH (j:Job) 
        RETURN j 
        LIMIT 3
      `);
      
      allJobs.forEach((record, i) => {
        console.log(`Job ${i + 1}:`, JSON.stringify(record.j.properties, null, 2));
        console.log(`ticketIds type:`, typeof record.j.properties.ticketIds);
        console.log(`ticketIds value:`, record.j.properties.ticketIds);
        console.log(`ticketIds isArray:`, Array.isArray(record.j.properties.ticketIds));
        console.log('---');
      });
    } else {
      jobs.forEach((record, i) => {
        console.log(`Job ${i + 1} with ticket IDs:`, JSON.stringify(record.j.properties, null, 2));
        console.log(`ticketIds type:`, typeof record.j.properties.ticketIds);
        console.log(`ticketIds value:`, record.j.properties.ticketIds);
        console.log(`ticketIds isArray:`, Array.isArray(record.j.properties.ticketIds));
        console.log('---');
      });
    }

    // Check total job count
    const countResult = await neo4jService.runQuery(`
      MATCH (j:Job) 
      RETURN count(j) as totalJobs
    `);
    console.log(`\nTotal jobs in database: ${countResult[0]?.totalJobs || 0}`);

  } catch (error) {
    console.error('Error inspecting job data:', error);
  } finally {
    await neo4jService.close();
  }
}

if (require.main === module) {
  inspectJobTicketIds()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Inspection failed:', error);
      process.exit(1);
    });
}
