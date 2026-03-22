import axios from 'axios'

async function testGraphQLJobsWithInvoices() {
  console.log('🔍 Testing GraphQL API for jobs with invoices...')
  
  const query = `
    query {
      jobs(pagination: { limit: 5 }) {
        nodes {
          id
          invoiceStatus
          invoice {
            id
            invoiceNumber
          }
        }
      }
    }
  `
  
  try {
    const response = await axios.post('http://localhost:4001/graphql', {
      query: query
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.data.errors) {
      console.error('❌ GraphQL errors:', response.data.errors)
      return
    }
    
    const jobs = response.data.data.jobs.nodes
    console.log(`✅ Retrieved ${jobs.length} jobs:`)
    
    jobs.forEach((job: any, index: number) => {
      console.log(`${index + 1}. Job ${job.id}:`)
      console.log(`   Invoice Status: ${job.invoiceStatus || 'None'}`)
      console.log(`   Invoice ID: ${job.invoice?.id || 'None'}`)
      console.log(`   Invoice Number: ${job.invoice?.invoiceNumber || 'None'}`)
      console.log('')
    })
    
    // Count how many jobs have invoices
    const jobsWithInvoices = jobs.filter((job: any) => job.invoice?.id)
    console.log(`📊 Jobs with invoices: ${jobsWithInvoices.length}/${jobs.length}`)
    
  } catch (error: any) {
    console.error('❌ Error testing GraphQL API:', error.message)
  }
}

testGraphQLJobsWithInvoices()
