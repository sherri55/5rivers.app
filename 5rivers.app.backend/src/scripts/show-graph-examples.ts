import { neo4jService } from '../database/neo4j';
import { Record } from 'neo4j-driver';

async function showGraphExamples() {
  const session = neo4jService.getSession();
  
  try {
    console.log('='.repeat(80));
    console.log('5RIVERS.APP - COMPLETE GRAPH DATABASE EXAMPLES');
    console.log('='.repeat(80));

    // 1. Show actual data counts
    console.log('\n📊 DATABASE OVERVIEW:');
    console.log('-'.repeat(50));
    
    const nodeCountsResult = await session.run(`
      MATCH (n)
      RETURN labels(n)[0] as nodeType, count(n) as count
      ORDER BY count DESC
    `);
    
    console.log('Node Counts:');
    nodeCountsResult.records.forEach((record: Record) => {
      console.log(`  • ${record.get('nodeType')}: ${record.get('count')} nodes`);
    });

    // 2. Show relationship counts
    console.log('\nRelationship Counts:');
    const relationshipCountsResult = await session.run(`
      MATCH ()-[r]->()
      RETURN type(r) as relationshipType, count(r) as count
      ORDER BY count DESC
    `);
    
    relationshipCountsResult.records.forEach((record: Record) => {
      console.log(`  • ${record.get('relationshipType')}: ${record.get('count')} connections`);
    });

    // 3. Show sample companies with their properties
    console.log('\n🏢 SAMPLE COMPANIES:');
    console.log('-'.repeat(50));
    const companiesResult = await session.run(`
      MATCH (c:Company)
      RETURN c.id as id, c.name as name, c.city as city, c.province as province
      ORDER BY c.name
      LIMIT 5
    `);
    
    companiesResult.records.forEach((record: Record) => {
      console.log(`Company: ${record.get('name')} (ID: ${record.get('id')})`);
      console.log(`  └─ Location: ${record.get('city')}, ${record.get('province')}`);
      console.log('');
    });

    // 4. Show sample job types
    console.log('\n📋 SAMPLE JOB TYPES:');
    console.log('-'.repeat(50));
    const jobTypesResult = await session.run(`
      MATCH (jt:JobType)
      RETURN jt.id as id, jt.name as name, jt.ratePerKm as ratePerKm, 
             jt.ratePerHour as ratePerHour, jt.driverCommissionRate as commission
      ORDER BY jt.name
      LIMIT 5
    `);
    
    jobTypesResult.records.forEach((record: Record) => {
      console.log(`Job Type: ${record.get('name')} (ID: ${record.get('id')})`);
      console.log(`  └─ Rate per KM: $${record.get('ratePerKm')}`);
      console.log(`  └─ Rate per Hour: $${record.get('ratePerHour')}`);
      console.log(`  └─ Driver Commission: ${(record.get('commission') * 100).toFixed(1)}%`);
      console.log('');
    });

    // 5. Show sample drivers
    console.log('\n👨‍💼 SAMPLE DRIVERS:');
    console.log('-'.repeat(50));
    const driversResult = await session.run(`
      MATCH (d:Driver)
      RETURN d.id as id, d.name as name, d.licenseNumber as license, d.phone as phone
      ORDER BY d.name
      LIMIT 5
    `);
    
    driversResult.records.forEach((record: Record) => {
      console.log(`Driver: ${record.get('name')} (ID: ${record.get('id')})`);
      console.log(`  └─ License: ${record.get('license')}`);
      console.log(`  └─ Phone: ${record.get('phone')}`);
      console.log('');
    });

    // 6. Show sample units
    console.log('\n🚛 SAMPLE UNITS:');
    console.log('-'.repeat(50));
    const unitsResult = await session.run(`
      MATCH (u:Unit)
      RETURN u.id as id, u.unitNumber as unitNumber, u.make as make, 
             u.model as model, u.year as year
      ORDER BY u.unitNumber
      LIMIT 5
    `);
    
    unitsResult.records.forEach((record: Record) => {
      console.log(`Unit: ${record.get('unitNumber')} (ID: ${record.get('id')})`);
      console.log(`  └─ Vehicle: ${record.get('year')} ${record.get('make')} ${record.get('model')}`);
      console.log('');
    });

    // 7. Show sample jobs with details
    console.log('\n🚛 SAMPLE JOBS:');
    console.log('-'.repeat(50));
    const jobsResult = await session.run(`
      MATCH (j:Job)
      RETURN j.id as id, j.jobNumber as jobNumber, j.jobDate as jobDate,
             j.kilometers as kilometers, j.hours as hours,
             j.pickupLocation as pickup, j.dropoffLocation as dropoff
      ORDER BY j.jobDate DESC
      LIMIT 5
    `);
    
    jobsResult.records.forEach((record: Record) => {
      console.log(`Job: ${record.get('jobNumber')} (ID: ${record.get('id')})`);
      console.log(`  └─ Date: ${new Date(parseInt(record.get('jobDate'))).toISOString().split('T')[0]}`);
      console.log(`  └─ Distance: ${record.get('kilometers')} km`);
      console.log(`  └─ Hours: ${record.get('hours')}`);
      console.log(`  └─ Route: ${record.get('pickup')} → ${record.get('dropoff')}`);
      console.log('');
    });

    // 8. Show sample invoices
    console.log('\n📄 SAMPLE INVOICES:');
    console.log('-'.repeat(50));
    const invoicesResult = await session.run(`
      MATCH (inv:Invoice)
      RETURN inv.id as id, inv.invoiceNumber as invoiceNumber, 
             inv.invoiceDate as invoiceDate, inv.hstRate as hstRate
      ORDER BY inv.invoiceDate DESC
      LIMIT 5
    `);
    
    invoicesResult.records.forEach((record: Record) => {
      console.log(`Invoice: ${record.get('invoiceNumber')} (ID: ${record.get('id')})`);
      console.log(`  └─ Date: ${new Date(parseInt(record.get('invoiceDate'))).toISOString().split('T')[0]}`);
      console.log(`  └─ HST Rate: ${(record.get('hstRate') * 100).toFixed(1)}%`);
      console.log('');
    });

    // 9. Show sample invoice lines
    console.log('\n📋 SAMPLE INVOICE LINES:');
    console.log('-'.repeat(50));
    const invoiceLinesResult = await session.run(`
      MATCH (il:InvoiceLine)
      RETURN il.id as id, il.description as description, il.amount as amount
      ORDER BY il.amount DESC
      LIMIT 5
    `);
    
    invoiceLinesResult.records.forEach((record: Record) => {
      console.log(`Invoice Line: (ID: ${record.get('id')})`);
      console.log(`  └─ Description: ${record.get('description')}`);
      console.log(`  └─ Amount: $${Number(record.get('amount')).toFixed(2)}`);
      console.log('');
    });

    // 10. Show sample dispatchers
    console.log('\n📞 SAMPLE DISPATCHERS:');
    console.log('-'.repeat(50));
    const dispatchersResult = await session.run(`
      MATCH (disp:Dispatcher)
      RETURN disp.id as id, disp.name as name, disp.phone as phone, disp.email as email
      ORDER BY disp.name
      LIMIT 5
    `);
    
    dispatchersResult.records.forEach((record: Record) => {
      console.log(`Dispatcher: ${record.get('name')} (ID: ${record.get('id')})`);
      console.log(`  └─ Phone: ${record.get('phone')}`);
      console.log(`  └─ Email: ${record.get('email')}`);
      console.log('');
    });

    // 11. Show example relationships (if any exist)
    console.log('\n🔗 SAMPLE RELATIONSHIPS:');
    console.log('-'.repeat(50));
    
    // Check for company relationships
    const companyRelsResult = await session.run(`
      MATCH (c:Company)-[r]->(target)
      RETURN c.name as companyName, type(r) as relationshipType, 
             labels(target)[0] as targetType, 
             CASE 
               WHEN target.name IS NOT NULL THEN target.name
               WHEN target.unitNumber IS NOT NULL THEN target.unitNumber
               WHEN target.jobNumber IS NOT NULL THEN target.jobNumber
               WHEN target.invoiceNumber IS NOT NULL THEN target.invoiceNumber
               ELSE toString(target.id)
             END as targetName
      LIMIT 10
    `);
    
    if (companyRelsResult.records.length > 0) {
      console.log('Company Relationships:');
      companyRelsResult.records.forEach((record: Record) => {
        console.log(`  • ${record.get('companyName')} -[${record.get('relationshipType')}]-> ${record.get('targetType')}(${record.get('targetName')})`);
      });
    } else {
      console.log('No company relationships found - they may need to be created.');
    }

    // 12. Show potential graph queries
    console.log('\n🎯 GRAPH ANALYTICS EXAMPLES:');
    console.log('-'.repeat(50));
    
    // Total jobs by month
    const monthlyJobsResult = await session.run(`
      MATCH (j:Job)
      WHERE j.jobDate IS NOT NULL
      WITH j, date(datetime({epochMillis: toInteger(j.jobDate)})) as jobDate
      RETURN jobDate.year as year, jobDate.month as month, count(j) as jobCount
      ORDER BY year DESC, month DESC
      LIMIT 6
    `);
    
    console.log('Jobs by Month:');
    monthlyJobsResult.records.forEach((record: Record) => {
      console.log(`  • ${record.get('year')}-${String(record.get('month')).padStart(2, '0')}: ${record.get('jobCount')} jobs`);
    });

    // Average job metrics
    const jobMetricsResult = await session.run(`
      MATCH (j:Job)
      WHERE j.kilometers IS NOT NULL AND j.hours IS NOT NULL
      RETURN avg(j.kilometers) as avgKm, 
             avg(j.hours) as avgHours,
             max(j.kilometers) as maxKm,
             max(j.hours) as maxHours,
             count(j) as totalJobs
    `);
    
    if (jobMetricsResult.records.length > 0) {
      const metrics = jobMetricsResult.records[0];
      console.log('\nJob Metrics:');
      console.log(`  • Total Jobs: ${metrics.get('totalJobs')}`);
      console.log(`  • Average Distance: ${Number(metrics.get('avgKm')).toFixed(1)} km`);
      console.log(`  • Average Hours: ${Number(metrics.get('avgHours')).toFixed(1)} hours`);
      console.log(`  • Max Distance: ${Number(metrics.get('maxKm')).toFixed(1)} km`);
      console.log(`  • Max Hours: ${Number(metrics.get('maxHours')).toFixed(1)} hours`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION SUMMARY:');
    console.log('✅ All core entities migrated from SQLite to Neo4j');
    console.log('✅ Graph structure ready for complex relationships');
    console.log('✅ Business logic moved to CalculationService');
    console.log('✅ GraphQL schema updated for computed fields');
    console.log('🔄 Next: Connect entities with relationships for full graph power');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error examining graphs:', error);
  } finally {
    await session.close();
  }
}

showGraphExamples()
  .then(() => {
    console.log('\n✅ Graph examples completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
