import { Neo4jService } from '../database/neo4j';
import { resolvers } from '../schema/resolvers';

async function testDashboardStats() {
  console.log('🔍 Testing Dashboard Stats Resolver...');

  // Create a Neo4jService instance
  const neo4jService = new Neo4jService();
  
  try {
    // Test context
    const context = { neo4jService };
    
    // Test with current month
    console.log('\n📊 Testing current month stats...');
    const currentStats = await resolvers.Query.dashboardStats(
      null,
      {},
      context
    );
    console.log('Current month results:', JSON.stringify(currentStats, null, 2));
    
    // Test with specific month
    console.log('\n📊 Testing specific month stats (June 2025)...');
    const specificStats = await resolvers.Query.dashboardStats(
      null,
      { year: 2025, month: 6 },
      context
    );
    console.log('June 2025 results:', JSON.stringify(specificStats, null, 2));
    
    console.log('\n✅ Dashboard stats test completed successfully!');
  } catch (error) {
    console.error('❌ Error testing dashboard stats:', error);
  } finally {
    await neo4jService.close();
  }
}

// Run the test
testDashboardStats();
