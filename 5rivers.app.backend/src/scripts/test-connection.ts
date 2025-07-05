import neo4j from 'neo4j-driver';
import { config } from '../config';

async function testConnection() {
  console.log('🔍 Testing Neo4j connection...');
  console.log(`URI: ${config.neo4j.uri}`);
  console.log(`Username: ${config.neo4j.username}`);
  console.log(`Database: ${config.neo4j.database}`);
  
  const driver = neo4j.driver(
    config.neo4j.uri,
    neo4j.auth.basic(config.neo4j.username, config.neo4j.password),
    {
      disableLosslessIntegers: true,
    }
  );

  const session = driver.session();

  try {
    console.log('🔌 Attempting to connect...');
    const result = await session.run('RETURN 1 as test');
    console.log('✅ Connection successful!');
    console.log('Test result:', result.records[0].toObject());
    
    // Test basic query
    const versionResult = await session.run('CALL dbms.components() YIELD name, versions, edition');
    if (versionResult.records.length > 0) {
      const record = versionResult.records[0].toObject();
      console.log(`📊 Neo4j ${record.name} ${record.versions[0]} (${record.edition})`);
    }
    
  } catch (error: any) {
    console.error('❌ Connection failed:');
    console.error('Error code:', error.code);
    console.error('Message:', error.message);
    
    if (error.code === 'Neo.ClientError.Security.Unauthorized') {
      console.log('\n🔐 Authentication Issue:');
      console.log('1. Check your Neo4j username and password');
      console.log('2. Try default credentials: neo4j/neo4j');
      console.log('3. Or check Neo4j Browser at http://localhost:7474');
    } else if (error.code === 'ServiceUnavailable') {
      console.log('\n🚫 Connection Issue:');
      console.log('1. Make sure Neo4j is running');
      console.log('2. Check if the URI is correct');
      console.log('3. Verify port 7687 is accessible');
    }
  } finally {
    await session.close();
    await driver.close();
  }
}

// Run if called directly
if (require.main === module) {
  testConnection()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { testConnection };
