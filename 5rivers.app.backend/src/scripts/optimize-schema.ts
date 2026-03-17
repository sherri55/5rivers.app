import { neo4jService } from '../database/neo4j';

export class SchemaOptimizer {
  
  // 1. Create relationships instead of storing foreign key IDs
  async optimizeCompanyUnitRelationships() {
    console.log('🔗 Creating Company-Unit relationships...');
    
    const query = `
      // Find companies with unitId and matching units
      MATCH (c:Company), (u:Unit)
      WHERE c.unitId IS NOT NULL 
        AND c.unitId = u.id
      
      // Create BELONGS_TO relationship
      CREATE (c)-[:BELONGS_TO]->(u)
      
      // Remove the unitId property from Company
      REMOVE c.unitId
      
      RETURN count(*) as relationshipsCreated
    `;
    
    const result = await neo4jService.runQuery(query);
    console.log(`✅ Created ${result[0]?.relationshipsCreated || 0} Company-Unit relationships`);
  }

  async optimizeUnitDispatcherRelationships() {
    console.log('🔗 Creating Unit-Dispatcher relationships...');
    
    const query = `
      // Find units with dispatcherId and matching dispatchers
      MATCH (u:Unit), (d:Dispatcher)
      WHERE u.dispatcherId IS NOT NULL 
        AND u.dispatcherId = d.id
      
      // Create MANAGED_BY relationship
      CREATE (u)-[:MANAGED_BY]->(d)
      
      // Remove the dispatcherId property from Unit
      REMOVE u.dispatcherId
      
      RETURN count(*) as relationshipsCreated
    `;
    
    const result = await neo4jService.runQuery(query);
    console.log(`✅ Created ${result[0]?.relationshipsCreated || 0} Unit-Dispatcher relationships`);
  }

  // 2. Create indexes on key properties for performance
  async createOptimizedIndexes() {
    console.log('📊 Creating optimized indexes...');
    
    const indexes = [
      // Node property indexes
      'CREATE INDEX company_name_text IF NOT EXISTS FOR (c:Company) ON (c.name)',
      'CREATE INDEX unit_name_text IF NOT EXISTS FOR (u:Unit) ON (u.name)',
      'CREATE INDEX dispatcher_name_text IF NOT EXISTS FOR (d:Dispatcher) ON (d.name)',
      
      // Full-text search indexes
      'CREATE FULLTEXT INDEX company_search IF NOT EXISTS FOR (c:Company) ON EACH [c.name, c.description, c.industry]',
      'CREATE FULLTEXT INDEX unit_search IF NOT EXISTS FOR (u:Unit) ON EACH [u.name, u.description, u.location]',
      
      // Composite indexes for common queries
      'CREATE INDEX company_industry_location IF NOT EXISTS FOR (c:Company) ON (c.industry, c.location)',
    ];

    for (const indexQuery of indexes) {
      try {
        await neo4jService.runQuery(indexQuery);
        console.log(`✅ Created: ${indexQuery.split('INDEX')[1].split('IF')[0].trim()}`);
      } catch (error: any) {
        if (!error.message.includes('already exists')) {
          console.warn(`⚠️ Index creation warning: ${error.message}`);
        }
      }
    }
  }

  // 3. Add useful computed relationships
  async createDerivedRelationships() {
    console.log('🔄 Creating derived relationships...');
    
    // Companies in the same industry
    const industryQuery = `
      MATCH (c1:Company)-[:BELONGS_TO]->(u1:Unit)
      MATCH (c2:Company)-[:BELONGS_TO]->(u2:Unit)
      WHERE c1.industry = c2.industry 
        AND c1 <> c2
        AND NOT EXISTS((c1)-[:SAME_INDUSTRY]-(c2))
      CREATE (c1)-[:SAME_INDUSTRY]->(c2)
      RETURN count(*) as relationshipsCreated
    `;
    
    const industryResult = await neo4jService.runQuery(industryQuery);
    console.log(`✅ Created ${industryResult[0]?.relationshipsCreated || 0} industry relationships`);

    // Units in the same location
    const locationQuery = `
      MATCH (u1:Unit), (u2:Unit)
      WHERE u1.location = u2.location 
        AND u1 <> u2
        AND NOT EXISTS((u1)-[:SAME_LOCATION]-(u2))
      CREATE (u1)-[:SAME_LOCATION]->(u2)
      RETURN count(*) as relationshipsCreated
    `;
    
    const locationResult = await neo4jService.runQuery(locationQuery);
    console.log(`✅ Created ${locationResult[0]?.relationshipsCreated || 0} location relationships`);
  }

  // 4. Clean up redundant data
  async cleanupRedundantData() {
    console.log('🧹 Cleaning up redundant ID properties...');
    
    // Remove any remaining foreign key ID properties
    const cleanupQueries = [
      'MATCH (c:Company) WHERE c.unitId IS NOT NULL REMOVE c.unitId',
      'MATCH (u:Unit) WHERE u.dispatcherId IS NOT NULL REMOVE u.dispatcherId',
      // Add more cleanup as needed based on your schema
    ];

    for (const query of cleanupQueries) {
      try {
        await neo4jService.runQuery(query);
      } catch (error) {
        console.warn(`⚠️ Cleanup warning: ${error}`);
      }
    }
  }

  // 5. Run all optimizations
  async optimizeSchema() {
    console.log('🚀 Starting Neo4j schema optimization...');
    
    try {
      await this.optimizeCompanyUnitRelationships();
      await this.optimizeUnitDispatcherRelationships();
      await this.createOptimizedIndexes();
      await this.createDerivedRelationships();
      await this.cleanupRedundantData();
      
      console.log('🎉 Schema optimization completed!');
      
      // Show final statistics
      await this.showOptimizationStats();
      
    } catch (error) {
      console.error('❌ Schema optimization failed:', error);
      throw error;
    }
  }

  async showOptimizationStats() {
    console.log('\n📊 Optimization Statistics:');
    
    const stats = [
      'MATCH (c:Company) RETURN count(c) as companies',
      'MATCH (u:Unit) RETURN count(u) as units', 
      'MATCH (d:Dispatcher) RETURN count(d) as dispatchers',
      'MATCH ()-[r:BELONGS_TO]->() RETURN count(r) as belongsToRelationships',
      'MATCH ()-[r:MANAGED_BY]->() RETURN count(r) as managedByRelationships',
      'MATCH ()-[r:SAME_INDUSTRY]->() RETURN count(r) as industryRelationships',
      'MATCH ()-[r:SAME_LOCATION]->() RETURN count(r) as locationRelationships',
    ];

    for (const statQuery of stats) {
      try {
        const result = await neo4jService.runQuery(statQuery);
        const key = Object.keys(result[0])[0];
        console.log(`  ${key}: ${result[0][key]}`);
      } catch (error) {
        console.warn(`⚠️ Stats query failed: ${statQuery}`);
      }
    }
  }
}

export const schemaOptimizer = new SchemaOptimizer();

// Run optimization if called directly
if (require.main === module) {
  schemaOptimizer.optimizeSchema()
    .then(() => {
      console.log('✅ Schema optimization completed successfully');
      process.exit(0);
    })
    .catch((error: any) => {
      console.error('❌ Schema optimization failed:', error);
      process.exit(1);
    });
}
