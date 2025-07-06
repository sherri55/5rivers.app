import fetch from 'node-fetch';

async function testTicketIds() {
  try {
    console.log('🧪 Testing GraphQL API for ticket IDs...\n');
    
    const query = `
      query GetJobs {
        jobs(pagination: { limit: 3 }) {
          nodes {
            id
            jobDate
            ticketIds
          }
        }
      }
    `;
    
    const response = await fetch('http://localhost:4001/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    
    const result: any = await response.json();
    
    if (result.errors) {
      console.error('❌ GraphQL errors:', result.errors);
      return;
    }
    
    const jobs = result.data?.jobs?.nodes || [];
    
    if (jobs.length === 0) {
      console.log('❌ No jobs returned from API');
      return;
    }
    
    console.log(`📊 Testing ${jobs.length} jobs from GraphQL API:\n`);
    
    jobs.forEach((job: any, index: number) => {
      console.log(`${index + 1}. Job ID: ${job.id}`);
      console.log(`   Date: ${job.jobDate}`);
      console.log(`   Ticket IDs: ${JSON.stringify(job.ticketIds)}`);
      console.log(`   Type: ${Array.isArray(job.ticketIds) ? 'Array' : typeof job.ticketIds}`);
      
      if (Array.isArray(job.ticketIds)) {
        console.log(`   ✅ API returns array format with ${job.ticketIds.length} items`);
        if (job.ticketIds.length > 0) {
          console.log(`   Items: ${job.ticketIds.join(', ')}`);
        }
      } else {
        console.log(`   ❌ API returns unexpected format`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testTicketIds();
