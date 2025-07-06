import axios from 'axios'

async function testSpecificJobWithInvoice() {
  console.log('🔍 Testing specific job with known invoice relationship...')
  
  // Use a job ID that we know has an invoice from the migration
  const jobId = '4f46d3c1-c0e4-4d64-b907-58cebf8e602e'
  
  const query = `
    query {
      job(id: "${jobId}") {
        id
        invoiceStatus
        invoice {
          id
          invoiceNumber
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
    
    const job = response.data.data.job
    if (job) {
      console.log(`✅ Retrieved job ${job.id}:`)
      console.log(`   Invoice Status: ${job.invoiceStatus || 'None'}`)
      console.log(`   Invoice ID: ${job.invoice?.id || 'None'}`)
      console.log(`   Invoice Number: ${job.invoice?.invoiceNumber || 'None'}`)
      
      if (job.invoice?.id) {
        console.log('🎉 SUCCESS: Job has invoice relationship!')
      } else {
        console.log('❌ PROBLEM: Job has invoice status but no invoice relationship')
      }
    } else {
      console.log('❌ Job not found')
    }
    
  } catch (error: any) {
    console.error('❌ Error testing GraphQL API:', error.message)
  }
}

testSpecificJobWithInvoice()
