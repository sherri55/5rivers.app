import { neo4jService } from '../database/neo4j'
const sqlite3 = require('sqlite3').verbose()

async function migrateJobInvoiceRelationships() {
  const sqliteDbPath = 'D:\\Dump\\5rivers.db'
  
  console.log('🔍 Starting job-invoice relationship migration...')
  
  // Connect to SQLite
  const sqliteDb = new sqlite3.Database(sqliteDbPath, sqlite3.OPEN_READONLY, (err: any) => {
    if (err) {
      console.error('❌ Error opening SQLite database:', err.message)
      return
    }
    console.log('✅ Connected to SQLite database')
  })

  const neo4jSession = neo4jService.getSession()

  try {
    // Get all invoice lines from SQLite
    const invoiceLines = await new Promise<any[]>((resolve, reject) => {
      sqliteDb.all("SELECT * FROM InvoiceLine", (err: any, rows: any[]) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })

    console.log(`📊 Found ${invoiceLines.length} invoice lines to migrate`)

    // Process each invoice line
    let successCount = 0
    let errorCount = 0

    for (const line of invoiceLines) {
      try {
        // Create the relationship in Neo4j
        // We'll create a JobInvoiceRelation as specified in the schema
        const result = await neo4jSession.run(`
          MATCH (j:Job {id: $jobId})
          MATCH (i:Invoice {id: $invoiceId})
          MERGE (j)-[r:HAS_INVOICE]->(i)
          SET r.amount = $lineAmount,
              r.invoicedAt = datetime($invoicedAt)
          RETURN j.id as jobId, i.id as invoiceId
        `, {
          jobId: line.jobId,
          invoiceId: line.invoiceId,
          lineAmount: line.lineAmount,
          invoicedAt: new Date(line.createdAt).toISOString()
        })

        if (result.records.length > 0) {
          successCount++
          console.log(`✅ Created relationship: Job ${line.jobId} → Invoice ${line.invoiceId} ($${line.lineAmount})`)
        } else {
          console.log(`⚠️  Could not find Job ${line.jobId} or Invoice ${line.invoiceId} in Neo4j`)
          errorCount++
        }
      } catch (error) {
        console.error(`❌ Error creating relationship for Job ${line.jobId} → Invoice ${line.invoiceId}:`, error)
        errorCount++
      }
    }

    console.log(`\n📈 Migration Summary:`)
    console.log(`  ✅ Successful relationships: ${successCount}`)
    console.log(`  ❌ Failed relationships: ${errorCount}`)

    // Verify the relationships were created
    const verifyResult = await neo4jSession.run(`
      MATCH (j:Job)-[r:HAS_INVOICE]->(i:Invoice)
      RETURN count(r) as relationshipCount
    `)

    const relationshipCount = verifyResult.records[0].get('relationshipCount')
    console.log(`\n🔍 Verification: ${relationshipCount} job-invoice relationships now exist in Neo4j`)

    // Show some sample relationships
    const sampleResult = await neo4jSession.run(`
      MATCH (j:Job)-[r:HAS_INVOICE]->(i:Invoice)
      RETURN j.id as jobId, i.invoiceNumber as invoiceNumber, r.amount as amount
      LIMIT 5
    `)

    console.log('\n📋 Sample relationships created:')
    sampleResult.records.forEach((record: any) => {
      console.log(`  Job ${record.get('jobId')} → Invoice ${record.get('invoiceNumber')} ($${record.get('amount')})`)
    })

  } catch (error) {
    console.error('❌ Migration error:', error)
  } finally {
    await neo4jSession.close()
    sqliteDb.close()
    console.log('\n✅ Migration completed')
  }
}

migrateJobInvoiceRelationships()
