import { Neo4jService } from '../database/neo4j';

async function testJobsResolver() {
  const neo4jService = new Neo4jService();
  
  console.log('🧪 Testing Jobs Resolver Query...\n');
  
  try {
    // Test the exact same query structure used by the resolver
    const page = 1;
    const limit = 1000;
    const offset = (page - 1) * limit;
    
    const params = { 
      offset: require('neo4j-driver').int(offset), 
      limit: require('neo4j-driver').int(limit) 
    };
    
    const query = `
      MATCH (j:Job)
      RETURN j
      ORDER BY j.jobDate DESC
      SKIP $offset LIMIT $limit
    `;
    
    console.log('Query:', query);
    console.log('Params:', params);
    
    const jobsResult = await neo4jService.runQuery(query, params);
    console.log(`\nFound ${jobsResult.length} jobs`);
    
    // Show first 5 jobs with full details
    jobsResult.slice(0, 5).forEach((record: any, index: number) => {
      const job = record.j.properties;
      console.log(`\n${index + 1}. Job Details:`);
      console.log(`   ID: ${job.id}`);
      console.log(`   Date: ${job.jobDate}`);
      console.log(`   Status: ${job.invoiceStatus}`);
      console.log(`   Created: ${job.createdAt}`);
      console.log(`   Updated: ${job.updatedAt}`);
      console.log(`   Weight: ${JSON.stringify(job.weight)}`);
      console.log(`   Loads: ${job.loads}`);
      console.log(`   Start Time: ${job.startTime}`);
      console.log(`   End Time: ${job.endTime}`);
      console.log(`   Ticket IDs: ${JSON.stringify(job.ticketIds)}`);
      console.log(`   Image URLs: ${job.imageUrls}`);
      console.log(`   Payment Received: ${job.paymentReceived}`);
      console.log(`   Driver Paid: ${job.driverPaid}`);
      console.log(`   Calculated Amount: ${job.calculatedAmount}`);
    });
    
    // Check specifically for the July job
    const julyJob = jobsResult.find((record: any) => record.j.properties.id === 'job_1752122481443_18xfv0333');
    if (julyJob) {
      console.log('\n✅ Found July job in results!');
      console.log('Position in results:', jobsResult.findIndex((record: any) => record.j.properties.id === 'job_1752122481443_18xfv0333') + 1);
    } else {
      console.log('\n❌ July job NOT found in results!');
    }
    
  } catch (error) {
    console.error('Error testing resolver:', error);
  } finally {
    await neo4jService.close();
  }
}

testJobsResolver().catch(console.error);
