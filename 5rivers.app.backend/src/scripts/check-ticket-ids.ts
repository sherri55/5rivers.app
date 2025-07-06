import { neo4jService } from '../database/neo4j';

async function checkTicketIds() {
  try {
    console.log('🔍 Checking Job ticket IDs in Neo4j...\n');
    
    // Query to get all jobs with their ticket IDs
    const query = `
      MATCH (j:Job)
      RETURN j.id as jobId, j.ticketIds as ticketIds, j.jobDate as jobDate
      ORDER BY j.jobDate DESC
      LIMIT 10
    `;
    
    const result = await neo4jService.runQuery(query, {});
    
    if (result.length === 0) {
      console.log('❌ No jobs found in the database');
      return;
    }
    
    console.log(`📊 Found ${result.length} jobs. Checking ticket ID formats:\n`);
    
    result.forEach((record: any, index: number) => {
      const { jobId, ticketIds, jobDate } = record;
      
      console.log(`${index + 1}. Job ID: ${jobId}`);
      console.log(`   Date: ${jobDate}`);
      console.log(`   Ticket IDs: ${JSON.stringify(ticketIds)}`);
      console.log(`   Type: ${Array.isArray(ticketIds) ? 'Array' : typeof ticketIds}`);
      
      if (Array.isArray(ticketIds)) {
        console.log(`   ✅ Already in array format with ${ticketIds.length} items`);
        if (ticketIds.length > 0) {
          console.log(`   Items: ${ticketIds.join(', ')}`);
        }
      } else if (typeof ticketIds === 'string') {
        console.log(`   ⚠️  Still in string format: "${ticketIds}"`);
        if (ticketIds.trim()) {
          const parsed = ticketIds.split(' ').filter(id => id.trim() !== '');
          console.log(`   Would parse to ${parsed.length} items: ${parsed.join(', ')}`);
        }
      } else {
        console.log(`   ❓ Unexpected format: ${ticketIds}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error checking ticket IDs:', error);
  } finally {
    await neo4jService.close();
  }
}

checkTicketIds();
