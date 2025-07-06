const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = 'D:\\Dump\\5rivers.db';

console.log('🔍 Connecting to SQLite database...');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to SQLite database');
});

// First, let's see the schema of invoicejoblines table
db.serialize(() => {
  console.log('\n📋 Schema of invoicejoblines table:');
  db.all("PRAGMA table_info(invoicejoblines)", (err, rows) => {
    if (err) {
      console.error('❌ Error getting table schema:', err.message);
      return;
    }
    
    console.log('Columns:');
    rows.forEach(row => {
      console.log(`  ${row.name} (${row.type}) ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Now let's get some sample data
    console.log('\n📊 Sample data from invoicejoblines:');
    db.all("SELECT * FROM invoicejoblines LIMIT 10", (err, rows) => {
      if (err) {
        console.error('❌ Error fetching data:', err.message);
        return;
      }
      
      console.log(`Found ${rows.length} sample records:`);
      rows.forEach((row, index) => {
        console.log(`${index + 1}:`, row);
      });
      
      // Get total count
      db.get("SELECT COUNT(*) as count FROM invoicejoblines", (err, row) => {
        if (err) {
          console.error('❌ Error counting records:', err.message);
        } else {
          console.log(`\n📈 Total invoicejoblines records: ${row.count}`);
        }
        
        // Close the database
        db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err.message);
          } else {
            console.log('\n✅ Database connection closed');
          }
        });
      });
    });
  });
});
