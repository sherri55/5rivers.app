import { Neo4jService } from '../database/neo4j'

async function examineJobDispatcherRelationships() {
  const neo4j = new Neo4jService()
  
  try {
    console.log('🔍 Examining job-dispatcher relationships...')
    
    // First, let's see what relationships exist for jobs
    const relationshipsQuery = `
      MATCH (j:Job)-[r]->(node)
      RETURN type(r) as relationshipType, labels(node) as nodeLabels, count(*) as count
      ORDER BY count DESC
    `
    
    const relationships = await neo4j.runQuery(relationshipsQuery)
    
    console.log('📊 Job outgoing relationships:')
    relationships.forEach((rel: any) => {
      console.log(`  - ${rel.relationshipType} -> ${rel.nodeLabels.join(', ')}: ${rel.count}`)
    })
    
    // Check incoming relationships too
    const incomingRelationshipsQuery = `
      MATCH (node)-[r]->(j:Job)
      RETURN type(r) as relationshipType, labels(node) as nodeLabels, count(*) as count
      ORDER BY count DESC
    `
    
    const incomingRelationships = await neo4j.runQuery(incomingRelationshipsQuery)
    
    console.log('\n📊 Job incoming relationships:')
    incomingRelationships.forEach((rel: any) => {
      console.log(`  - ${rel.nodeLabels.join(', ')} -${rel.relationshipType}-> Job: ${rel.count}`)
    })
    
    // Let's see how invoices connect to dispatchers and jobs
    const invoiceConnectionsQuery = `
      MATCH (d:Dispatcher)<-[:BILLED_BY]-(i:Invoice)-[rel:HAS_INVOICE]-(j:Job)
      RETURN d.name as dispatcherName, i.id as invoiceId, j.id as jobId, rel.amount as amount
      LIMIT 10
    `
    
    const invoiceConnections = await neo4j.runQuery(invoiceConnectionsQuery)
    
    console.log('\n📊 Sample invoice-dispatcher-job connections:')
    invoiceConnections.forEach((conn: any) => {
      console.log(`  Dispatcher: ${conn.dispatcherName}, Invoice: ${conn.invoiceId.slice(-6)}, Job: ${conn.jobId.slice(-6)}, Amount: $${conn.amount}`)
    })
    
    // Let's check if jobs have any direct connection to dispatchers through a different path
    const jobDispatcherPathQuery = `
      MATCH (j:Job)
      OPTIONAL MATCH path = (j)-[*1..3]-(d:Dispatcher)
      WHERE d.id IS NOT NULL
      RETURN j.id as jobId, d.id as dispatcherId, d.name as dispatcherName, 
             [rel in relationships(path) | type(rel)] as relationshipPath
      LIMIT 10
    `
    
    const jobDispatcherPaths = await neo4j.runQuery(jobDispatcherPathQuery)
    
    console.log('\n📊 Job-dispatcher connection paths:')
    jobDispatcherPaths.forEach((path: any) => {
      if (path.dispatcherId) {
        console.log(`  Job ${path.jobId.slice(-6)} -> ${path.dispatcherName} via: ${path.relationshipPath.join(' -> ')}`)
      }
    })
    
    console.log('\n✅ Job-dispatcher relationship examination completed')
    
  } catch (error) {
    console.error('❌ Error examining relationships:', error)
  } finally {
    await neo4j.close()
  }
}

examineJobDispatcherRelationships()
