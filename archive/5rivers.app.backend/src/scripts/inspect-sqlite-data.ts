import sqlite3 from 'sqlite3';
import path from 'path';

const SQLITE_DB_PATH = path.join(__dirname, '../../../5rivers.app.backend.sqlite/src/db/5rivers.db');

class SQLiteDataInspector {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(SQLITE_DB_PATH);
  }

  private async runQuery<T>(query: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  private async getRowCount(table: string): Promise<number> {
    try {
      const result = await this.runQuery<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`);
      return result[0]?.count || 0;
    } catch (error) {
      console.error(`Error counting ${table}:`, error);
      return 0;
    }
  }

  async inspectAllTables() {
    console.log('📊 SQLite Database Analysis');
    console.log(`📁 Database: ${SQLITE_DB_PATH}\n`);

    const tables = [
      'Company', 'Driver', 'Dispatcher', 'Unit',
      'JobType', 'DriverRate', 'Job', 'Invoice', 'InvoiceLine', 'User'
    ];

    for (const table of tables) {
      const count = await this.getRowCount(table);
      console.log(`📋 ${table}: ${count} records`);
      
      if (count > 0 && count <= 5) {
        // Show sample data for small tables
        try {
          const sampleData = await this.runQuery(`SELECT * FROM ${table} LIMIT 3`);
          if (sampleData.length > 0) {
            console.log('   Sample data:', JSON.stringify(sampleData[0], null, 2));
          }
        } catch (error) {
          console.log('   (Could not fetch sample data)');
        }
      }
      console.log('');
    }

    // Check foreign key relationships
    console.log('🔗 Relationship Analysis:');
    
    try {
      const jobsWithRelations = await this.runQuery(`
        SELECT 
          j.jobId,
          j.jobDate,
          j.jobGrossAmount,
          jt.title as jobType,
          c.name as company,
          d.name as driver,
          dp.name as dispatcher,
          u.name as unit
        FROM Job j
        LEFT JOIN JobType jt ON j.jobTypeId = jt.jobTypeId
        LEFT JOIN Company c ON jt.companyId = c.companyId
        LEFT JOIN Driver d ON j.driverId = d.driverId
        LEFT JOIN Dispatcher dp ON j.dispatcherId = dp.dispatcherId
        LEFT JOIN Unit u ON j.unitId = u.unitId
        LIMIT 3
      `);
      
      if (jobsWithRelations.length > 0) {
        console.log('📝 Sample Job with relationships:');
        console.log(JSON.stringify(jobsWithRelations[0], null, 2));
      }
    } catch (error) {
      console.log('❌ Could not analyze relationships:', error);
    }

    this.db.close();
  }
}

async function inspectSQLiteData() {
  const inspector = new SQLiteDataInspector();
  await inspector.inspectAllTables();
}

if (require.main === module) {
  inspectSQLiteData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Inspection failed:', error);
      process.exit(1);
    });
}

export { inspectSQLiteData };
