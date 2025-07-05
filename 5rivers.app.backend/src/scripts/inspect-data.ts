import { neo4jService } from '../database/neo4j';

async function inspectData() {
  console.log('🔍 Inspecting current data structure...\n');

  // Check Company properties
  console.log('📊 Company sample data:');
  const companies = await neo4jService.runQuery(`
    MATCH (c:Company) 
    RETURN c 
    LIMIT 3
  `);
  companies.forEach((record, i) => {
    console.log(`Company ${i + 1}:`, JSON.stringify(record.c.properties, null, 2));
  });

  // Check Unit properties  
  console.log('\n🏢 Unit sample data:');
  const units = await neo4jService.runQuery(`
    MATCH (u:Unit) 
    RETURN u 
    LIMIT 3
  `);
  units.forEach((record, i) => {
    console.log(`Unit ${i + 1}:`, JSON.stringify(record.u.properties, null, 2));
  });

  // Check Dispatcher properties
  console.log('\n👤 Dispatcher sample data:');
  const dispatchers = await neo4jService.runQuery(`
    MATCH (d:Dispatcher) 
    RETURN d 
    LIMIT 3
  `);
  dispatchers.forEach((record, i) => {
    console.log(`Dispatcher ${i + 1}:`, JSON.stringify(record.d.properties, null, 2));
  });

  // Check if there are any existing relationships
  console.log('\n🔗 Existing relationships:');
  const relationships = await neo4jService.runQuery(`
    MATCH ()-[r]->() 
    RETURN type(r), count(r) as count
  `);
  relationships.forEach(record => {
    console.log(`${record['type(r)']}: ${record.count}`);
  });

  await neo4jService.close();
}

if (require.main === module) {
  inspectData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Inspection failed:', error);
      process.exit(1);
    });
}
