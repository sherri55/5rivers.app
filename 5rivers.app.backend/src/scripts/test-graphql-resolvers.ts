import { neo4jService } from '../database/neo4j';

async function testGraphQLData() {
  try {
    console.log('🧪 Testing Neo4j data quality after migration...\n');

    // Test 1: Check date formats in Neo4j
    console.log('📅 Testing date formats:');
    const dateTest = await neo4jService.runQuery(`
      MATCH (j:Job)
      RETURN j.jobDate, j.startTime, j.endTime, j.createdAt, j.updatedAt
      LIMIT 3
    `);
    
    console.log('Job dates sample:', JSON.stringify(dateTest, null, 2));

    // Test 2: Check if all relationships exist (without APOC)
    console.log('\n🔗 Testing relationships:');
    const relationshipCounts = await neo4jService.runQuery(`
      MATCH ()-[r]->()
      RETURN type(r) as relationshipType, count(r) as count
      ORDER BY count DESC
    `);
    
    console.log('Relationship counts:');
    relationshipCounts.forEach((rel: any) => {
      console.log(`  ${rel.relationshipType}: ${rel.count}`);
    });

    // Test 3: Check for null/invalid dates
    console.log('\n⚠️ Checking for invalid dates:');
    const invalidJobs = await neo4jService.runQuery(`
      MATCH (j:Job)
      WHERE j.createdAt IS NULL OR j.updatedAt IS NULL OR j.jobDate IS NULL
      RETURN count(j) as invalidJobCount
    `);
    
    const invalidInvoices = await neo4jService.runQuery(`
      MATCH (i:Invoice)
      WHERE i.createdAt IS NULL OR i.updatedAt IS NULL OR i.invoiceDate IS NULL
      RETURN count(i) as invalidInvoiceCount
    `);
    
    if (invalidJobs[0].invalidJobCount === 0 && invalidInvoices[0].invalidInvoiceCount === 0) {
      console.log('✅ No invalid dates found');
    } else {
      console.log(`❌ Found ${invalidJobs[0].invalidJobCount} jobs and ${invalidInvoices[0].invalidInvoiceCount} invoices with invalid dates`);
    }

    // Test 4: Sample calculation test
    console.log('\n🧮 Testing sample calculations:');
    const sampleInvoice = await neo4jService.runQuery(`
      MATCH (i:Invoice)
      OPTIONAL MATCH (i)<-[:PART_OF]-(il:InvoiceLine)
      RETURN i.id, i.invoiceNumber, collect(il.lineAmount) as lineAmounts
      LIMIT 1
    `);
    
    if (sampleInvoice.length > 0) {
      const invoice = sampleInvoice[0];
      const subtotal = invoice.lineAmounts.reduce((sum: number, amount: number) => sum + (amount || 0), 0);
      const hst = subtotal * 0.13; // 13% HST
      const total = subtotal + hst;
      
      console.log(`Invoice ${invoice.invoiceNumber}:`);
      console.log(`  Line amounts: [${invoice.lineAmounts.join(', ')}]`);
      console.log(`  Calculated subtotal: ${subtotal}`);
      console.log(`  Calculated HST (13%): ${hst.toFixed(2)}`);
      console.log(`  Calculated total: ${total.toFixed(2)}`);
    }

    // Test 5: Check node counts (without APOC)
    console.log('\n📊 Node counts:');
    const jobCount = await neo4jService.runQuery(`MATCH (j:Job) RETURN count(j) as count`);
    const invoiceCount = await neo4jService.runQuery(`MATCH (i:Invoice) RETURN count(i) as count`);
    const invoiceLineCount = await neo4jService.runQuery(`MATCH (il:InvoiceLine) RETURN count(il) as count`);
    const jobTypeCount = await neo4jService.runQuery(`MATCH (jt:JobType) RETURN count(jt) as count`);
    const companyCount = await neo4jService.runQuery(`MATCH (c:Company) RETURN count(c) as count`);
    const driverCount = await neo4jService.runQuery(`MATCH (d:Driver) RETURN count(d) as count`);
    const dispatcherCount = await neo4jService.runQuery(`MATCH (d:Dispatcher) RETURN count(d) as count`);
    const unitCount = await neo4jService.runQuery(`MATCH (u:Unit) RETURN count(u) as count`);
    
    console.log(`  Jobs: ${jobCount[0].count}`);
    console.log(`  Invoices: ${invoiceCount[0].count}`);
    console.log(`  InvoiceLines: ${invoiceLineCount[0].count}`);
    console.log(`  JobTypes: ${jobTypeCount[0].count}`);
    console.log(`  Companies: ${companyCount[0].count}`);
    console.log(`  Drivers: ${driverCount[0].count}`);
    console.log(`  Dispatchers: ${dispatcherCount[0].count}`);
    console.log(`  Units: ${unitCount[0].count}`);

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await neo4jService.close();
  }
}

testGraphQLData();
