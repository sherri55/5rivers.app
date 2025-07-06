const sqlite3 = require('sqlite3').verbose();

const dbPath = 'D:\\Dump\\5rivers.db';

console.log('🔍 Connecting to SQLite database...');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to SQLite database');
});

db.serialize(() => {
  console.log('\n📋 Available tables in database:');
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
      console.error('❌ Error getting tables:', err.message);
      return;
    }
    
    console.log('Tables:');
    rows.forEach(row => {
      console.log(`  - ${row.name}`);
    });
    
    // Look for any invoice-related tables
    const invoiceTables = rows.filter(row => row.name.toLowerCase().includes('invoice'));
    console.log('\n🧾 Invoice-related tables:');
    invoiceTables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    // Check job-related tables too
    const jobTables = rows.filter(row => row.name.toLowerCase().includes('job'));
    console.log('\n💼 Job-related tables:');
    jobTables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    db.close();
  });
});
