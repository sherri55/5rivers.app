import fetch from 'node-fetch'

async function testJobAmountAPI() {
  try {
    console.log('🔍 Testing GraphQL API for job amounts...\n')
    
    const query = `
      query GetJobs {
        jobs(pagination: { limit: 5 }) {
          nodes {
            id
            jobDate
            amount
            calculatedAmount
            jobType {
              title
            }
          }
        }
      }
    `
    
    const response = await fetch('http://localhost:4001/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    })
    
    const result: any = await response.json()
    
    if (result.errors) {
      console.error('❌ GraphQL errors:', result.errors)
      return
    }
    
    const jobs = result.data.jobs.nodes
    console.log(`📊 Retrieved ${jobs.length} jobs from API:\n`)
    
    jobs.forEach((job: any) => {
      console.log(`Job ${job.id}:`)
      console.log(`  Date: ${job.jobDate}`)
      console.log(`  Amount: $${job.amount}`)
      console.log(`  Calculated Amount: ${job.calculatedAmount || 'null'}`)
      console.log(`  Job Type: ${job.jobType?.title || 'None'}`)
      console.log('')
    })
    
    const jobsWithAmount = jobs.filter((job: any) => job.amount !== null).length
    console.log(`✅ ${jobsWithAmount}/${jobs.length} jobs have amount values`)
    
  } catch (error) {
    console.error('❌ Error testing API:', error)
  }
}

testJobAmountAPI()
  .then(() => {
    console.log('\n✅ API test completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
