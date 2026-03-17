import { Neo4jService } from '../database/neo4j'

async function checkJobTypeRates() {
  const neo4jService = new Neo4jService()
  const session = neo4jService.getSession()
  
  try {
    console.log('🔍 Checking job type rates and dispatch types...\n')
    
    // Get job types with their rates and dispatch types
    const result = await session.run(`
      MATCH (jt:JobType)
      RETURN jt.id as id, 
             jt.title as title, 
             jt.rateOfJob as rate,
             jt.dispatchType as dispatchType
      ORDER BY jt.title
    `)
    
    if (result.records.length === 0) {
      console.log('❌ No job types found in database')
      return
    }
    
    console.log(`📊 Found ${result.records.length} job types:\n`)
    
    for (const record of result.records) {
      const id = record.get('id')
      const title = record.get('title')
      const rate = record.get('rate')
      const dispatchType = record.get('dispatchType')
      
      console.log(`Job Type: ${title}`)
      console.log(`  ID: ${id}`)
      console.log(`  Dispatch Type: ${dispatchType || 'Not set'}`)
      console.log(`  Rate: $${rate || 'Not set'}`)
      console.log('')
    }
    
    // Check which dispatch types we have
    const dispatchTypesResult = await session.run(`
      MATCH (jt:JobType)
      WHERE jt.dispatchType IS NOT NULL
      RETURN DISTINCT jt.dispatchType as dispatchType, count(jt) as count
      ORDER BY dispatchType
    `)
    
    console.log('📈 Dispatch Type Summary:')
    for (const record of dispatchTypesResult.records) {
      const dispatchType = record.get('dispatchType')
      const count = record.get('count').toNumber ? record.get('count').toNumber() : record.get('count')
      console.log(`  ${dispatchType}: ${count} job types`)
    }
    
  } catch (error) {
    console.error('❌ Error checking job type rates:', error)
  } finally {
    await session.close()
  }
}

checkJobTypeRates()
  .then(() => {
    console.log('\n✅ Job type rates check completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
