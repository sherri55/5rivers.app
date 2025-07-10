import { Neo4jService } from '../database/neo4j';

async function debugJulyJobs() {
  const neo4jService = new Neo4jService();
  
  console.log('🔍 Debugging July jobs...\n');
  
  try {
    // 1. Check all jobs in the database
    console.log('1. All jobs in database:');
    const allJobsQuery = `
      MATCH (j:Job)
      RETURN j.id, j.jobDate, j.createdAt, j.invoiceStatus
      ORDER BY j.createdAt DESC
      LIMIT 20
    `;
    const allJobs = await neo4jService.runQuery(allJobsQuery);
    console.log(`Found ${allJobs.length} jobs total`);
    allJobs.forEach((job: any) => {
      console.log(`  - ${job['j.id']}: Date=${job['j.jobDate']}, Created=${job['j.createdAt']}, Status=${job['j.invoiceStatus']}`);
    });
    
    // 2. Check specifically for July 2025 jobs
    console.log('\n2. Jobs specifically for July 2025:');
    const julyJobsQuery = `
      MATCH (j:Job)
      WHERE j.jobDate >= '2025-07-01' AND j.jobDate <= '2025-07-31'
      RETURN j.id, j.jobDate, j.createdAt, j.invoiceStatus
      ORDER BY j.jobDate DESC
    `;
    const julyJobs = await neo4jService.runQuery(julyJobsQuery);
    console.log(`Found ${julyJobs.length} jobs for July 2025`);
    julyJobs.forEach((job: any) => {
      console.log(`  - ${job['j.id']}: Date=${job['j.jobDate']}, Created=${job['j.createdAt']}, Status=${job['j.invoiceStatus']}`);
    });
    
    // 3. Check jobs created in the last hour
    console.log('\n3. Jobs created in the last hour:');
    const recentJobsQuery = `
      MATCH (j:Job)
      WHERE j.createdAt >= datetime() - duration('PT1H')
      RETURN j.id, j.jobDate, j.createdAt, j.invoiceStatus
      ORDER BY j.createdAt DESC
    `;
    const recentJobs = await neo4jService.runQuery(recentJobsQuery);
    console.log(`Found ${recentJobs.length} jobs created in the last hour`);
    recentJobs.forEach((job: any) => {
      console.log(`  - ${job['j.id']}: Date=${job['j.jobDate']}, Created=${job['j.createdAt']}, Status=${job['j.invoiceStatus']}`);
    });
    
    // 4. Check the most recent job's full details
    if (allJobs.length > 0) {
      console.log('\n4. Most recent job details:');
      const mostRecentId = allJobs[0]['j.id'];
      const detailQuery = `
        MATCH (j:Job {id: $jobId})
        OPTIONAL MATCH (j)-[:OF_TYPE]->(jt:JobType)
        OPTIONAL MATCH (j)-[:ASSIGNED_TO]->(d:Driver)
        OPTIONAL MATCH (j)-[:MANAGED_BY]->(disp:Dispatcher)
        RETURN j, jt, d, disp
      `;
      const details = await neo4jService.runQuery(detailQuery, { jobId: mostRecentId });
      if (details[0]) {
        const job = details[0].j.properties;
        const jobType = details[0].jt ? details[0].jt.properties : null;
        const driver = details[0].d ? details[0].d.properties : null;
        const dispatcher = details[0].disp ? details[0].disp.properties : null;
        
        console.log(`Job ID: ${job.id}`);
        console.log(`Job Date: ${job.jobDate}`);
        console.log(`Status: ${job.invoiceStatus}`);
        console.log(`Weight: ${JSON.stringify(job.weight)}`);
        console.log(`Loads: ${job.loads}`);
        console.log(`Start Time: ${job.startTime}`);
        console.log(`End Time: ${job.endTime}`);
        console.log(`Ticket IDs: ${JSON.stringify(job.ticketIds)}`);
        console.log(`Image URLs: ${job.imageUrls}`);
        console.log(`Job Type: ${jobType ? jobType.title : 'None'}`);
        console.log(`Driver: ${driver ? driver.name : 'None'}`);
        console.log(`Dispatcher: ${dispatcher ? dispatcher.name : 'None'}`);
      }
    }
    
    // 5. Test the exact query used by the frontend
    console.log('\n5. Testing frontend jobs query (first 10 jobs):');
    const frontendQuery = `
      MATCH (j:Job)
      RETURN j
      ORDER BY j.jobDate DESC
      SKIP 0 LIMIT 10
    `;
    const frontendJobs = await neo4jService.runQuery(frontendQuery);
    console.log(`Frontend query returned ${frontendJobs.length} jobs`);
    frontendJobs.forEach((record: any, index: number) => {
      const job = record.j.properties;
      console.log(`  ${index + 1}. ${job.id}: Date=${job.jobDate}, Status=${job.invoiceStatus}`);
    });
    
  } catch (error) {
    console.error('Error debugging jobs:', error);
  } finally {
    await neo4jService.close();
  }
}

debugJulyJobs().catch(console.error);
