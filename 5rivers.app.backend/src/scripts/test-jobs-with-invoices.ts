import { neo4jService } from '../database/neo4j'

async function testJobsWithInvoices() {
  const session = neo4jService.getSession()
  
  try {
    console.log('🔍 Testing jobs with invoice relationships...')
    
    // Test the exact query that the GraphQL API would run
    const result = await session.run(`
      MATCH (j:Job) 
      WHERE j.id IN ['4f46d3c1-c0e4-4d64-b907-58cebf8e602e', 'ca27312a-ec24-4589-a2a5-cb79239f7ffe', '231a37e1-680a-4e4d-a392-5f67f54a10b4']
      OPTIONAL MATCH (j)-[:HAS_INVOICE]->(i:Invoice)
      RETURN j.id as jobId, j.invoiceStatus, i.id as invoiceId, i.invoiceNumber
    `)
    
    console.log(`Found ${result.records.length} jobs:`)
    result.records.forEach((record: any, index: number) => {
      const jobId = record.get('jobId')
      const invoiceStatus = record.get('j.invoiceStatus')
      const invoiceId = record.get('invoiceId')
      const invoiceNumber = record.get('i.invoiceNumber')
      
      console.log(`${index + 1}. Job ${jobId}:`)
      console.log(`   Invoice Status: ${invoiceStatus || 'None'}`)
      console.log(`   Invoice ID: ${invoiceId || 'None'}`)
      console.log(`   Invoice Number: ${invoiceNumber || 'None'}`)
      console.log('')
    })
    
    // Count total relationships
    const countResult = await session.run(`
      MATCH (j:Job)-[:HAS_INVOICE]->(i:Invoice)
      RETURN count(*) as total
    `)
    
    console.log(`📊 Total job-invoice relationships: ${countResult.records[0].get('total')}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await session.close()
  }
}

testJobsWithInvoices()
