import { neo4jService } from '../database/neo4j';

async function demonstrateGraphPower() {
  console.log('🚀 Demonstrating Neo4j Graph Database Power\n');

  // 1. Show relationship counts
  console.log('📊 Relationship Summary:');
  const relationshipCounts = await neo4jService.runQuery(`
    MATCH ()-[r]->()
    RETURN type(r) as relationship, count(r) as count
    ORDER BY count DESC
  `);
  
  relationshipCounts.forEach(rel => {
    console.log(`  ${rel.relationship}: ${rel.count} connections`);
  });

  // 2. Complex business query - Jobs with all related entities
  console.log('\n💼 Sample Job with All Relationships:');
  const jobWithRelations = await neo4jService.runQuery(`
    MATCH (j:Job)-[:OF_TYPE]->(jt:JobType)-[:BELONGS_TO]->(c:Company)
    MATCH (j)-[:ASSIGNED_TO]->(d:Driver)
    MATCH (j)-[:MANAGED_BY]->(dp:Dispatcher)
    MATCH (j)-[:USES_UNIT]->(u:Unit)
    RETURN j.jobDate as date, 
           j.jobGrossAmount as amount,
           jt.title as jobType,
           c.name as company,
           d.name as driver,
           dp.name as dispatcher,
           u.name as unit
    LIMIT 3
  `);

  jobWithRelations.forEach((job, i) => {
    console.log(`\n  Job ${i + 1}:`);
    console.log(`    Date: ${job.date}`);
    console.log(`    Amount: $${job.amount || 'N/A'}`);
    console.log(`    Type: ${job.jobType}`);
    console.log(`    Company: ${job.company || 'N/A'}`);
    console.log(`    Driver: ${job.driver || 'N/A'}`);
    console.log(`    Dispatcher: ${job.dispatcher || 'N/A'}`);
    console.log(`    Unit: ${job.unit || 'N/A'}`);
  });

  // 3. Business Analytics Query
  console.log('\n📈 Business Analytics (Driver Performance):');
  const driverStats = await neo4jService.runQuery(`
    MATCH (d:Driver)<-[:ASSIGNED_TO]-(j:Job)
    WHERE j.jobGrossAmount IS NOT NULL
    RETURN d.name as driver,
           count(j) as totalJobs,
           sum(j.jobGrossAmount) as totalRevenue,
           avg(j.jobGrossAmount) as avgJobValue
    ORDER BY totalRevenue DESC
    LIMIT 5
  `);

  driverStats.forEach(stat => {
    console.log(`  ${stat.driver}: ${stat.totalJobs} jobs, $${stat.totalRevenue?.toFixed(2) || '0'} total, $${stat.avgJobValue?.toFixed(2) || '0'} avg`);
  });

  // 4. Company Revenue Analysis
  console.log('\n🏢 Company Revenue Analysis:');
  const companyStats = await neo4jService.runQuery(`
    MATCH (c:Company)-[:HAS_JOB_TYPE]->(jt:JobType)<-[:OF_TYPE]-(j:Job)
    WHERE j.jobGrossAmount IS NOT NULL
    RETURN c.name as company,
           count(j) as totalJobs,
           sum(j.jobGrossAmount) as totalRevenue
    ORDER BY totalRevenue DESC
    LIMIT 5
  `);

  companyStats.forEach(stat => {
    console.log(`  ${stat.company}: ${stat.totalJobs} jobs, $${stat.totalRevenue?.toFixed(2) || '0'} revenue`);
  });

  // 5. Monthly Revenue Trend
  console.log('\n📅 Monthly Revenue Trend:');
  const monthlyRevenue = await neo4jService.runQuery(`
    MATCH (j:Job)
    WHERE j.jobGrossAmount IS NOT NULL AND j.jobDate IS NOT NULL
    WITH substring(j.jobDate, 0, 7) as month, sum(j.jobGrossAmount) as revenue
    RETURN month, revenue
    ORDER BY month
  `);

  monthlyRevenue.forEach(month => {
    console.log(`  ${month.month}: $${month.revenue?.toFixed(2) || '0'}`);
  });

  // 6. Show the power of graph traversals
  console.log('\n🔍 Graph Traversal Example (Find all drivers who worked for a specific company):');
  const driversForCompany = await neo4jService.runQuery(`
    MATCH (c:Company {name: "Blythedale"})-[:HAS_JOB_TYPE]->(jt:JobType)<-[:OF_TYPE]-(j:Job)-[:ASSIGNED_TO]->(d:Driver)
    RETURN DISTINCT d.name as driver, count(j) as jobsForThisCompany
    ORDER BY jobsForThisCompany DESC
  `);

  driversForCompany.forEach(driver => {
    console.log(`  ${driver.driver}: ${driver.jobsForThisCompany} jobs for Blythedale`);
  });

  await neo4jService.close();
}

if (require.main === module) {
  demonstrateGraphPower()
    .then(() => {
      console.log('\n✨ Graph demonstration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Demonstration failed:', error);
      process.exit(1);
    });
}

export { demonstrateGraphPower };
