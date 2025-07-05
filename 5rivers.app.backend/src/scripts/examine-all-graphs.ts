import { neo4jService } from '../database/neo4j';
import { Record } from 'neo4j-driver';

async function examineAllGraphs() {
  const session = neo4jService.getSession();
  
  try {
    console.log('='.repeat(80));
    console.log('COMPREHENSIVE GRAPH ANALYSIS - ALL ENTITIES AND RELATIONSHIPS');
    console.log('='.repeat(80));

    // 1. COMPANIES WITH ALL RELATIONSHIPS
    console.log('\n🏢 COMPANIES AND THEIR COMPLETE ECOSYSTEM:');
    console.log('-'.repeat(50));
    const companiesResult = await session.run(`
      MATCH (c:Company)
      OPTIONAL MATCH (c)-[:HAS_DRIVER]->(d:Driver)
      OPTIONAL MATCH (c)-[:HAS_DISPATCHER]->(disp:Dispatcher)
      OPTIONAL MATCH (c)-[:HAS_UNIT]->(u:Unit)
      OPTIONAL MATCH (c)-[:HAS_JOB_TYPE]->(jt:JobType)
      OPTIONAL MATCH (c)-[:HAS_JOB]->(j:Job)
      OPTIONAL MATCH (c)-[:HAS_INVOICE]->(inv:Invoice)
      RETURN c.name as companyName,
             count(DISTINCT d) as driverCount,
             count(DISTINCT disp) as dispatcherCount,
             count(DISTINCT u) as unitCount,
             count(DISTINCT jt) as jobTypeCount,
             count(DISTINCT j) as jobCount,
             count(DISTINCT inv) as invoiceCount
      ORDER BY c.name
    `);
    
    companiesResult.records.forEach((record: Record) => {
      console.log(`Company: ${record.get('companyName')}`);
      console.log(`  └─ Drivers: ${record.get('driverCount')}`);
      console.log(`  └─ Dispatchers: ${record.get('dispatcherCount')}`);
      console.log(`  └─ Units: ${record.get('unitCount')}`);
      console.log(`  └─ Job Types: ${record.get('jobTypeCount')}`);
      console.log(`  └─ Jobs: ${record.get('jobCount')}`);
      console.log(`  └─ Invoices: ${record.get('invoiceCount')}`);
      console.log('');
    });

    // 2. JOB TYPES AND THEIR USAGE
    console.log('\n📋 JOB TYPES WITH USAGE ANALYTICS:');
    console.log('-'.repeat(50));
    const jobTypesResult = await session.run(`
      MATCH (jt:JobType)
      OPTIONAL MATCH (jt)<-[:OF_TYPE]-(j:Job)
      OPTIONAL MATCH (jt)<-[:BELONGS_TO]-(c:Company)
      RETURN jt.name as jobTypeName,
             jt.ratePerKm as ratePerKm,
             jt.ratePerHour as ratePerHour,
             jt.driverCommissionRate as commissionRate,
             c.name as companyName,
             count(j) as jobCount
      ORDER BY jobCount DESC, jobTypeName
    `);
    
    jobTypesResult.records.forEach((record: Record) => {
      console.log(`Job Type: ${record.get('jobTypeName')} (Company: ${record.get('companyName')})`);
      console.log(`  └─ Rate per KM: $${record.get('ratePerKm')}`);
      console.log(`  └─ Rate per Hour: $${record.get('ratePerHour')}`);
      console.log(`  └─ Driver Commission: ${(record.get('commissionRate') * 100).toFixed(1)}%`);
      console.log(`  └─ Jobs Count: ${record.get('jobCount')}`);
      console.log('');
    });

    // 3. JOBS WITH COMPLETE DETAILS
    console.log('\n🚛 JOBS WITH COMPLETE RELATIONSHIP DETAILS:');
    console.log('-'.repeat(50));
    const jobsResult = await session.run(`
      MATCH (j:Job)
      OPTIONAL MATCH (j)-[:OF_TYPE]->(jt:JobType)
      OPTIONAL MATCH (j)-[:ASSIGNED_TO]->(d:Driver)
      OPTIONAL MATCH (j)-[:BELONGS_TO]->(c:Company)
      OPTIONAL MATCH (j)-[:USES_UNIT]->(u:Unit)
      OPTIONAL MATCH (j)<-[:HAS_JOB_LINE]-(il:InvoiceLine)
      OPTIONAL MATCH (il)-[:BELONGS_TO]->(inv:Invoice)
      RETURN j.jobNumber as jobNumber,
             j.kilometers as kilometers,
             j.hours as hours,
             j.jobDate as jobDate,
             jt.name as jobTypeName,
             d.name as driverName,
             c.name as companyName,
             u.unitNumber as unitNumber,
             count(DISTINCT il) as invoiceLineCount,
             collect(DISTINCT inv.invoiceNumber) as invoiceNumbers
      ORDER BY j.jobDate DESC
      LIMIT 10
    `);
    
    jobsResult.records.forEach((record: Record) => {
      console.log(`Job #${record.get('jobNumber')} (${record.get('jobDate')})`);
      console.log(`  └─ Company: ${record.get('companyName')}`);
      console.log(`  └─ Job Type: ${record.get('jobTypeName')}`);
      console.log(`  └─ Driver: ${record.get('driverName')}`);
      console.log(`  └─ Unit: ${record.get('unitNumber')}`);
      console.log(`  └─ Distance: ${record.get('kilometers')} km`);
      console.log(`  └─ Hours: ${record.get('hours')}`);
      console.log(`  └─ Invoice Lines: ${record.get('invoiceLineCount')}`);
      console.log(`  └─ Invoices: ${record.get('invoiceNumbers').join(', ')}`);
      console.log('');
    });

    // 4. DRIVERS WITH PERFORMANCE DATA
    console.log('\n👨‍💼 DRIVERS WITH PERFORMANCE ANALYTICS:');
    console.log('-'.repeat(50));
    const driversResult = await session.run(`
      MATCH (d:Driver)
      OPTIONAL MATCH (d)<-[:ASSIGNED_TO]-(j:Job)
      OPTIONAL MATCH (d)-[:BELONGS_TO]->(c:Company)
      OPTIONAL MATCH (j)-[:OF_TYPE]->(jt:JobType)
      RETURN d.name as driverName,
             d.licenseNumber as licenseNumber,
             c.name as companyName,
             count(j) as totalJobs,
             sum(j.kilometers) as totalKilometers,
             sum(j.hours) as totalHours,
             collect(DISTINCT jt.name) as jobTypes
      ORDER BY totalJobs DESC
    `);
    
    driversResult.records.forEach((record: Record) => {
      console.log(`Driver: ${record.get('driverName')} (License: ${record.get('licenseNumber')})`);
      console.log(`  └─ Company: ${record.get('companyName')}`);
      console.log(`  └─ Total Jobs: ${record.get('totalJobs')}`);
      console.log(`  └─ Total KM: ${record.get('totalKilometers')} km`);
      console.log(`  └─ Total Hours: ${record.get('totalHours')}`);
      console.log(`  └─ Job Types: ${record.get('jobTypes').join(', ')}`);
      console.log('');
    });

    // 5. UNITS AND THEIR UTILIZATION
    console.log('\n🚚 UNITS AND THEIR UTILIZATION:');
    console.log('-'.repeat(50));
    const unitsResult = await session.run(`
      MATCH (u:Unit)
      OPTIONAL MATCH (u)<-[:USES_UNIT]-(j:Job)
      OPTIONAL MATCH (u)-[:BELONGS_TO]->(c:Company)
      RETURN u.unitNumber as unitNumber,
             u.make as make,
             u.model as model,
             u.year as year,
             c.name as companyName,
             count(j) as jobCount,
             sum(j.kilometers) as totalKilometers
      ORDER BY jobCount DESC
    `);
    
    unitsResult.records.forEach((record: Record) => {
      console.log(`Unit: ${record.get('unitNumber')} (${record.get('year')} ${record.get('make')} ${record.get('model')})`);
      console.log(`  └─ Company: ${record.get('companyName')}`);
      console.log(`  └─ Jobs: ${record.get('jobCount')}`);
      console.log(`  └─ Total KM: ${record.get('totalKilometers')} km`);
      console.log('');
    });

    // 6. INVOICES WITH COMPLETE BREAKDOWN
    console.log('\n📄 INVOICES WITH COMPLETE BREAKDOWN:');
    console.log('-'.repeat(50));
    const invoicesResult = await session.run(`
      MATCH (inv:Invoice)
      OPTIONAL MATCH (inv)-[:BELONGS_TO]->(c:Company)
      OPTIONAL MATCH (inv)-[:HAS_INVOICE_LINE]->(il:InvoiceLine)
      OPTIONAL MATCH (il)-[:HAS_JOB]->(j:Job)
      OPTIONAL MATCH (j)-[:OF_TYPE]->(jt:JobType)
      RETURN inv.invoiceNumber as invoiceNumber,
             inv.invoiceDate as invoiceDate,
             c.name as companyName,
             count(DISTINCT il) as lineCount,
             count(DISTINCT j) as jobCount,
             collect(DISTINCT jt.name) as jobTypes,
             sum(il.amount) as totalAmount
      ORDER BY inv.invoiceDate DESC
      LIMIT 10
    `);
    
    invoicesResult.records.forEach((record: Record) => {
      console.log(`Invoice: ${record.get('invoiceNumber')} (${record.get('invoiceDate')})`);
      console.log(`  └─ Company: ${record.get('companyName')}`);
      console.log(`  └─ Lines: ${record.get('lineCount')}`);
      console.log(`  └─ Jobs: ${record.get('jobCount')}`);
      console.log(`  └─ Job Types: ${record.get('jobTypes').join(', ')}`);
      console.log(`  └─ Raw Total: $${Number(record.get('totalAmount')).toFixed(2)}`);
      console.log('');
    });

    // 7. DISPATCHERS AND THEIR ACTIVITY
    console.log('\n📞 DISPATCHERS AND THEIR ACTIVITY:');
    console.log('-'.repeat(50));
    const dispatchersResult = await session.run(`
      MATCH (disp:Dispatcher)
      OPTIONAL MATCH (disp)-[:BELONGS_TO]->(c:Company)
      RETURN disp.name as dispatcherName,
             disp.phone as phone,
             disp.email as email,
             c.name as companyName
      ORDER BY dispatcherName
    `);
    
    dispatchersResult.records.forEach((record: Record) => {
      console.log(`Dispatcher: ${record.get('dispatcherName')}`);
      console.log(`  └─ Company: ${record.get('companyName')}`);
      console.log(`  └─ Phone: ${record.get('phone')}`);
      console.log(`  └─ Email: ${record.get('email')}`);
      console.log('');
    });

    // 8. BUSINESS INTELLIGENCE QUERIES
    console.log('\n📊 BUSINESS INTELLIGENCE INSIGHTS:');
    console.log('-'.repeat(50));
    
    // Most profitable job types
    console.log('🎯 Most Profitable Job Types:');
    const profitableJobTypesResult = await session.run(`
      MATCH (jt:JobType)<-[:OF_TYPE]-(j:Job)
      RETURN jt.name as jobTypeName,
             avg(jt.ratePerKm) as avgRatePerKm,
             avg(jt.ratePerHour) as avgRatePerHour,
             avg(jt.driverCommissionRate) as avgCommissionRate,
             count(j) as jobCount,
             avg(j.kilometers) as avgKilometers,
             avg(j.hours) as avgHours
      ORDER BY jobCount DESC
    `);
    
    profitableJobTypesResult.records.forEach((record: Record) => {
      console.log(`  • ${record.get('jobTypeName')}: ${record.get('jobCount')} jobs, Avg: ${Number(record.get('avgKilometers')).toFixed(1)}km, ${Number(record.get('avgHours')).toFixed(1)}h`);
    });

    // Driver performance ranking
    console.log('\n🏆 Top Performing Drivers:');
    const topDriversResult = await session.run(`
      MATCH (d:Driver)<-[:ASSIGNED_TO]-(j:Job)
      RETURN d.name as driverName,
             count(j) as jobCount,
             sum(j.kilometers) as totalKilometers,
             avg(j.kilometers) as avgJobDistance
      ORDER BY jobCount DESC
      LIMIT 5
    `);
    
    topDriversResult.records.forEach((record: Record, index: number) => {
      console.log(`  ${index + 1}. ${record.get('driverName')}: ${record.get('jobCount')} jobs, ${Number(record.get('totalKilometers')).toFixed(0)}km total`);
    });

    // Unit efficiency
    console.log('\n🚛 Most Utilized Units:');
    const topUnitsResult = await session.run(`
      MATCH (u:Unit)<-[:USES_UNIT]-(j:Job)
      RETURN u.unitNumber as unitNumber,
             u.make as make,
             u.model as model,
             count(j) as jobCount,
             sum(j.kilometers) as totalKilometers
      ORDER BY jobCount DESC
      LIMIT 5
    `);
    
    topUnitsResult.records.forEach((record: Record, index: number) => {
      console.log(`  ${index + 1}. Unit ${record.get('unitNumber')} (${record.get('make')} ${record.get('model')}): ${record.get('jobCount')} jobs`);
    });

    // 9. RELATIONSHIP INTEGRITY CHECK
    console.log('\n🔗 RELATIONSHIP INTEGRITY ANALYSIS:');
    console.log('-'.repeat(50));
    const relationshipCheck = await session.run(`
      CALL db.relationshipTypes() YIELD relationshipType
      CALL apoc.meta.stats() YIELD relTypesCount
      RETURN relationshipType, relTypesCount
    `);
    
    // Count all relationship types
    const allRelationships = await session.run(`
      MATCH ()-[r]->()
      RETURN type(r) as relationshipType, count(r) as count
      ORDER BY count DESC
    `);
    
    console.log('Relationship Distribution:');
    allRelationships.records.forEach((record: Record) => {
      console.log(`  • ${record.get('relationshipType')}: ${record.get('count')} connections`);
    });

    // 10. GRAPH SUMMARY STATISTICS
    console.log('\n📈 GRAPH SUMMARY STATISTICS:');
    console.log('-'.repeat(50));
    const summaryResult = await session.run(`
      MATCH (n)
      RETURN labels(n)[0] as nodeType, count(n) as count
      ORDER BY count DESC
    `);
    
    console.log('Node Distribution:');
    summaryResult.records.forEach((record: Record) => {
      console.log(`  • ${record.get('nodeType')}: ${record.get('count')} nodes`);
    });

  } catch (error) {
    console.error('Error examining graphs:', error);
  } finally {
    await session.close();
  }
}

examineAllGraphs()
  .then(() => {
    console.log('\n✅ Graph examination completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
