import { neo4jService } from '../database/neo4j'

async function checkInvoiceData() {
  const session = neo4jService.getSession()
  
  try {
    console.log('🔍 Checking invoice data in database...')
    
    // Check if there are any invoices
    const invoiceResult = await session.run('MATCH (i:Invoice) RETURN count(i) as invoiceCount')
    const invoiceCount = invoiceResult.records[0].get('invoiceCount')
    console.log(`Total invoices in database: ${invoiceCount}`)
    
    if (invoiceCount > 0) {
      const sampleInvoices = await session.run('MATCH (i:Invoice) RETURN i.id, i.invoiceNumber, i.status LIMIT 5')
      console.log('Sample invoices:')
      sampleInvoices.records.forEach((record: any) => {
        console.log(`Invoice ${record.get('i.id')}: #${record.get('i.invoiceNumber')} (${record.get('i.status')})`)
      })
    }
    
    // Check job-invoice relationships
    const relationResult = await session.run('MATCH (j:Job)-[:HAS_INVOICE]->(i:Invoice) RETURN count(*) as relationCount')
    const relationCount = relationResult.records[0].get('relationCount')
    console.log(`Jobs with invoice relationships: ${relationCount}`)
    
    // Check jobs with invoice status but no invoice relationship
    const jobsWithStatusResult = await session.run(`
      MATCH (j:Job) 
      WHERE j.invoiceStatus IS NOT NULL AND j.invoiceStatus <> "Not Invoiced"
      OPTIONAL MATCH (j)-[:HAS_INVOICE]->(i:Invoice)
      RETURN j.id, j.invoiceStatus, i.id as invoiceId
      LIMIT 10
    `)
    
    console.log('\nJobs with invoice status:')
    jobsWithStatusResult.records.forEach((record: any) => {
      const jobId = record.get('j.id')
      const invoiceStatus = record.get('j.invoiceStatus')
      const invoiceId = record.get('invoiceId')
      console.log(`Job ${jobId}: ${invoiceStatus} - Invoice: ${invoiceId || 'NONE'}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await session.close()
  }
}

checkInvoiceData()
