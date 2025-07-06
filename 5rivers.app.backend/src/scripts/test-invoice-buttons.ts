import { neo4jService } from '../database/neo4j'
import { Record } from 'neo4j-driver'

async function testInvoiceButtons() {
  const session = neo4jService.getSession()
  
  try {
    console.log('🔍 Checking current job invoice statuses...')
    
    // Get some jobs and their current invoice status
    const result = await session.run(`
      MATCH (j:Job) 
      RETURN j.id, j.invoiceStatus, j.jobDate 
      ORDER BY j.jobDate DESC
      LIMIT 10
    `)
    
    console.log('Current jobs:')
    result.records.forEach((record: Record) => {
      console.log(`Job ${record.get('j.id')}: ${record.get('j.invoiceStatus') || 'No status'} (${record.get('j.jobDate')})`)
    })
    
    // Update a few jobs to have invoice statuses for testing
    console.log('\n📝 Updating some jobs with invoice statuses for testing...')
    
    const updateResult = await session.run(`
      MATCH (j:Job) 
      WHERE j.invoiceStatus IS NULL OR j.invoiceStatus = "Not Invoiced"
      WITH j LIMIT 3
      SET j.invoiceStatus = CASE 
        WHEN rand() < 0.33 THEN "Pending"
        WHEN rand() < 0.66 THEN "Invoiced" 
        ELSE "Paid"
      END
      RETURN j.id, j.invoiceStatus
    `)
    
    console.log('Updated jobs:')
    updateResult.records.forEach((record: Record) => {
      console.log(`Job ${record.get('j.id')}: ${record.get('j.invoiceStatus')}`)
    })
    
    console.log('\n✅ Test data updated! You can now test the invoice buttons in the frontend.')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await session.close()
  }
}

testInvoiceButtons()
