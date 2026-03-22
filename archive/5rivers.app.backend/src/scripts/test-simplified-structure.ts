import { neo4jService } from '../database/neo4j';

async function testSimplifiedStructure() {
  try {
    console.log('🧪 Testing simplified Neo4j structure (without InvoiceLines)...\n');

    // Test 1: Get invoice totals using relationship properties
    console.log('📊 Invoice calculations using relationship properties:');
    const invoiceCalculations = await neo4jService.runQuery(`
      MATCH (i:Invoice)<-[r:INVOICED_IN]-(j:Job)
      RETURN 
        i.invoiceNumber as invoiceNumber,
        collect(r.amount) as lineAmounts,
        sum(r.amount) as subtotal,
        sum(r.amount) * 0.13 as hst,
        sum(r.amount) * 1.13 as total
      ORDER BY i.invoiceNumber
      LIMIT 5
    `);
    
    invoiceCalculations.forEach((inv: any) => {
      console.log(`  ${inv.invoiceNumber}:`);
      console.log(`    Line amounts: [${inv.lineAmounts.join(', ')}]`);
      console.log(`    Subtotal: $${inv.subtotal.toFixed(2)}`);
      console.log(`    HST (13%): $${inv.hst.toFixed(2)}`);
      console.log(`    Total: $${inv.total.toFixed(2)}\n`);
    });

    // Test 2: Show simplified relationship structure
    console.log('🔗 Simplified relationship structure:');
    const relationshipCounts = await neo4jService.runQuery(`
      MATCH ()-[r]->()
      RETURN type(r) as relationshipType, count(r) as count
      ORDER BY count DESC
    `);
    
    relationshipCounts.forEach((rel: any) => {
      console.log(`  ${rel.relationshipType}: ${rel.count}`);
    });

    // Test 3: Complex traversal - Find all jobs in an invoice with details
    console.log('\n📋 Sample invoice with all job details:');
    const invoiceDetails = await neo4jService.runQuery(`
      MATCH (i:Invoice {invoiceNumber: 'INV-FPH-52-250201-250228'})<-[r:INVOICED_IN]-(j:Job)
      MATCH (j)-[:OF_TYPE]->(jt:JobType)
      MATCH (j)-[:ASSIGNED_TO]->(d:Driver)
      MATCH (j)-[:USES_UNIT]->(u:Unit)
      RETURN 
        j.jobDate as jobDate,
        jt.title as jobType,
        d.name as driverName,
        u.name as unitName,
        r.amount as lineAmount,
        j.startTime as startTime,
        j.endTime as endTime
      ORDER BY j.jobDate
    `);
    
    if (invoiceDetails.length > 0) {
      console.log('  Invoice: INV-FPH-52-250201-250228');
      invoiceDetails.forEach((job: any) => {
        console.log(`    ${job.jobDate}: ${job.jobType} - ${job.driverName} (${job.unitName}) - $${job.lineAmount} (${job.startTime}-${job.endTime})`);
      });
    }

    // Test 4: Business analytics with simplified structure
    console.log('\n📈 Business analytics with simplified structure:');
    const analytics = await neo4jService.runQuery(`
      MATCH (d:Driver)<-[:ASSIGNED_TO]-(j:Job)-[r:INVOICED_IN]->(i:Invoice)
      RETURN 
        d.name as driverName,
        count(j) as totalJobs,
        sum(r.amount) as totalRevenue,
        avg(r.amount) as avgJobValue
      ORDER BY totalRevenue DESC
      LIMIT 5
    `);
    
    console.log('  Top performing drivers:');
    analytics.forEach((driver: any) => {
      console.log(`    ${driver.driverName}: ${driver.totalJobs} jobs, $${driver.totalRevenue.toFixed(2)} revenue, $${driver.avgJobValue.toFixed(2)} avg/job`);
    });

    // Test 5: Monthly revenue trend
    console.log('\n📅 Monthly revenue using simplified structure:');
    const monthlyRevenue = await neo4jService.runQuery(`
      MATCH (j:Job)-[r:INVOICED_IN]->(i:Invoice)
      WITH 
        substring(j.jobDate, 0, 7) as month,
        sum(r.amount) as revenue
      RETURN month, revenue
      ORDER BY month
    `);
    
    monthlyRevenue.forEach((month: any) => {
      console.log(`    ${month.month}: $${month.revenue.toFixed(2)}`);
    });

    console.log('\n✅ Simplified structure testing completed!');
    console.log('\n🎯 Benefits of eliminating InvoiceLines:');
    console.log('  ✅ Reduced data model complexity');
    console.log('  ✅ Fewer entities to manage');
    console.log('  ✅ Direct relationships with properties');
    console.log('  ✅ Simplified queries and calculations');
    console.log('  ✅ Better performance (fewer JOIN operations)');
    console.log('  ✅ More intuitive graph traversals');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await neo4jService.close();
  }
}

testSimplifiedStructure();
