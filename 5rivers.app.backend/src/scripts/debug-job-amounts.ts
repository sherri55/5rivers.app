import { neo4jService } from '../database/neo4j';

async function debugJobAmounts() {
  console.log('=== Debugging Job Amounts ===\n');

  // Check if jobs exist
  const jobsResult = await neo4jService.runQuery(`
    MATCH (j:Job)
    RETURN count(j) as totalJobs
  `);
  console.log(`Total jobs in database: ${jobsResult[0]?.totalJobs || 0}`);

  // Check jobs with job types
  const jobsWithTypeResult = await neo4jService.runQuery(`
    MATCH (j:Job)-[:OF_TYPE]->(jt:JobType)
    RETURN count(j) as jobsWithType
  `);
  console.log(`Jobs with job type: ${jobsWithTypeResult[0]?.jobsWithType || 0}`);

  // Check jobs without job types
  const jobsWithoutTypeResult = await neo4jService.runQuery(`
    MATCH (j:Job)
    WHERE NOT (j)-[:OF_TYPE]->(:JobType)
    RETURN count(j) as jobsWithoutType
  `);
  console.log(`Jobs without job type: ${jobsWithoutTypeResult[0]?.jobsWithoutType || 0}`);

  // Check job types with rates
  const jobTypesWithRatesResult = await neo4jService.runQuery(`
    MATCH (jt:JobType)
    WHERE jt.rateOfJob IS NOT NULL AND jt.rateOfJob > 0
    RETURN count(jt) as jobTypesWithRates
  `);
  console.log(`Job types with rates > 0: ${jobTypesWithRatesResult[0]?.jobTypesWithRates || 0}`);

  // Check specific job details
  const sampleJobsResult = await neo4jService.runQuery(`
    MATCH (j:Job)
    OPTIONAL MATCH (j)-[:OF_TYPE]->(jt:JobType)
    RETURN j.id as jobId, 
           j.startTime as startTime,
           j.endTime as endTime,
           j.loads as loads,
           j.weight as weight,
           j.amount as amount,
           jt.id as jobTypeId,
           jt.rateOfJob as rate,
           jt.dispatchType as type
    LIMIT 5
  `);

  console.log('\n=== Sample Job Details ===');
  sampleJobsResult.forEach((job, index) => {
    console.log(`\nJob ${index + 1}:`);
    console.log(`  ID: ${job.jobId}`);
    console.log(`  Job Type ID: ${job.jobTypeId || 'NOT SET'}`);
    console.log(`  Rate: ${job.rate || 'NOT SET'}`);
    console.log(`  Dispatch Type: ${job.type || 'NOT SET'}`);
    console.log(`  Start Time: ${job.startTime || 'NOT SET'}`);
    console.log(`  End Time: ${job.endTime || 'NOT SET'}`);
    console.log(`  Loads: ${job.loads || 'NOT SET'}`);
    console.log(`  Weight: ${job.weight || 'NOT SET'}`);
    console.log(`  Stored Amount: ${job.amount || 'NOT SET'}`);
  });

  await neo4jService.close();
}

debugJobAmounts().catch(console.error);
