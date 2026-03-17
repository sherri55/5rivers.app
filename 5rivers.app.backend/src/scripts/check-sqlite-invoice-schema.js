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
  console.log('\n📋 Schema of InvoiceLine table:');
  db.all("PRAGMA table_info(InvoiceLine)", (err, rows) => {
    if (err) {
      console.error('❌ Error getting table schema:', err.message);
      return;
    }
    
    console.log('Columns:');
    rows.forEach(row => {
      console.log(`  ${row.name} (${row.type}) ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Sample data from InvoiceLine
    console.log('\n📊 Sample data from InvoiceLine:');
    db.all("SELECT * FROM InvoiceLine LIMIT 10", (err, rows) => {
      if (err) {
        console.error('❌ Error fetching data:', err.message);
        return;
      }
      
      console.log(`Found ${rows.length} sample records:`);
      rows.forEach((row, index) => {
        console.log(`${index + 1}:`, row);
      });
      
      // Get total count
      db.get("SELECT COUNT(*) as count FROM InvoiceLine", (err, row) => {
        if (err) {
          console.error('❌ Error counting records:', err.message);
        } else {
          console.log(`\n📈 Total InvoiceLine records: ${row.count}`);
        }
        
        // Also check Invoice table structure
        console.log('\n📋 Schema of Invoice table:');
        db.all("PRAGMA table_info(Invoice)", (err, rows) => {
          if (err) {
            console.error('❌ Error getting Invoice table schema:', err.message);
          } else {
            console.log('Columns:');
            rows.forEach(row => {
              console.log(`  ${row.name} (${row.type}) ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PRIMARY KEY' : ''}`);
            });
          }
          
          db.close();
        });
      });
    });
  });
});
